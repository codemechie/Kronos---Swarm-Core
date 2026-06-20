"""
BOB Smoke Test — validates a single real BOB inference request.

Usage:
    py -m backend.scripts.bob_smoke_test

Environment:
    BOB_API_KEY          (required — loaded from .env or env)
    BOB_API_URL          (optional — defaults to https://api.bob-llm.dev/v1/chat/completions)
    BOB_PROJECT_ID       (optional — sent as X-Project-Id header)
    BOB_MODEL_ID         (optional — sent in request body, default "default")
    BOB_TEAM_ID          (optional — sent as X-Team-Id header, required for General API keys)
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Ensure backend is importable
_proj = str(Path(__file__).resolve().parent.parent)
if _proj not in sys.path:
    sys.path.insert(0, _proj)

from backend.config.runtime import get_runtime_config, reset_runtime_config


def _mask(s: str | None, n: int = 8) -> str:
    if s is None:
        return "<NOT SET>"
    return s[:n] + "..." if len(s) > n else s


def main() -> int:
    reset_runtime_config()
    cfg = get_runtime_config()

    print("=" * 60)
    print("  BOB SMOKE TEST")
    print("=" * 60)
    print()

    # -- Phase 1: Print configuration -------------------------------------------
    print("[CONFIG]")
    print(f"  Endpoint : {cfg.bob_api_url}")
    print(f"  API Key  : {_mask(cfg.bob_api_key)}")
    print(f"  Project  : {_mask(cfg.bob_project_id)}")
    print(f"  Model    : {cfg.bob_model_id or 'default'}")
    print(f"  Team ID  : {_mask(os.environ.get('BOB_TEAM_ID'))}")
    print()

    # -- Phase 2: Validate credentials ------------------------------------------
    if not cfg.bob_api_key:
        print("[FAIL] BOB_API_KEY is not set.")
        print("       Set it in backend/.env or as an environment variable.")
        return 1

    # -- Phase 3: Build request --------------------------------------------------
    agent_name = "SmokeTest"
    prompt = "Respond with exactly: BOB_CONNECTION_OK"

    body = {
        "model_id": cfg.bob_model_id or "default",
        "messages": [
            {
                "role": "system",
                "content": (
                    f"You are {agent_name}, an AI validation agent. "
                    f"Follow instructions precisely."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    }

    headers = {
        "Content-Type": "application/json",
    }

    if cfg.bob_api_key:
        headers["Authorization"] = f"Bearer {cfg.bob_api_key}"
    if cfg.bob_project_id:
        headers["X-Project-Id"] = cfg.bob_project_id

    team_id = os.environ.get("BOB_TEAM_ID")
    if team_id:
        headers["X-Team-Id"] = team_id

    payload = json.dumps(body).encode("utf-8")

    print("[REQUEST]")
    print(f"  Agent   : {agent_name}")
    print(f"  Prompt  : {prompt}")
    print(f"  Body    : {json.dumps(body, indent=4)}")
    print()

    # -- Phase 4: Send request ---------------------------------------------------
    print("[SENDING]")
    print(f"  POST {cfg.bob_api_url}")
    start = time.monotonic()

    try:
        req = Request(cfg.bob_api_url, data=payload, headers=headers, method="POST")
        with urlopen(req, timeout=10) as resp:
            elapsed_ms = (time.monotonic() - start) * 1000
            raw = resp.read().decode("utf-8")

            print(f"  HTTP {resp.status} {resp.reason}")
            print(f"  Latency: {elapsed_ms:.0f} ms")
            print()
            print("[RESPONSE RAW]")
            print(f"  {raw[:2000]}")
            print()

            try:
                data = json.loads(raw)
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                print("[RESULT]")
                print(f"  Provider : bob")
                print(f"  Content  : {content}")
                print()

                if "BOB_CONNECTION_OK" in content:
                    print("[SUCCESS] BOB connection verified.")
                    return 0
                else:
                    print("[WARNING] Request succeeded but response content is unexpected.")
                    return 2

            except (json.JSONDecodeError, KeyError, IndexError) as e:
                print(f"[PARSE ERROR] Could not parse response: {e}")
                return 3

    except HTTPError as e:
        elapsed_ms = (time.monotonic() - start) * 1000
        print(f"  HTTP {e.code} {e.reason}")
        print(f"  Latency: {elapsed_ms:.0f} ms")
        body = e.read().decode("utf-8", errors="replace")
        print(f"  Body: {body[:1000]}")
        print()

        if e.code == 401:
            print("[AUTH FAILURE] HTTP 401 — check BOB_API_KEY")
        elif e.code == 403:
            print("[AUTH FAILURE] HTTP 403 — check permissions or Team ID")
        elif e.code == 404:
            print("[ENDPOINT FAILURE] HTTP 404 — check BOB_API_URL")
        elif e.code == 429:
            print("[RATE LIMIT] HTTP 429 — too many requests")
        elif e.code >= 500:
            print(f"[SERVER ERROR] HTTP {e.code} — BOB server issue")
        else:
            print(f"[FAILURE] HTTP {e.code}")
        return 4

    except URLError as e:
        elapsed_ms = (time.monotonic() - start) * 1000
        print(f"  Latency: {elapsed_ms:.0f} ms")
        print(f"  Error: {e.reason}")
        print()

        reason_str = str(e.reason).lower()
        if "timed out" in reason_str:
            print("[TIMEOUT] Request timed out (10s)")
        elif "getaddrinfo" in reason_str or "name or service not known" in reason_str:
            print("[NETWORK FAILURE] DNS resolution failed — check BOB_API_URL")
        elif "connection refused" in reason_str:
            print("[NETWORK FAILURE] Connection refused — check BOB_API_URL")
        else:
            print("[NETWORK FAILURE] Could not reach endpoint")
        return 5

    except Exception as e:
        elapsed_ms = (time.monotonic() - start) * 1000
        print(f"  Latency: {elapsed_ms:.0f} ms")
        print(f"  Error: {e}")
        print()
        print(f"[UNEXPECTED ERROR] {type(e).__name__}: {e}")
        return 6


if __name__ == "__main__":
    sys.exit(main())
