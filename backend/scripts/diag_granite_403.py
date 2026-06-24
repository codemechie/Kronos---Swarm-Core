"""Diagnostic: capture full 403 response and test alternative request formats."""
import json, sys, os, urllib.parse
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from backend.config.runtime import get_runtime_config

cfg = get_runtime_config()
api_key = cfg.granite_api_key
runtime_url = cfg.granite_runtime_url.rstrip("/")
space_id = cfg.granite_space_id
model_id = cfg.granite_model_id

print("=" * 65)
print("Granite Request Differential Analysis")
print("=" * 65)
print(f"Runtime URL: {runtime_url}")
print(f"Space ID:    {space_id}")
print(f"Model ID:    {model_id}")
print(f"API Key set: {bool(api_key)}")

# ── IAM token ─────────────────────────────────────────────────────
def get_token() -> str:
    body = urllib.parse.urlencode({
        "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
        "apikey": api_key,
    }).encode("utf-8")
    req = Request(
        "https://iam.cloud.ibm.com/identity/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["access_token"]

token = get_token()
print(f"\nIAM Token: {token[:30]}...")


def try_request(label: str, url: str, payload: dict) -> None:
    """Make a request and print full diagnostics."""
    print(f"\n{'-' * 65}")
    print(f"TEST: {label}")
    print(f"{'─' * 65}")
    print(f"URL:  POST {url}")
    print(f"Body: {json.dumps(payload, indent=2)}")
    body_bytes = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    print(f"Headers: Authorization: Bearer {token[:30]}...")
    print(f"         Content-Type: application/json")
    try:
        req = Request(url, data=body_bytes, headers=headers, method="POST")
        with urlopen(req, timeout=30) as resp:
            status = resp.status
            resp_body = resp.read().decode("utf-8")
            print(f"Status: {status}")
            print(f"Response: {resp_body[:500]}")
    except HTTPError as e:
        print(f"Status: {e.code} {e.reason}")
        body = e.read().decode("utf-8", errors="replace")
        print(f"Full response body:")
        print(body)
    except URLError as e:
        print(f"URLError: {e.reason}")
    except Exception as e:
        print(f"Error: {e}")


# ── Current format: /ml/v1/text/chat ──────────────────────────────
payload_chat = {
    "model_id": model_id,
    "messages": [
        {"role": "system", "content": "You are a test agent."},
        {"role": "user", "content": "Reply with exactly: GRANITE ONLINE"},
    ],
}
if space_id:
    payload_chat["space_id"] = space_id

try_request(
    "Current: /ml/v1/text/chat with space_id",
    f"{runtime_url}/ml/v1/text/chat?version=2024-05-01",
    payload_chat,
)

# ── Same endpoint, project_id instead of space_id ────────────────
payload_chat_project = {
    "model_id": model_id,
    "messages": [
        {"role": "system", "content": "You are a test agent."},
        {"role": "user", "content": "Reply with exactly: GRANITE ONLINE"},
    ],
    "project_id": space_id,
}

try_request(
    "Alternative: /ml/v1/text/chat with project_id",
    f"{runtime_url}/ml/v1/text/chat?version=2024-05-01",
    payload_chat_project,
)

# ── /ml/v1/text/generation with input format ────────────────────
payload_gen = {
    "model_id": model_id,
    "input": "Reply with exactly: GRANITE ONLINE",
    "parameters": {
        "decoding_method": "greedy",
        "max_new_tokens": 50,
    },
}
if space_id:
    payload_gen["space_id"] = space_id

try_request(
    "Alternative: /ml/v1/text/generation with space_id",
    f"{runtime_url}/ml/v1/text/generation?version=2024-05-01",
    payload_gen,
)

# ── /ml/v1/text/generation with project_id ──────────────────────
payload_gen_project = {
    "model_id": model_id,
    "input": "Reply with exactly: GRANITE ONLINE",
    "parameters": {
        "decoding_method": "greedy",
        "max_new_tokens": 50,
    },
    "project_id": space_id,
}

try_request(
    "Alternative: /ml/v1/text/generation with project_id",
    f"{runtime_url}/ml/v1/text/generation?version=2024-05-01",
    payload_gen_project,
)

# ── /ml/v2/text/chat (newer API version) ──────────────────────────
payload_v2 = {
    "model_id": model_id,
    "messages": [
        {"role": "system", "content": "You are a test agent."},
        {"role": "user", "content": "Reply with exactly: GRANITE ONLINE"},
    ],
}
if space_id:
    payload_v2["project_id"] = space_id

try_request(
    "Alternative: /ml/v2/text/chat with project_id",
    f"{runtime_url}/ml/v2/text/chat?version=2024-05-01",
    payload_v2,
)

print(f"\n{'=' * 65}")
print("Diagnostic complete.")
