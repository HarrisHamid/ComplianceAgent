import sys
from dotenv import load_dotenv
load_dotenv()

from crawler import crawl
from policy_agent import run_policy_audit
from db import init_db, save_audit
from report import generate_report
from frameworks import FRAMEWORKS, FRAMEWORK_DESCRIPTIONS


def select_framework() -> list:
    """
    Displays a numbered menu and returns a list of chosen framework strings.
    Returns a single-item list for a specific framework, or all three for "All".
    """

    print("\nSelect a compliance framework to audit against:\n")

    framework_names = list(FRAMEWORKS.keys())

    for i, name in enumerate(framework_names, start=1):
        description = FRAMEWORK_DESCRIPTIONS[name]
        checklist_length = len(FRAMEWORKS[name])
        print(f"  [{i}] {name} ({checklist_length} requirements)")
        print(f"      {description}\n")

    all_index = len(framework_names) + 1
    print(f"  [{all_index}] All frameworks (runs GDPR + HIPAA + SOC2)\n")

    while True:
        choice = input(f"Enter 1–{all_index}: ").strip()

        if choice.isdigit():
            n = int(choice)
            if 1 <= n <= len(framework_names):
                selected = framework_names[n - 1]
                print(f"\n✅ Selected: {selected}\n")
                return [selected]
            elif n == all_index:
                print(f"\n✅ Selected: All frameworks\n")
                return framework_names

        print(f"  Invalid choice. Please enter a number between 1 and {all_index}.")


def run_audit(url: str, framework: str):
    """Full end-to-end audit pipeline — same as before, now with framework param."""

    print(f"\n{'='*60}")
    print(f"  ComplianceAgent — Starting Audit")
    print(f"  URL:       {url}")
    print(f"  Framework: {framework}")
    print(f"{'='*60}\n")

    print("📡 Step 1/4: Crawling URL...")
    crawl_result = crawl(url)

    if not crawl_result["success"]:
        print(f"❌ Crawl failed: {crawl_result['error']}")
        return None

    print(f"   ✅ Got {crawl_result['char_count']} characters of text")
    if crawl_result["was_truncated"]:
        print(f"   ⚠️  Text was truncated to 8,000 chars")

    print(f"\n🤖 Step 2/4: Running AI {framework} audit...")
    audit_result = run_policy_audit(crawl_result["text"], framework)  # pass framework through

    print(f"\n💾 Step 3/4: Saving results to database...")
    audit_id = save_audit(url, framework, audit_result)

    print(f"\n📋 Step 4/4: Generating report...\n")
    report = generate_report(url, framework, audit_result)
    print(report)

    print(f"\n✅ Audit complete. Saved as audit #{audit_id}")
    return audit_result


if __name__ == "__main__":
    init_db()

    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("\nEnter URL to audit (e.g. https://notion.so/privacy): ").strip()

    selected_frameworks = select_framework()

    for framework in selected_frameworks:
        run_audit(url, framework)