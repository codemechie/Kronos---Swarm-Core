# Granite Configuration Loading — Investigation Report

## 1. .env file path

```
C:\Users\iamma\IBM-SKILLS-BUILD\june-challenge\kronos-swarm-core\backend\.env
```

Loaded at `runtime.py:9` via:

```python
_DOTENV_PATH = Path(__file__).resolve().parent.parent / ".env"
```

which resolves to `backend\.env`.

## 2. Actual values loaded (from .env)

| Key | Value |
|---|---|
| `IBM_RUNTIME_URL` | `https://eu-de.ml.cloud.ibm.com` |
| `IBM_SPACE_ID` | `1fc02a8a-e940-447c-8300-6b047daa31f5` |
| `IBM_MODEL_ID` | `ibm/granite-4-h-small` |
| `IBM_API_KEY` | *(redacted — prefix: `2gC4OfHxByI3xzAwc0EJ`)* |

## 3. Root cause of divergence

**`load_dotenv` ran only once at module import time** (`runtime.py` line 9). When a test's `tearDown` called `os.environ.clear()`, the `.env` values were wiped from the process environment. The cached `RuntimeConfig` singleton was then invalidated by `reset_runtime_config()`, and the next `RuntimeConfig()` read from a bare `os.environ`, hitting the hard-coded fallbacks:

- `os.environ.get("GRANITE_SPACE_ID")` → `None` (cleared)
- `os.environ.get("IBM_SPACE_ID")` → `None` (cleared)
- **Result** → `None` (no default for space_id)

- `os.environ.get("GRANITE_MODEL_ID")` → `None` (cleared)
- `os.environ.get("IBM_MODEL_ID")` → `None` (cleared)
- **Result** → `ibm/granite-3-8b-instruct` (default)

### Divergence point

```
TestGraniteProviderIAMToken.tearDown
  → os.environ.clear()
  → os.environ.update(self._env)    # restored snapshot may lack .env values
  → next test calls reset_runtime_config()
  → RuntimeConfig.__init__() reads os.environ (missing .env values)
  → space_id = None, model_id = ibm/granite-3-8b-instruct
```

## 4. Fix applied

**File modified:** `backend/config/runtime.py`

Extracted `load_dotenv` into a helper `_ensure_dotenv()` and call it **both** at module level (first import) and inside `RuntimeConfig.__init__()` (every config construction). Since `load_dotenv` uses `override=False`, already-set env vars (including test-specific values or `""`) are never overwritten, but `.env` values re-populate the environment after a `clear()`.

```python
def _ensure_dotenv() -> None:
    if load_dotenv is not None:
        load_dotenv(_DOTENV_PATH)

_ensure_dotenv()   # at module level

class RuntimeConfig:
    def __init__(self) -> None:
        _ensure_dotenv()   # at every construction
        ...
```

**Files modified (tests):**

| File | Change |
|---|---|
| `test_llm_gateway.py` (3 tests) | `os.environ.pop("VAR")` → `os.environ["VAR"] = ""` |
| `test_granite_review.py` (1 test) | `os.environ.pop("VAR")` → `os.environ["VAR"] = ""` |

This prevents `load_dotenv(override=False)` from re-seeding the cleared value from `.env`.

## 5. Verification

| Check | Result |
|---|---|
| `RuntimeConfig` after `os.environ.clear()` + `reset_runtime_config()` | `space_id` = `1fc02a8a-e940-447c-8300-6b047daa31f5`, `model_id` = `ibm/granite-4-h-small`, `runtime_url` = `https://eu-de.ml.cloud.ibm.com` |
| Full test suite | **119 passed**, 110 subtests passed |
| TypeScript build | Clean (`tsc -b --noEmit`, `vite build`) |

## 6. Post-fix smoke test

```
Config:
  Runtime URL: https://eu-de.ml.cloud.ibm.com
  Space ID:    1fc02a8a-e940-447c-8300-6b047daa31f5
  Model ID:    ibm/granite-4-h-small
  API Key set: True

FAILED: Granite provider failed after 2 attempts (Forbidden)
```

The **config loading is now correct** — all three values match the successful smoke test parameters. The `Forbidden` (HTTP 403) is an **API-level authorization failure**, not a config issue: the IAM token is obtained successfully, but the inference endpoint rejects it. Possible causes: expired API key, revoked space access, or model deployment removed from the space.
