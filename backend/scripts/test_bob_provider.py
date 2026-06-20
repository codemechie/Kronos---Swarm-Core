"""
BOB Provider Self-Test — calls BobProvider.generate() directly.

Usage:
    py -m backend.scripts.test_bob_provider
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

_proj = str(Path(__file__).resolve().parent.parent)
if _proj not in sys.path:
    sys.path.insert(0, _proj)

from backend.config.runtime import reset_runtime_config
from backend.llm.bob_provider import BobProvider


def main() -> int:
    reset_runtime_config()

    print("=" * 60)
    print("  BOB PROVIDER SELF-TEST")
    print("=" * 60)
    print()

    try:
        provider = BobProvider()
    except Exception as e:
        print(f"[FAIL] Could not instantiate BobProvider: {e}")
        return 1

    print("[PROVIDER]")
    print(f"  Class   : {type(provider).__name__}")
    print(f"  API URL : {provider.api_url}")
    print(f"  API Key : {'<set>' if provider.api_key else '<NOT SET>'}")
    print()

    agent_name = "Judge"
    prompt = "What is 2+2?"

    print("[CALLING]")
    print(f"  Agent : {agent_name}")
    print(f"  Prompt: {prompt}")
    print()

    start = time.monotonic()
    try:
        resp = provider.generate(agent_name, prompt)
        elapsed_ms = (time.monotonic() - start) * 1000
        print(f"  Latency: {elapsed_ms:.0f} ms")
        print()
        print("[RESPONSE]")
        print(f"  Provider: {resp.provider}")
        print(f"  Content : {resp.content}")
        print()
        if resp.provider == "bob" and resp.content:
            print("[SUCCESS] BobProvider returned a valid response.")
            return 0
        else:
            print("[WARNING] BobProvider returned unexpected result.")
            return 2

    except Exception as e:
        elapsed_ms = (time.monotonic() - start) * 1000
        print(f"  Latency: {elapsed_ms:.0f} ms")
        print(f"  Error  : {e}")
        print()
        print(f"[FAIL] BobProvider.generate() raised {type(e).__name__}")
        return 3


if __name__ == "__main__":
    sys.exit(main())
