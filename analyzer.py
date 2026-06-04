import anthropic
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from frameworks import FRAMEWORKS

CHUNK_SIZE = 120_000
CHUNK_OVERLAP = 8_000
STATUS_RANK = {'satisfied': 2, 'partial': 1, 'missing': 0}


def analyze_document(text: str, framework_keys: list, filename: str = '', progress_callback=None) -> dict:
    if not os.environ.get('ANTHROPIC_API_KEY'):
        raise EnvironmentError('ANTHROPIC_API_KEY is not set')

    client = anthropic.Anthropic()
    chunks = _chunk(text)

    results = {
        'filename': filename,
        'char_count': len(text),
        'truncated': len(chunks) > 1,
        'chunk_count': len(chunks),
        'frameworks': {},
    }

    valid_keys = [k for k in framework_keys if k in FRAMEWORKS]

    def _run_framework(key):
        fw = FRAMEWORKS[key]
        n = len(chunks)
        print(f'Analyzing {fw["name"]} across {n} chunk(s)...')
        if n == 1:
            result = _analyze_chunk(client, chunks[0], fw)
            if progress_callback:
                progress_callback({'framework': key, 'chunk': 1, 'total': 1})
            return key, result
        chunk_findings_list = []
        for i, chunk in enumerate(chunks):
            findings = _analyze_chunk(client, chunk, fw)['findings']
            chunk_findings_list.append(findings)
            if progress_callback:
                progress_callback({'framework': key, 'chunk': i + 1, 'total': n})
        merged = _merge_findings(chunk_findings_list)
        return key, _summarize(merged, fw)

    with ThreadPoolExecutor(max_workers=len(valid_keys) or 1) as executor:
        futures = {executor.submit(_run_framework, key): key for key in valid_keys}
        for future in as_completed(futures):
            key, fw_result = future.result()
            results['frameworks'][key] = fw_result

    return results


def _chunk(text: str) -> list:
    if len(text) <= CHUNK_SIZE:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + CHUNK_SIZE])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def _merge_findings(all_chunk_findings: list) -> list:
    merged = {}
    for chunk_findings in all_chunk_findings:
        for f in chunk_findings:
            rid = f['id']
            if rid not in merged or STATUS_RANK.get(f['status'], 0) > STATUS_RANK.get(merged[rid]['status'], 0):
                merged[rid] = f
    return list(merged.values())


def _analyze_chunk(client, text: str, framework: dict) -> dict:
    req_lines = '\n'.join(
        f'- {r["id"]}: {r["name"]} — {r["description"]}'
        for r in framework['requirements']
    )

    prompt = f"""You are a senior {framework['name']} compliance auditor.
Analyze the document below and assess compliance with every listed requirement.

FRAMEWORK: {framework['name']}
{framework['description']}

REQUIREMENTS:
{req_lines}

DOCUMENT:
---
{text}
---

For EACH requirement return your findings. If a requirement is not mentioned at all, mark it "missing".

Return ONLY a valid JSON object:
{{
  "findings": [
    {{
      "id": "<id>",
      "name": "<name>",
      "status": "satisfied" | "partial" | "missing",
      "severity": "low" | "medium" | "high",
      "evidence": "<exact quote from doc or null>",
      "explanation": "<one sentence>"
    }}
  ],
  "summary": "<2-3 sentence executive summary>"
}}

Rules:
- severity must be "low" if satisfied, "medium" if partial, "high" if missing
- Output ONLY the JSON, no markdown fences, no other text."""

    response = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=4096,
        system='You are a precise compliance auditor. Output only valid JSON.',
        messages=[{'role': 'user', 'content': prompt}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith('```'):
        raw = raw.split('\n', 1)[1].rsplit('```', 1)[0]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {'findings': [], 'summary': 'Analysis parse error.'}

    return _summarize(data.get('findings', []), framework, data.get('summary', ''))


def _summarize(findings: list, framework: dict, summary: str = '') -> dict:
    passed  = sum(1 for f in findings if f['status'] == 'satisfied')
    partial = sum(1 for f in findings if f['status'] == 'partial')
    total   = len(findings)
    score   = round(((passed + partial * 0.5) / total) * 100) if total else 0

    return {
        'name':     framework['name'],
        'score':    score,
        'passed':   passed,
        'partial':  partial,
        'failed':   total - passed - partial,
        'total':    total,
        'findings': findings,
        'summary':  summary,
    }
