# BOB Validation Report

## Summary

**Status:** ⚠️ Blocked — correct inference endpoint not found.

## What was tested

### 1. Configuration
| Setting | Value |
|---|---|
| `KRONOS_LLM_MODE` | `hybrid` (default) |
| `BOB_API_KEY` | ✅ Loaded from `backend/.env` |
| `BOB_API_URL` | `https://api.bob-llm.dev/v1/chat/completions` (placeholder) |
| `BOB_PROJECT_ID` | Not set |
| `BOB_MODEL_ID` | Not set (defaults to `"default"`) |
| `BOB_TEAM_ID` | Not set |

### 2. DNS Resolution — Placeholder Endpoint
```
POST https://api.bob-llm.dev/v1/chat/completions
→ DNS resolution failed (getaddrinfo: 11001)
```
`api.bob-llm.dev` does not exist in DNS — this hostname was a placeholder.

### 3. Live Exploration — bob.ibm.com
The actual BOB product domain (`bob.ibm.com`) was probed:

| Path | POST result |
|---|---|
| `/api/v1/chat/completions` | 405 Method Not Allowed |
| `/api/chat/completions` | 405 Method Not Allowed |
| `/api/v1/inference` | 405 Method Not Allowed |
| `/api/inference` | 405 Method Not Allowed |
| `/api/v1/generate` | 405 Method Not Allowed |
| `/api/generate` | 405 Method Not Allowed |
| `/api/v1/completions` | 405 Method Not Allowed |
| `/api/completions` | 405 Method Not Allowed |
| `/chat/completions` | 405 Method Not Allowed |
| `/v1/chat/completions` | 405 Method Not Allowed |

All paths return 405 — the domain hosts a Next.js SPA (the Bob IDE product page), not a REST inference API.

### 4. API Key Analysis
- Format: `bob_prod_bob-apikey_<long-hex>`
- According to [IBM Bob docs](https://bob.ibm.com/docs/ide/account/api-keys):
  - **General keys**: For Bob Shell automation; require `X-Team-Id` header for inference
  - **Inference keys**: Inference-only, no extra headers needed
- The BOB API is documented as authenticating the **Bob Shell CLI** for non-interactive sessions, not as a model inference provider.

## Findings

1. **`api.bob-llm.dev` is not a real host** — it was a placeholder URL chosen during initial provider scaffolding.

2. **`bob.ibm.com` does not expose a public chat completions endpoint** — the domain serves the Bob IDE single-page application. All API-like paths return 405 Method Not Allowed.

3. **The API key format** is consistent with Bob Shell authentication keys, which authenticate a locally-running Bob CLI instance rather than providing direct HTTP access to an LLM backend.

4. **IBM Bob is an AI IDE product** (announced GA April 28, 2026) — similar to Cursor or GitHub Copilot. It communicates with LLMs internally via its own orchestration layer, not through a public REST endpoint.

## Next Steps Required

Before BOB can be used as an LLM provider in Kronos, one of the following is needed:

1. **The correct BOB inference API endpoint** — if BOB exposes a dedicated inference API at a URL not found during exploration (e.g., a regional endpoint, a dedicated subdomain, or a Watsonx-style endpoint).

2. **A different provider URL** — if the `BOB_API_URL` environment variable should point to a different service (e.g., a Watsonx.ai deployment URL, a LiteLLM proxy, or a custom BOB deployment).

3. **Switch to Watsonx.ai directly** — the `BobProvider` could be replaced or supplemented with a provider pointing to `https://us-south.ml.cloud.ibm.com/ml/v1/text/generation` (IBM Watsonx.ai REST API), which has [public documentation](https://cloud.ibm.com/apidocs/watsonx-ai).

## Files Created

| File | Purpose |
|---|---|
| `backend/scripts/bob_smoke_test.py` | Validates a single BOB inference request with diagnostics |
| `backend/scripts/test_bob_provider.py` | Calls `BobProvider.generate()` directly |
| `backend/llm/bob_provider.py` | BOB LLM provider implementation |
| `backend/llm/gateway.py` | Provider gateway with hybrid fallback |
| `backend/config/runtime.py` | Runtime config with `BOB_API_URL` env var |
