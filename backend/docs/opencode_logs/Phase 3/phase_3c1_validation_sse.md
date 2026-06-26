# PHASE 3C.1 — EXPOSE VALIDATION OUTPUT THROUGH SSE

---

## DELIVERABLES

---

### 1. Files Modified

| File | Lines changed | Type |
|---|---|---|
| `backend/orchestrator/state_machine.py` | 346–370 | Modify |
| `backend/app_server.py` | 55–63, 64–77, 79–101 | Modify |
| `backend/tests/test_state_machine.py` | 134–210 | Modify |

---

### 2. Code Diff Summary

**`state_machine.py:346–370`** — `to_legacy_dict()` now includes a `"validation"` block:

```python
v = result.validate
validation_dict = (
    {
        "overall_confidence": v.overall_confidence,
        "agreement_score": v.agreement_score,
        "trust_score": v.trust_score,
        "contradiction_count": v.contradiction_count,
        "flags": [str(f) for f in v.flags],
        "evidence_summary": v.evidence_summary,
        "validation_source": v.validation_source,
        "skipped": v.skipped,
    }
    if v is not None
    else {"skipped": True}
)
return {
    ...  # existing keys unchanged
    "validation": validation_dict,   # ← new
}
```

**`app_server.py:55–63`** — Extracted `_build_payload()` static method to DRY the payload construction across `/minute` and `/stream`:

```python
@staticmethod
def _build_payload(result: dict) -> dict:
    return {
        "telemetry": Handler._build_telemetry(result),
        "fracture_index": result["swarm_metrics"]["fracture_index"],
        "chaos_probability": result["swarm_metrics"]["chaos_probability"],
        "debate_outputs": result["debate_outputs"],
        "validation": result.get("validation", {"skipped": True}),
    }
```

Both `_handle_minute` and `_handle_stream` now call `self._build_payload(result)` instead of constructing the dict inline.

**`test_state_machine.py:134–210`** — Updated `test_to_legacy_dict_shape` expected keys to include `"validation"`. Added 9 new tests:

| Test | What it verifies |
|---|---|
| `test_validation_block_exists` | `"validation"` key is present and is a dict |
| `test_validation_fields_present` | All 8 fields exist |
| `test_validation_numeric_fields` | Numeric types correct (float, int, str, bool) |
| `test_flags_serialize_as_strings` | Each flag element is `str` |
| `test_flags_json_serializable` | Full round-trip through `json.dumps` → `json.loads` |
| `test_evidence_summary_included` | Non-empty string present |
| `test_validation_source_is_heuristic` | Source is `"heuristic"` |
| `test_skipped_false_in_mock_mode` | `skipped` is `False` |

---

### 3. Example SSE Payload (after changes)

```json
{
  "telemetry": {
    "minute": 42,
    "ppda": 8.2,
    "block_height_m": 42.1,
    "vertical_disconnect": 0.35,
    "field_tilt": 61.0,
    "sprint_drop_off": -0.05,
    "hid_deficit_km": 0.12,
    "recovery_time_sec": 18.5,
    "defensive_fatigue": 0.22,
    "crowd_decibels": 85,
    "foul_escalation": 3,
    "xg_delta": 0.12,
    "panic_index": 0.31,
    "rest_defense_count": 4,
    "box_overload_count": 2,
    "gk_sweeper_dist": 22.5,
    "sub_shock_index": 0.0,
    "pitch_slickness": 0.45,
    "wind_interference": 0.30,
    "fog_visibility": 0.80,
    "score_home": 1,
    "score_away": 0
  },
  "fracture_index": 40.0,
  "chaos_probability": 40.0,
  "debate_outputs": {
    "pragmatist": "[MARKET PRAGMATIST]: Nominal conditions observed...",
    "mood_ring": "[MOOD RING]: High-risk pattern detected...",
    "gambler": "[GAMBLER]: High-risk pattern detected...",
    "judge": "[JUDGE]: High-risk pattern detected...",
    "anarchist": "[ANARCHIST]: High-risk pattern detected..."
  },
  "validation": {
    "overall_confidence": 0.5787,
    "agreement_score": 0.6,
    "trust_score": 0.625,
    "contradiction_count": 0,
    "flags": ["HIGH_FRACTURE"],
    "evidence_summary": "Swarm fracture is elevated, reducing confidence in the dominant assessment.",
    "validation_source": "heuristic",
    "skipped": false
  }
}
```

---

### 4. Test Results

```
66 passed, 110 subtests passed in 1.20s
```

All existing tests pass. 9 new tests added covering validation block existence, field types, JSON serializability, flag string conversion, and evidence summary inclusion.

---

### 5. Risk Assessment

| Concern | Status |
|---|---|
| **Backward compatibility maintained** | ✅ Existing payload fields (`telemetry`, `fracture_index`, `chaos_probability`, `debate_outputs`) unchanged. New field added, none removed or renamed. |
| **Frontend unaffected** | ✅ Existing components continue receiving the same shape. New `validation` key is additive — frontend that ignores it works exactly as before. |
| **Validation logic unmodified** | ✅ Zero changes to `HeuristicValidator`, `ValidateOutput`, thresholds, flags, or calculations. Only serialization/extraction. |
| **Granite not introduced** | ✅ No Granite code, no new providers, no consensus engine. |
| **JSON serialization works** | ✅ `ValidationFlag` str-enum values serialized as plain strings via `str(f)`. Verified by `test_flags_json_serializable` round-trip test. |
| **Ready for Phase 3C.2** | ✅ The `validation_source` field (`"heuristic"`) is already in place as the integration point for a Granite validator to set `"granite"`. |
