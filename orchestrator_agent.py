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

    prompt = f"""You are a compliance expert. Your job is to decide which frameworks this SPECIFIC DOCUMENT can be meaningfully audited against.

This is NOT about what certifications the company might need. It is purely about whether the document itself contains enough content to assess compliance with each framework's requirements.

Available frameworks:
{framework_list}

Document (first 8,000 characters):
---
{policy_text[:8000]}
---

For each framework ask: "Does this document contain content that lets me evaluate compliance with this framework's requirements?"

Signals:
- GDPR: Select if the document describes how personal data is collected, used, stored, or shared, and describes individual rights. Privacy policies almost always qualify.
- SOC2: Select ONLY if the document describes internal security controls, access management, incident response, uptime commitments, or audit logging. A privacy policy alone does NOT qualify.
- HIPAA: Select ONLY if the document explicitly describes handling of patient health records or Protected Health Information (PHI). General privacy policies do NOT qualify unless health data is specifically mentioned.
- ISO27001: Select ONLY if the document describes an ISMS, risk assessment processes, or formal security governance structure. A privacy policy alone does NOT qualify.

Respond with ONLY a JSON object, no other text:
{{
  "selected_frameworks": ["GDPR"],
  "overall_reasoning": "one sentence describing what type of document this is and which frameworks its content can actually be audited against",
  "per_framework": {{
{per_fw_template}
  }}
}}

Rules:
- selected_frameworks must only list frameworks where applies is true
- Only select a framework if the document contains auditable content for it
- The company's industry or size does NOT matter — only what the document itself contains"""

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

    # If the model returned nothing at all (shouldn't happen), default to GDPR only
    if not result["selected_frameworks"]:
        result["selected_frameworks"] = ["GDPR"]

    return result
