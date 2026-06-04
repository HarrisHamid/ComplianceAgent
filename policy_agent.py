import anthropic
import json
import os

# We import the checklist we already built in crawler.py
# This is why we structured it as a list of dicts — easy to reuse
from crawler import GDPR_ARTICLE_13_CHECKLIST


def check_requirement(client: anthropic.Anthropic, policy_text: str, requirement: dict) -> dict:
    """
    Checks ONE GDPR requirement against the policy text.
    Called once per item in the checklist — so 10 times total per audit.

    Why one call per requirement instead of checking all 10 at once?
    Because Claude is much more accurate when focused on ONE thing.
    Asking "check all 10 requirements" in one prompt leads to vague,
    mixed-up answers. One question = one precise answer.

    Args:
        client      : the Anthropic client (created once, reused 10 times)
        policy_text : the cleaned text from crawl()
        requirement : one item from GDPR_ARTICLE_13_CHECKLIST

    Returns a dict like:
        {
            "id": "A13-5",
            "requirement": "Data retention period",
            "satisfied": True,
            "evidence": "We retain your data for 7 years...",
            "severity": "low"
        }
    """

    # --- THE PROMPT ---
    # This is the most important part of any LLM-powered agent.
    # The prompt is the "code" that controls Claude's behavior.
    #
    # We use triple-quoted f-strings (f"""...""") to inject variables.
    # The {requirement['requirement']} and {policy_text} slots get filled in
    # each time this function is called.
    #
    # We ask for JSON output so we can parse it programmatically.
    # "ONLY output JSON" is critical — without it, Claude adds
    # conversational text like "Sure! Here's the analysis:" which
    # breaks json.loads().

    prompt = f"""You are a GDPR compliance auditor reviewing a privacy policy.

GDPR Requirement to check:
ID: {requirement['id']}
Requirement: {requirement['requirement']}
What to look for: {requirement['example']}
Keywords that might indicate compliance: {', '.join(requirement['keywords'])}

Privacy Policy Text:
---
{policy_text}
---

Does this privacy policy satisfy the requirement above?

ONLY output a JSON object with exactly these fields:
{{
  "satisfied": true or false,
  "evidence": "the exact sentence from the policy that satisfies this (or null if not found)",
  "explanation": "one sentence explaining your finding",
  "severity": "low" if satisfied, "medium" if partially addressed, "high" if completely missing
}}

Output ONLY the JSON. No other text."""

    # --- THE API CALL ---
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",   # Haiku is fast and cheap — ~$0.0001 per call
        max_tokens=300,              # 300 tokens is plenty for a short JSON response
        system=(
            # The system prompt sets Claude's "persona" for the whole conversation.
            # This is separate from the user message above.
            # Think of it as: system = who Claude is, messages = what you're asking.
            "You are a precise GDPR compliance auditor. "
            "You output only valid JSON. No markdown, no explanation, just JSON."
        ),
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    # --- PARSE THE RESPONSE ---
    raw_text = response.content[0].text  # The actual string Claude returned

    # Claude might wrap JSON in markdown code fences like ```json ... ```
    # even when we tell it not to. This strips those fences defensively.
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        # Remove the opening ```json or ``` line
        raw_text = raw_text.split('\n', 1)[1]
        # Remove the closing ``` line
        raw_text = raw_text.rsplit('```', 1)[0]

    # json.loads() converts the JSON string into a Python dict
    # We wrap it in try/except because if Claude misbehaves and returns
    # non-JSON, we don't want the whole audit to crash
    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        # Fallback: if parsing fails, create a safe default result
        result = {
            "satisfied": False,
            "evidence": None,
            "explanation": f"Could not parse response: {raw_text[:100]}",
            "severity": "medium"
        }

    # Add the requirement metadata to the result so we know what was checked
    result["id"] = requirement["id"]
    result["requirement"] = requirement["requirement"]

    return result


def run_policy_audit(policy_text: str) -> dict:
    """
    Runs the full GDPR audit — checks all 10 requirements.
    This is the function your orchestrator will call.

    Returns a structured audit result with all findings.
    """

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise EnvironmentError(
            "ANTHROPIC_API_KEY is not set. Export it before running:\n"
            "  export ANTHROPIC_API_KEY=sk-ant-..."
        )

    # Create the Anthropic client ONCE and reuse it for all 10 calls.
    # Creating a new client each time wastes time on connection setup.
    # The client reads ANTHROPIC_API_KEY from your environment automatically.
    client = anthropic.Anthropic()

    print(f"Starting GDPR audit — checking {len(GDPR_ARTICLE_13_CHECKLIST)} requirements...\n")

    findings = []  # We'll collect all 10 results here

    for i, requirement in enumerate(GDPR_ARTICLE_13_CHECKLIST):
        # enumerate() gives us both the index (i) and the item
        # so we can show progress like "Checking 1/10..."
        print(f"Checking {i+1}/{len(GDPR_ARTICLE_13_CHECKLIST)}: {requirement['requirement']}...")

        finding = check_requirement(client, policy_text, requirement)
        findings.append(finding)

        # Print a quick one-line result so you can watch it work in real time
        status = "✅ PASS" if finding["satisfied"] else f"❌ FAIL [{finding['severity'].upper()}]"
        print(f"  → {status}: {finding['explanation']}\n")

    # --- SUMMARIZE THE RESULTS ---
    passed = sum(1 for f in findings if f["satisfied"])
    failed = len(findings) - passed

    # Filter to just the failures, sorted by severity
    # This gives the report agent a prioritized list to work from
    severity_order = {"high": 0, "medium": 1, "low": 2}
    violations = sorted(
        [f for f in findings if not f["satisfied"]],
        key=lambda x: severity_order.get(x["severity"], 3)
    )

    return {
        "total_checked": len(findings),
        "passed": passed,
        "failed": failed,
        "compliance_score": round((passed / len(findings)) * 100),  # e.g. 70
        "findings": findings,       # all 10 results
        "violations": violations    # just the failures, sorted by severity
    }


# --- TEST WITH SIMULATED DATA ---
# This runs when you execute the file directly: python3 policy_agent.py
# It won't run when another file imports this module.
if __name__ == "__main__":

    # Simulated privacy policy — intentionally missing some GDPR requirements
    # so we can see both passes and failures in the output
    test_policy = """
    Privacy Policy — Acme Corp

    Who we are: Acme Corporation, 123 Main St, New York, NY. 
    Contact us at privacy@acme.com.

    What data we collect: We collect your name, email, and payment information
    when you create an account. We also collect device information and IP address.

    Legal basis: We process your data under Article 6(1)(b) GDPR — necessary
    for the performance of a contract with you.

    Third parties: We share your data with payment processors (Stripe) and
    analytics providers (Google Analytics). We do not sell your data.

    Data retention: We keep your account data for 3 years after account closure.
    Payment records are kept for 7 years to comply with tax regulations.

    Your rights: You have the right to access your personal data at any time.
    You can request correction of inaccurate data. You may request deletion
    of your data by emailing privacy@acme.com.

    Security: We use industry-standard encryption to protect your data.
    """
    # INTENTIONALLY MISSING:
    # - DPO contact details (A13-2)
    # - Right to withdraw consent (A13-9)
    # - Right to lodge complaint with supervisory authority (A13-10)

    audit_result = run_policy_audit(test_policy)

    print("=" * 50)
    print(f"AUDIT COMPLETE")
    print(f"Compliance score: {audit_result['compliance_score']}%")
    print(f"Passed: {audit_result['passed']}/{audit_result['total_checked']}")
    print(f"\nViolations found ({len(audit_result['violations'])}):")
    for v in audit_result['violations']:
        print(f"  [{v['severity'].upper()}] {v['id']}: {v['requirement']}")