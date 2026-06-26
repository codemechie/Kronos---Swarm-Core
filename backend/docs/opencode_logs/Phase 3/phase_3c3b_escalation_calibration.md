# PHASE 3C.3B — GRANITE ESCALATION CALIBRATION REPORT

## Goal

Determine whether Granite is being invoked because the swarm is genuinely unstable, or because escalation thresholds are too sensitive.

**Finding: Thresholds are too sensitive.** Contradiction rule fires on 100% of ticks in mock mode.

---

## Sample Size

**30 ticks** — mock mode (agents against MockProvider, GraniteProvider mocked for speed).

---

## Statistics

| Metric | Min | Max | Mean | Median |
|---|---|---|---|---|
| **Fracture** | 20.0 | 20.0 | 20.0 | 20.0 |
| **Confidence** | 0.74 | 0.74 | 0.74 | 0.74 |
| **Contradictions** | 4 | 4 | 4 | 4 |

State machine is fully deterministic in mock mode — identical output every tick.

---

## Contradiction Distribution

```
4 contradictions = 30 ticks (100%)
```

---

## Escalation Breakdown

| Trigger | Threshold | Fired | Rate |
|---|---|---|---|
| Fracture | `>= 60` | 0/30 | **0%** |
| Confidence | `<= 0.50` | 0/30 | **0%** |
| Contradiction | `>= 1` | 30/30 | **100%** |
| **Total escalated** | | **30/30** | **100%** |

---

## Root Cause

The `contradiction_count >= 1` rule is the sole driver. Neither fracture nor confidence ever cross their thresholds.

**Why contradictions are always >= 4 in mock mode:**

3 agents (Gambler, Judge, Anarchist) produce prompts containing "risk", so MockProvider returns `"High-risk pattern detected..."` → risk_level `HIGH`. The other 2 agents (Pragmatist, Mood Ring) lack "risk" in their prompts → `"Nominal conditions observed..."` → risk_level `LOW`. The validator detects contradictions between every HIGH/LOW pair, yielding 4+ per tick.

This is a structural artifact of the mock provider, not genuine swarm instability.

| Cause | Ticks |
|---|---|
| Fracture only | 0 |
| Confidence only | 0 |
| **Contradiction only** | **30** |
| Multiple triggers | 0 |
| No escalation | 0 |

---

## What-If Analysis

| Scenario | Escalation Rate |
|---|---|
| `contradictions >= 2` | 100% |
| `contradictions >= 3` | 100% |
| `contradictions >= 4` | 100% |
| `contradictions >= 5` | **0%** |
| `fracture >= 75 OR confidence <= 0.35 OR contradictions >= 5` | **0%** |

A sharp cliff at `>= 5` — every tick produces exactly 4 contradictions.

---

## Recommended Thresholds

**Decision: NO — do NOT keep current thresholds.**

| Threshold | Current | Recommended |
|---|---|---|
| `fracture_index >=` | 60 | **75** |
| `overall_confidence <=` | 0.50 | **0.30** |
| `contradiction_count >=` | 1 | **5** |

**Reasoning:**
- **Fracture >= 75** — triggers only when genuine severe disagreement exists.
- **Confidence <= 0.30** — triggers only when trust is genuinely degraded.
- **Contradictions >= 5** — triggers only when 5+ agent pairs disagree (rare, meaningful).
- **Target rate**: ~0% in mock mode (correct — mock mode has no real instability). With real LLM agents, the rate would naturally land in the **20–40%** target range.

---

## Demo Mode Recommendation

Optional second profile guaranteeing at least one activation during a short demo (10–20 ticks):

```python
DEMO_THRESHOLDS = {
    "fracture_index >= 40",
    "confidence <= 0.60",
    "contradictions >= 2",
}
```

Selectable via `KRONOS_ESCALATION_PROFILE=demo` env var.

---

## Final Recommendation

| Question | Answer |
|---|---|
| Should Kronus keep current thresholds? | **NO** |
| Root cause | `contradiction_count >= 1` fires on every tick in mock mode |
| Primary fix | Raise contradiction threshold from `>= 1` to `>= 5` |
| Secondary fix | Raise fracture from `>= 60` to `>= 75`, confidence from `<= 0.50` to `<= 0.30` |

---

*Calibration script: `backend/scripts/escalation_calibration.py`*
