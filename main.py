# main.py — the entry point for the whole system
# This is the only file you run at the hackathon: python3 main.py
#
# It wires together all four pieces in order:
#   1. crawler.py    → fetch the page text
#   2. policy_agent.py → check it against GDPR
#   3. db.py         → save the results
#   4. report.py     → print the findings
#
# Think of this as the "orchestrator" — it doesn't do any work itself,
# it just coordinates the other agents in the right sequence.

import sys
from dotenv import load_dotenv
load_dotenv()

from crawler import crawl
from policy_agent import run_policy_audit
from db import init_db, save_audit
from report import generate_report


def run_audit(url: str, framework: str = "GDPR"):
    """
    Full end-to-end audit pipeline.
    This is the function you'll call during the demo.
    """

    print(f"\n{'='*60}")
    print(f"  ComplianceAgent — Starting Audit")
    print(f"  URL: {url}")
    print(f"  Framework: {framework}")
    print(f"{'='*60}\n")

    # --- STEP 1: CRAWL ---
    print("📡 Step 1/4: Crawling URL...")
    crawl_result = crawl(url)

    # Check if the crawl worked before going further
    if not crawl_result["success"]:
        print(f"❌ Crawl failed: {crawl_result['error']}")
        print("   Try a different URL or check your internet connection.")
        return None

    print(f"   ✅ Got {crawl_result['char_count']} characters of text")
    if crawl_result["was_truncated"]:
        print(f"   ⚠️  Text was truncated to 8,000 chars (original was longer)")

    # --- STEP 2: POLICY AUDIT ---
    print(f"\n🤖 Step 2/4: Running AI policy audit ({framework})...")
    audit_result = run_policy_audit(crawl_result["text"])

    # --- STEP 3: SAVE TO DATABASE ---
    print(f"\n💾 Step 3/4: Saving results to database...")
    audit_id = save_audit(url, framework, audit_result)

    # --- STEP 4: GENERATE REPORT ---
    print(f"\n📋 Step 4/4: Generating report...\n")
    report = generate_report(url, framework, audit_result)
    print(report)

    print(f"\n✅ Audit complete. Saved as audit #{audit_id} in compliance_audits.db")
    return audit_result


# When you run: python3 main.py
# It checks if a URL was passed as a command line argument
# Example: python3 main.py https://notion.so/privacy
#
# If no argument: prompts you to type one
if __name__ == "__main__":

    # sys.argv is a list of command line arguments
    # sys.argv[0] is always the script name ("main.py")
    # sys.argv[1] would be the first argument you pass
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        # input() pauses and waits for the user to type something
        url = input("Enter URL to audit (e.g. https://notion.so/privacy): ").strip()

    # Initialize the database (creates tables if they don't exist)
    init_db()

    # Run the full audit
    run_audit(url, framework="GDPR")