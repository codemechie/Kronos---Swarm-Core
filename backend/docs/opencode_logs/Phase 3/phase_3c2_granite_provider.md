# PHASE 3C.2 — IMPLEMENT GRANITE PROVIDER

---

## DELIVERABLES

---

### 1. Files Created

| File | Purpose |
|---|---|
| `backend/llm/granite_provider.py` | GraniteProvider with IAM auth + watsonx Runtime chat inference |

---

### 2. Files Modified

| File | Lines changed | Change |
|---|---|---|
| `backend/config/runtime.py` | 13, 31–37 | Added `"granite"` to `ALLOWED_MODES`, added Granite config fields |
| `backend/llm/gateway.py` | 9, 26, 31–32, 47–50 | Import `GraniteProvider`, instantiate in `granite` mode, route `granite` in `generate()` |
| `backend/tests/test_llm_gateway.py` | 1, 153–432 | Added `import json`, added 5 test classes (13 tests) for GraniteProvider |

---

### 3. GraniteProvider Implementation Summary

**Architecture** follows the exact same pattern as `BobProvider` and `MockProvider`:

```
class GraniteProvider:
    def __init__(self) -> None:
        - Read config: api_key, runtime_url, space_id, model_id
        - Initialize token cache (None, expiry=0)

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        - Calls _build_headers() which triggers _get_iam_token()
        - POST to {runtime_url}/ml/v1/text/chat?version=2024-05-01
        - Parse: data["choices"][0]["message"]["content"]
        - Return LLMResponse(provider="granite", content=...)
        - 1 retry on failure, 30s timeout
        - Raise RuntimeError after MAX_RETRIES + 1 failures

    def _get_iam_token(self) -> str:
        - POST https://iam.cloud.ibm.com/identity/token
        - Body: grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey={key}
        - Cache token + expires_in; refresh when within 300s of expiry

    def _build_payload(self, agent_name: str, prompt: str) -> bytes:
        - {"model_id": "...", "space_id": "...", "messages": [system, user]}

    def _build_headers(self) -> dict:
        - {"Content-Type": "application/json", "Authorization": "Bearer {token}"}
```

**Key design decisions:**

| Decision | Choice | Rationale |
|---|---|---|
| **Endpoint** | `/ml/v1/text/chat` | Current IBM recommendation for Granite chat models |
| **Auth** | IAM token with caching | Avoids generating a new token per request; 5-min refresh buffer |
| **Space vs Project** | `space_id` | User confirmed `space_id` (not `project_id`) |
| **Timeout** | 30s | Granite models can be slower than BOB; matches watsonx typical latency |
| **Retries** | 1 retry (2 total) | Same as BobProvider |

---

### 4. Gateway Changes

`LLMGateway` now supports `granite` mode:

```python
# __init__:
self._granite: GraniteProvider | None = None
if self.mode == "granite":
    self._granite = GraniteProvider()

# generate():
if self.mode == "granite":
    if self._granite is None:
        raise RuntimeError("Granite provider not available in granite mode")
    return self._granite.generate(agent_name, prompt)
```

Existing modes (`mock`, `bob`, `hybrid`) are completely untouched. New `granite` mode is additive only.

---

### 5. Example Usage

```python
from backend.llm.granite_provider import GraniteProvider

provider = GraniteProvider()

resp = provider.generate(
    "Market Pragmatist",
    "SCORE: 1-0, FIELD TILT: 61.00, BETTING ODDS: Low scoring / tight match. Assess whether the market should trust this scoreline."
)
# resp == LLMResponse(
#     provider="granite",
#     content="[MARKET PRAGMATIST]: The scoreline reflects...",
# )
```

With gateway routing:

```python
# KRONOS_LLM_MODE=granite
gate = LLMGateway()
resp = gate.generate("Mood Ring", "CROWD NOISE: 85 dB...")
# resp.provider == "granite"
```

---

### 6. Test Results

```
79 passed, 110 subtests passed in 1.53s
```

**Granite-specific test classes (13 new tests):**

| Class | Tests | What is verified |
|---|---|---|
| `TestGraniteProviderInit` | 3 | Config loads, defaults applied, custom URL |
| `TestGraniteProviderIAMToken` | 3 | Token acquisition, caching, missing-key error |
| `TestGraniteProviderInference` | 4 | LLMResponse shape, space_id payload, system message, HTTP error |
| `TestLLMGatewayGraniteMode` | 2 | Gateway routes to granite, raises without config |
| `TestGraniteProviderRetry` | 1 | Transient failure → retry → success |

All HTTP calls are mocked — no live API calls in tests.

---

### 7. Readiness Assessment

**Can Phase 3C.3 (Granite Review Engine) now be implemented without further provider work?**

**YES.**

The `GraniteProvider` is a complete, tested transport layer that:
- Takes `(agent_name, prompt)` → returns `LLMResponse(provider="granite", content="...")`
- Handles IAM auth with caching and expiry
- Integrates into `LLMGateway` via `KRONOS_LLM_MODE=granite`
- Matches the `BaseProvider` protocol
- Is fully mocked for testing

Phase 3C.3 can focus purely on consensus logic using `GraniteProvider.generate()` as the underlying LLM call, with zero additional provider-level work.
