import sys
from dotenv import load_dotenv
load_dotenv()

from crawler import crawl
from policy_agent import run_policy_audit
from orchestrator_agent import detect_frameworks
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


def run_audit(url: str, framework: str, prefetched: dict = None):
    """Full end-to-end audit pipeline. Pass prefetched=crawl_result to skip the crawl step."""

    print(f"\n{'='*60}")
    print(f"  ComplianceAgent — Starting Audit")
    print(f"  URL:       {url}")
    print(f"  Framework: {framework}")
    print(f"{'='*60}\n")

    if prefetched:
        crawl_result = prefetched
        print(f"📡 Step 1/4: Using pre-fetched page ({crawl_result['char_count']:,} chars)")
    else:
        print("📡 Step 1/4: Crawling URL...")
        crawl_result = crawl(url)

    if not crawl_result["success"]:
        print(f"❌ Crawl failed: {crawl_result['error']}")
        return None

    if not prefetched:
        print(f"   ✅ Got {crawl_result['char_count']:,} characters of text")
    if crawl_result["was_truncated"]:
        print(f"   ⚠️  Text was truncated to {crawl_result['char_count']:,} chars")

    print(f"\n🤖 Step 2/4: Running AI {framework} audit...")
    audit_result = run_policy_audit(crawl_result["text"], framework)  # pass framework through

    print(f"\n💾 Step 3/4: Saving results to database...")
    audit_id = save_audit(url, framework, audit_result)

    print(f"\n📋 Step 4/4: Generating report...\n")
    report = generate_report(url, framework, audit_result)
    print(report)

    print(f"\n✅ Audit complete. Saved as audit #{audit_id}")
    return audit_result


def auto_select_frameworks(policy_text: str) -> list:
    """Calls the orchestrator agent to decide which frameworks apply, then prints its reasoning."""
    print("🧠 Orchestrator: Analyzing policy to determine applicable frameworks...\n")

    result = detect_frameworks(policy_text)

    print(f"  {result['overall_reasoning']}\n")

    applies_icon = {True: "✅", False: "❌"}
    for name, info in result["per_framework"].items():
        icon = applies_icon[info["applies"]]
        print(f"  {icon} {name:<6} — {info['reason']}")

    selected = result["selected_frameworks"]
    print(f"\n  → Running audits for: {', '.join(selected)}\n")
    return selected


if __name__ == "__main__":
    init_db()

    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("\nEnter URL to audit (e.g. https://notion.so/privacy): ").strip()

    print("\nHow should we select compliance frameworks?\n")
    print("  [1] Auto-detect  — let AI analyze the policy and choose")
    print("  [2] Manual       — pick frameworks yourself\n")

    while True:
        mode = input("Enter 1 or 2: ").strip()
        if mode in ("1", "2"):
            break
        print("  Please enter 1 or 2.")

    if mode == "1":
        print("\n📡 Step 1/5: Crawling URL to feed the orchestrator...")
        crawl_result = crawl(url)
        if not crawl_result["success"]:
            print(f"❌ Crawl failed: {crawl_result['error']}")
            sys.exit(1)
        print(f"   ✅ Got {crawl_result['char_count']:,} characters of text\n")
        selected_frameworks = auto_select_frameworks(crawl_result["text"])
        for framework in selected_frameworks:
            run_audit(url, framework, prefetched=crawl_result)
    else:
        selected_frameworks = select_framework()
        for framework in selected_frameworks:
            run_audit(url, framework)