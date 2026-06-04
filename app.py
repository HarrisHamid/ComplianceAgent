import os
import json
import queue
import threading
import uuid
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
            detection = detect_frameworks(parsed['text'])
            q.put({'type': 'orchestrator', 'data': detection})

            framework_keys = detection['selected_frameworks']

            def on_progress(event):
                q.put({'type': 'progress', 'data': event})

            results = analyze_document(
                parsed['text'], framework_keys, parsed['filename'],
                progress_callback=on_progress,
            )
            results['orchestrator'] = detection
            audit_id = save_audit(parsed['filename'], framework_keys, results)
            results['audit_id'] = audit_id
            q.put({'type': 'done', 'data': results})
        except Exception as e:
            q.put({'type': 'error', 'data': str(e)})

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


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, port=port)
