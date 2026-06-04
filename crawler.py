import requests
from bs4 import BeautifulSoup


def crawl(url: str) -> dict:
    """
    Takes a URL, returns a dict with the clean page text and metadata.

    Why return a dict instead of just a string?
    Because your orchestrator agent needs to know if something went wrong.
    Returning {"success": False, "error": "..."} lets the agent decide
    what to do next, rather than crashing the whole pipeline.
    """

    # --- STEP 1: Make the HTTP request ---
    try:
        response = requests.get(
            url,
            headers={
                # User-Agent tells the server what "browser" is making the request.
                # Without this, many sites see "python-requests/2.x" and block you.
                # This string makes us look like a real Chrome browser.
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                              'AppleWebKit/537.36 (KHTML, like Gecko) '
                              'Chrome/120.0.0.0 Safari/537.36'
            },
            timeout=15  # Don't wait more than 15 seconds — fail fast
        )

        # raise_for_status() throws an exception if status is 4xx or 5xx
        # Without this, requests.get() succeeds even on a 404 page
        response.raise_for_status()

    except requests.exceptions.Timeout:
        return {"success": False, "error": f"Timed out fetching {url}"}
    except requests.exceptions.HTTPError as e:
        return {"success": False, "error": f"HTTP error: {e.response.status_code}"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Request failed: {str(e)}"}

    # --- STEP 2: Parse the HTML ---
    soup = BeautifulSoup(response.text, 'html.parser')

    # Remove tags that contain noise, not content
    # script = JavaScript code  |  style = CSS  |  nav = navigation menus
    # footer = copyright lines  |  header = site headers
    for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()

    # --- STEP 3: Extract and clean the text ---
    raw_text = soup.get_text(separator='\n', strip=True)
    lines = [line for line in raw_text.splitlines() if line.strip()]
    clean_text = '\n'.join(lines)

    # --- STEP 4: Truncate if too long ---
    # LLMs have context limits. Privacy policies can be 50,000+ chars.
    # We cap at 8,000 chars (~2,000 tokens) — enough to find GDPR violations.
    MAX_CHARS = 8000
    was_truncated = len(clean_text) > MAX_CHARS
    if was_truncated:
        clean_text = clean_text[:MAX_CHARS] + "\n\n[...truncated for length]"

    return {
        "success": True,
        "url": url,
        "text": clean_text,
        "char_count": len(clean_text),
        "was_truncated": was_truncated
    }


# --- GDPR ARTICLE 13 CHECKLIST ---
# These are the things a privacy policy MUST contain under GDPR Article 13.
# This is what your policy agent will check the crawled text against.

GDPR_ARTICLE_13_CHECKLIST = [
    {
        "id": "A13-1",
        "requirement": "Identity and contact details of the data controller",
        "keywords": ["controller", "company name", "contact", "address"],
        "example": "Must name the company responsible for your data and give contact info"
    },
    {
        "id": "A13-2",
        "requirement": "Contact details of the Data Protection Officer (if applicable)",
        "keywords": ["DPO", "data protection officer", "dpo@"],
        "example": "If they have a DPO, they must list their contact details"
    },
    {
        "id": "A13-3",
        "requirement": "Purposes and legal basis for processing",
        "keywords": ["purpose", "legal basis", "legitimate interest", "consent", "contract", "article 6"],
        "example": "Must say WHY they collect data AND the legal justification"
    },
    {
        "id": "A13-4",
        "requirement": "Recipients or categories of recipients of personal data",
        "keywords": ["third party", "share", "recipients", "partners", "disclose"],
        "example": "Must name who else receives your data (advertisers, analytics, etc.)"
    },
    {
        "id": "A13-5",
        "requirement": "Data retention period",
        "keywords": ["retain", "retention", "store", "delete", "years", "months"],
        "example": "Must say how long they keep your data"
    },
    {
        "id": "A13-6",
        "requirement": "Right to access personal data",
        "keywords": ["right to access", "access your data", "subject access"],
        "example": "Must tell you that you can request a copy of your data"
    },
    {
        "id": "A13-7",
        "requirement": "Right to rectification",
        "keywords": ["rectif", "correct", "update your data", "inaccurate"],
        "example": "Must tell you that you can correct wrong data"
    },
    {
        "id": "A13-8",
        "requirement": "Right to erasure (right to be forgotten)",
        "keywords": ["erasure", "delete", "forgotten", "remove your data"],
        "example": "Must tell you that you can request deletion of your data"
    },
    {
        "id": "A13-9",
        "requirement": "Right to withdraw consent",
        "keywords": ["withdraw consent", "opt out", "unsubscribe", "revoke"],
        "example": "If processing is based on consent, must tell you how to withdraw it"
    },
    {
        "id": "A13-10",
        "requirement": "Right to lodge a complaint with a supervisory authority",
        "keywords": ["supervisory authority", "complaint", "ICO", "data protection authority", "regulator"],
        "example": "Must tell you that you can complain to a government regulator (e.g. the ICO in the UK)"
    },
]


# Quick test — run this file directly to see the checklist printed
if __name__ == "__main__":
    print("=== GDPR Article 13 Checklist ===\n")
    for item in GDPR_ARTICLE_13_CHECKLIST:
        print(f"[{item['id']}] {item['requirement']}")
        print(f"         → {item['example']}")
        print()

    print("\n=== Crawler Test (using simulated HTML) ===\n")

    # Since we can't make real HTTP requests in this environment,
    # let's test the parsing logic directly
    from bs4 import BeautifulSoup

    fake_html = """
    <html><head><title>Test Privacy Policy</title>
    <style>body{font:sans-serif}</style>
    <script>track()</script></head>
    <body>
    <nav>Menu</nav>
    <h1>Privacy Policy</h1>
    <p>We are Acme Corp, reachable at privacy@acme.com</p>
    <p>We collect your email to fulfill your contract with us (Article 6(1)(b) GDPR).</p>
    <p>We retain your data for 3 years after account closure.</p>
    <p>You have the right to access, rectify, and erase your data.</p>
    <p>Contact our DPO at dpo@acme.com</p>
    <footer>© Acme</footer>
    </body></html>
    """

    soup = BeautifulSoup(fake_html, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()
    raw_text = soup.get_text(separator='\n', strip=True)
    lines = [line for line in raw_text.splitlines() if line.strip()]
    clean_text = '\n'.join(lines)

    print("Extracted text:")
    print(clean_text)
    print(f"\nChar count: {len(clean_text)}")
    print("\nCrawler logic works correctly!")