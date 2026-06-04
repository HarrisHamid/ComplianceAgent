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
    MAX_CHARS = 40000
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


