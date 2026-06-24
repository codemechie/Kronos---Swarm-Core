#!/usr/bin/env python
"""Granite smoke test — real end-to-end validation.

Usage:
    python backend/scripts/granite_smoke_test.py

Requires these env vars (via .env or shell):
    GRANITE_API_KEY  or  IBM_API_KEY
    GRANITE_SPACE_ID   or  IBM_SPACE_ID
    GRANITE_RUNTIME_URL or IBM_RUNTIME_URL
    GRANITE_MODEL_ID   or  IBM_MODEL_ID
"""

import sys
import json
from pathlib import Path

# Ensure project root is on sys.path
_project_root = str(Path(__file__).resolve().parent.parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from backend.llm.granite_provider import GraniteProvider


def main() -> None:
    print("=" * 60)
    print("GRANITE SMOKE TEST")
    print("=" * 60)

    # Inspect config
    from backend.config.runtime import get_runtime_config

    cfg = get_runtime_config()
    print(f"\nConfig:")
    print(f"  Runtime URL: {cfg.granite_runtime_url}")
    print(f"  Space ID:    {cfg.granite_space_id}")
    print(f"  Model ID:    {cfg.granite_model_id}")
    print(f"  API Key set: {bool(cfg.granite_api_key)}")

    if not cfg.granite_api_key:
        print("\nERROR: GRANITE_API_KEY / IBM_API_KEY is not set.")
        sys.exit(1)
    if not cfg.granite_space_id:
        print("\nERROR: GRANITE_SPACE_ID / IBM_SPACE_ID is not set.")
        sys.exit(1)

    # Create provider and send one request
    print(f"\nSending request...")
    provider = GraniteProvider()

    try:
        response = provider.generate(
            "Smoke Test Agent",
            "Reply with exactly: GRANITE ONLINE",
        )
    except Exception as e:
        print(f"\nFAILED: {e}")
        sys.exit(1)

    print(f"\n--- RESULT ---")
    print(f"Provider: {response.provider}")
    print(f"Response: {response.content}")
    print(f"Length:   {len(response.content)}")
    print(f"--- END ---")

    # Also test gateway routing if KRONOS_LLM_MODE=granite
    import os
    if os.environ.get("KRONOS_LLM_MODE", "").strip().lower() == "granite":
        print(f"\nTesting LLMGateway routing...")
        from backend.llm.gateway import LLMGateway

        gate = LLMGateway()
        gate_resp = gate.generate("Gateway Test Agent", "Reply with: GATEWAY OK")
        print(f"Gateway provider: {gate_resp.provider}")
        print(f"Gateway response: {gate_resp.content}")

    print(f"\nSMOKE TEST PASSED")


if __name__ == "__main__":
    main()
