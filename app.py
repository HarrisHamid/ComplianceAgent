import os
import json
import queue
import threading
import uuid
from datetime import datetime, timezone
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
from dotenv import load_dotenv
from parser import extract_text
from analyzer import analyze_document
from orchestrator_agent import detect_frameworks
from db import init_db, save_audit

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB

init_db()

_jobs: dict = {}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/detect', methods=['POST'])
def detect():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    try:
        parsed = extract_text(file)
        result = detect_frameworks(parsed['text'])
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    if not os.environ.get('ANTHROPIC_API_KEY'):
        return jsonify({'error': 'ANTHROPIC_API_KEY not configured on server'}), 500

    try:
        parsed = extract_text(file)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    job_id = uuid.uuid4().hex[:10]
    q = queue.Queue()
    _jobs[job_id] = q

    def run():
        try:
            # Phase 0: CRAWLING (parsing already done, just emit logs)
            q.put({'type': 'phase_change', 'phase': 0, 'phase_label': 'CRAWLING'})
            q.put({'type': 'log', 'agent': 'crawler', 'message': f'→ Parsing {parsed["filename"]}...', 'color': 'blue'})
            q.put({'type': 'log', 'agent': 'crawler', 'message': f'→ Extracted {len(parsed["text"]):,} characters', 'color': 'blue'})
            truncated = parsed.get('was_truncated', False)
            if truncated:
                q.put({'type': 'log', 'agent': 'crawler', 'message': '→ Document exceeds chunk limit — chunking enabled', 'color': 'blue'})
            q.put({'type': 'log', 'agent': 'crawler', 'message': '✓ Document ready for analysis', 'color': 'blue'})

            # Phase 1: ORCHESTRATING
            q.put({'type': 'phase_change', 'phase': 1, 'phase_label': 'ORCHESTRATING'})
            q.put({'type': 'log', 'agent': 'orchestrator', 'message': '→ Detecting applicable compliance frameworks...', 'color': 'violet'})
            detection = detect_frameworks(parsed['text'])
            framework_keys = detection['selected_frameworks']
            q.put({'type': 'log', 'agent': 'orchestrator', 'message': f'→ Selected: {", ".join(k.upper() for k in framework_keys)}', 'color': 'violet'})
            q.put({'type': 'log', 'agent': 'orchestrator', 'message': f'✓ Dispatching {len(framework_keys)} specialist agent(s)...', 'color': 'violet'})

            # Phase 2: AUDITING
            q.put({'type': 'phase_change', 'phase': 2, 'phase_label': 'AUDITING'})

            def on_progress(event):
                fw = event.get('framework', '')
                chunk = event.get('chunk', 1)
                total = event.get('total', 1)
                q.put({
                    'type': 'log',
                    'agent': f'{fw}_agent',
                    'message': f'→ {fw.upper()} — analyzing chunk {chunk}/{total}...',
                    'color': 'emerald',
                })

            results = analyze_document(
                parsed['text'], framework_keys, parsed['filename'],
                progress_callback=on_progress,
            )
            results['orchestrator'] = detection

            # Phase 3: REPORTING
            q.put({'type': 'phase_change', 'phase': 3, 'phase_label': 'REPORTING'})
            q.put({'type': 'log', 'agent': 'reporter', 'message': '→ Compiling violations...', 'color': 'muted'})

            all_violations = _to_violations(results)
            audit_id = save_audit(parsed['filename'], framework_keys, results)
            report = _to_report(results, parsed, audit_id, all_violations)

            for v in all_violations:
                q.put({'type': 'finding', 'finding': v})

            total_passed = sum(fw.get('passed', 0) for fw in results['frameworks'].values())
            q.put({'type': 'metrics', 'metrics': {
                'violations': len(all_violations),
                'checks_passed': total_passed,
                'risk_score': report['risk_score'],
            }})

            q.put({'type': 'log', 'agent': 'reporter', 'message': f'✓ Report generated — {len(all_violations)} violations, score {report["compliance_score"]}', 'color': 'muted'})
            q.put({'type': 'done', 'report': report})

        except Exception as e:
            q.put({'type': 'error', 'error': str(e)})

    threading.Thread(target=run, daemon=True).start()
    return jsonify({'job_id': job_id})


@app.route('/stream/<job_id>')
def stream(job_id):
    q = _jobs.get(job_id)
    if not q:
        return jsonify({'error': 'Job not found'}), 404

    @stream_with_context
    def generate():
        while True:
            event = q.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event['type'] in ('done', 'error'):
                _jobs.pop(job_id, None)
                break

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


def _to_violations(results: dict) -> list:
    out = []
    for fw_key, fw_result in results.get('frameworks', {}).items():
        for f in fw_result.get('findings', []):
            if f.get('status') == 'satisfied':
                continue
            out.append({
                'id': f.get('id', ''),
                'severity': f.get('severity', 'medium'),
                'requirement': f.get('name', ''),
                'article': f.get('article', ''),
                'category': f.get('category', fw_key.upper()),
                'finding': f.get('explanation', ''),
                'suggested_fix': f.get('suggested_fix', ''),
            })
    return out


def _to_report(results: dict, parsed: dict, audit_id: str, violations: list) -> dict:
    frameworks = results.get('frameworks', {})
    total_checks = sum(fw.get('total', 0) for fw in frameworks.values())
    passed = sum(fw.get('passed', 0) for fw in frameworks.values())
    score = round((passed / total_checks) * 100) if total_checks else 0
    risk = min(99, max(1, 100 - score))
    fw_keys = list(frameworks.keys())
    filename = parsed.get('filename', 'document')
    now = datetime.now(timezone.utc).isoformat()
    return {
        'scan_id': audit_id,
        'url': filename,
        'company_name': filename.rsplit('.', 1)[0],
        'framework': ', '.join(k.upper() for k in fw_keys),
        'compliance_score': score,
        'risk_score': risk,
        'violations_found': len(violations),
        'checks_passed': passed,
        'pages_crawled': results.get('chunk_count', 1),
        'created_at': now,
        'completed_at': now,
        'violations': violations,
        'frameworks_detected': [k.upper() for k in fw_keys],
    }


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, port=port)
