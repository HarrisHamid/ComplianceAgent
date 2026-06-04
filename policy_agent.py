import anthropic
import json
from frameworks import FRAMEWORKS  # import the registry, not a specific checklist


def check_requirement(client: anthropic.Anthropic, policy_text: str, requirement: dict, framework: str) -> dict:
    """
    Checks ONE requirement against the policy text.
    Now framework-agnostic — works for GDPR, HIPAA, or SOC 2.
    The only thing that changes per framework is the prompt wording
    and the checklist items passed in. The logic is identical.
    """

    prompt = f"""You are a {framework} compliance auditor reviewing a policy document.

{framework} Requirement to check:
ID: {requirement['id']}
Requirement: {requirement['requirement']}
What to look for: {requirement['example']}
Keywords that might indicate compliance: {', '.join(requirement['keywords'])}

Policy Document Text:
---
{policy_text}
---

Does this policy document satisfy the requirement above?

ONLY output a JSON object with exactly these fields:
{{
  "satisfied": true or false,
  "evidence": "the exact sentence from the policy that satisfies this (or null if not found)",
  "explanation": "one sentence explaining your finding",
  "severity": "low" if satisfied, "medium" if partially addressed, "high" if completely missing
}}

Output ONLY the JSON. No other text."""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        system=(
            f"You are a precise {framework} compliance auditor. "
            "You output only valid JSON. No markdown, no explanation, just JSON."
        ),
        messages=[{"role": "user", "content": prompt}]
    )

    raw_text = response.content[0].text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split('\n', 1)[1]
        raw_text = raw_text.rsplit('```', 1)[0]

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        result = {
            "satisfied": False,
            "evidence": None,
            "explanation": f"Could not parse response: {raw_text[:100]}",
            "severity": "medium"
        }

    result["id"] = requirement["id"]
    result["requirement"] = requirement["requirement"]
    return result


def run_policy_audit(policy_text: str, framework: str) -> dict:
    """
    Runs a full compliance audit for the given framework.
    framework must be one of: "GDPR", "HIPAA", "SOC2"

    The only change from before: we look up the right checklist
    from the FRAMEWORKS registry using the framework string.
    Everything else is identical.
    """

    # Look up the checklist — this replaces the old hardcoded GDPR import
    # If someone passes an invalid framework, we raise a clear error immediately
    if framework not in FRAMEWORKS:
        raise ValueError(f"Unknown framework '{framework}'. Choose from: {list(FRAMEWORKS.keys())}")

    checklist = FRAMEWORKS[framework]  # e.g. FRAMEWORKS["HIPAA"] → HIPAA_CHECKLIST

    client = anthropic.Anthropic()

    print(f"Starting {framework} audit — checking {len(checklist)} requirements...\n")

    findings = []

    for i, requirement in enumerate(checklist):
        print(f"Checking {i+1}/{len(checklist)}: {requirement['requirement']}...")

        # Pass framework into check_requirement so the prompt says
        # "You are a HIPAA auditor" instead of always "GDPR auditor"
        finding = check_requirement(client, policy_text, requirement, framework)
        findings.append(finding)

        status = "✅ PASS" if finding["satisfied"] else f"❌ FAIL [{finding['severity'].upper()}]"
        print(f"  → {status}: {finding['explanation']}\n")

    passed = sum(1 for f in findings if f["satisfied"])
    failed = len(findings) - passed
    severity_order = {"high": 0, "medium": 1, "low": 2}
    violations = sorted(
        [f for f in findings if not f["satisfied"]],
        key=lambda x: severity_order.get(x["severity"], 3)
    )

    return {
        "framework": framework,
        "total_checked": len(findings),
        "passed": passed,
        "failed": failed,
        "compliance_score": round((passed / len(findings)) * 100),
        "findings": findings,
        "violations": violations
    }