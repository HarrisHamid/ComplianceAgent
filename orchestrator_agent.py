import anthropic
import json
from frameworks import FRAMEWORKS, FRAMEWORK_DESCRIPTIONS


def detect_frameworks(policy_text: str) -> dict:
    """
    Reads the crawled policy text and decides which compliance frameworks apply.
    Uses the first 8k chars — enough to identify the company type and jurisdiction.
    Returns selected frameworks with per-framework reasoning.
    """

    framework_list = "\n".join(
        f"- {name}: {desc}" for name, desc in FRAMEWORK_DESCRIPTIONS.items()
    )

    per_fw_template = ",\n".join(
        f'    "{key}": {{"applies": true, "reason": "one sentence"}}'
        for key in FRAMEWORKS
    )

    prompt = f"""You are a compliance expert analyzing a document to determine which regulatory frameworks are relevant.

Available frameworks:
{framework_list}

Document (first 8,000 characters):
---
{policy_text[:8000]}
---

Determine which frameworks apply. Use these signals:
- GDPR: Company serves EU residents, mentions GDPR, or processes personal data of EU subjects
- SOC2: SaaS or cloud company that stores customer data and needs enterprise security certification
- HIPAA: Handles patient health data, medical records, or Protected Health Information (PHI)
- ISO27001: Mentions ISO 27001 certification, ISMS, formal security management, or is a B2B enterprise vendor

Respond with ONLY a JSON object, no other text:
{{
  "selected_frameworks": ["GDPR", "SOC2"],
  "overall_reasoning": "one sentence describing this document and why those frameworks apply",
  "per_framework": {{
{per_fw_template}
  }}
}}

Rules:
- selected_frameworks must only list frameworks where applies is true
- Err on the side of inclusion when ambiguous
- If nothing is clear, return all frameworks as a fallback"""

    client = anthropic.Anthropic()

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        system="You are a compliance expert. Output only valid JSON. No markdown fences, no preamble.",
        messages=[{"role": "user", "content": prompt}]
    )

    raw_text = response.content[0].text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
        raw_text = raw_text.rsplit("```", 1)[0]

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        result = {
            "selected_frameworks": list(FRAMEWORKS.keys()),
            "overall_reasoning": "Could not parse orchestrator response — defaulting to all frameworks.",
            "per_framework": {
                name: {"applies": True, "reason": "Defaulted due to parse error"}
                for name in FRAMEWORKS
            },
        }

    # Sanitise: only keep frameworks we actually support
    result["selected_frameworks"] = [
        f for f in result.get("selected_frameworks", []) if f in FRAMEWORKS
    ]

    # If the model returned an empty list, run everything
    if not result["selected_frameworks"]:
        result["selected_frameworks"] = list(FRAMEWORKS.keys())

    return result
