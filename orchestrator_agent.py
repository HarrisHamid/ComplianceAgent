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

    prompt = f"""You are a compliance expert analyzing a policy document to determine which regulatory frameworks are relevant.

Available frameworks:
{framework_list}

Policy Document:
---
{policy_text[:8000]}
---

Analyze this document and determine which frameworks apply based on:
- GDPR: Does the company serve EU residents or explicitly reference GDPR?
- HIPAA: Does the company handle health/medical data or Protected Health Information (PHI)?
- SOC2: Is this a SaaS or cloud technology company that stores customer data?

Respond with ONLY a JSON object, no other text:
{{
  "selected_frameworks": ["GDPR", "SOC2"],
  "overall_reasoning": "one sentence describing what kind of company this is and why those frameworks apply",
  "per_framework": {{
    "GDPR":  {{"applies": true,  "reason": "one sentence"}},
    "HIPAA": {{"applies": false, "reason": "one sentence"}},
    "SOC2":  {{"applies": true,  "reason": "one sentence"}}
  }}
}}

Rules:
- selected_frameworks must only contain frameworks where applies is true
- If genuinely ambiguous, include the framework (err on the side of coverage)
- If none apply, return all three as a safe fallback"""

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
