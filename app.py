import os
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from parser import extract_text
from analyzer import analyze_document
from orchestrator_agent import detect_frameworks
from db import init_db, save_audit

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100 MB

init_db()


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

        # Agent 1 — Orchestrator decides which frameworks apply
        detection = detect_frameworks(parsed['text'])
        framework_keys = detection['selected_frameworks']

        # Agents 2–N — Policy agents run in sequence per framework
        results = analyze_document(parsed['text'], framework_keys, parsed['filename'])
        results['orchestrator'] = detection

        audit_id = save_audit(parsed['filename'], framework_keys, results)
        results['audit_id'] = audit_id
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, port=port)
