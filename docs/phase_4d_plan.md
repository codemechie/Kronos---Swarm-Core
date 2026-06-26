# Phase 4.1B — Agent Personality Layer: Implementation Plan

## Data Flow Trace

Agent rationale text originates in `MockProvider.generate()` (`backend/llm/mock_provider.py:13`):

```
KronosOrchestrator.process_next_tick()
  → KronosStateMachine.transition()
    → _do_analyze()
      → agent.construct_prompt(packet)     # prompt varies per agent (archetypes.py)
      → gateway.generate(agent.name, prompt)
        → MockProvider.generate(agent_name, prompt)   # ✦ HERE — produces the text
      → _parse_assessment_from_content(content)        # extracts verdict/confidence/risk
      → debate_outputs[key] = response.content          # stored for SSE
```

**Root cause:** `MockProvider.generate()` ignores the rich telemetry in `prompt` and only checks whether the word "risk" appears, producing exactly 2 possible outputs per agent.

## Proposed Changes

### 1. Create `backend/agents/persona_builder.py`
Persona template module with:
- **Signal detection** — prompt keyword analysis per agent to select context-relevant templates
- **Multiple templates** per agent/state — deterministic selection via `hash(prompt) % len(templates)`
- **Distinctive voice** per agent (calm/analytical, emotional, high-energy, formal, skeptical)

Each template includes "High-risk:" or "Nominal:" keyword for downstream parser compatibility.

### 2. Modify `MockProvider.generate()`
Replace hardcoded strings with `PersonaBuilder.build(agent_name, prompt, is_risk)`.

**Before:**
```python
content = f"[{agent_name.upper()}]: Nominal conditions observed."
```

**After:**
```python
content = PersonaBuilder.build(agent_name, prompt, is_risk)
```

### 3. Update test assertions in `test_llm_gateway.py`
Match new content format while preserving all test structure.

## Not Modified
- `_parse_assessment_from_content()` — "High-risk" / "Nominal" keywords preserved
- `AgentAssessment` — same verdict, confidence, risk_level assignments
- `debate_outputs` — same `Dict[str, str]` SSE shape
- All frontend components — unchanged
- Provider architecture, routing, selection logic

## Before/After (same match state, nominal)

| Agent | Before | After |
|---|---|---|
| Market Pragmatist | `Nominal conditions observed.` | `Nominal: Efficiency indicators remain within expected range.` |
| Mood Ring | `Nominal conditions observed.` | `Nominal: Crowd tension levels moderate. Composure stable.` |
| Gambler | `Nominal conditions observed.` | `Nominal: Variance within acceptable bounds.` |
| Judge | `Nominal conditions observed.` | `Nominal: Evidence supports current assessment.` |
| Anarchist | `Nominal conditions observed.` | `Nominal: Surface-level stability detected.` |

## Telemetry-Aware Signal Detection

Each agent's prompt contains domain-specific telemetry. `PersonaBuilder` scans the prompt for keywords to select context-relevant templates:

| Agent | Signal | Keywords | Example Template |
|---|---|---|---|
| Market Pragmatist | pressing | PPDA, block height, pressing | "Pressing efficiency metrics are degrading." |
| Market Pragmatist | scoreline | score, differential, goal | "Scoreline not supported by xG projections." |
| Mood Ring | crowd | crowd, decibels, noise | "Crowd pressure affecting decision-making." |
| Mood Ring | panic | panic, fragility | "Panic index rising. Distress signals detected." |
| Gambler | desperation | desperation, chase, losing | "Desperation metrics spiking. Variance accelerating." |
| Gambler | variance | variance, volatility | "Volatility exceeding predicted thresholds." |
| Judge | discipline | foul, card, red card | "Disciplinary indicators escalating. Card risk elevated." |
| Judge | contradiction | contradiction, inconsistent | "Evidence contradictions accumulating." |
| Anarchist | environment | pitch, slickness, wind, fog | "Environmental friction introducing hidden variables." |
| Anarchist | consensus | consensus, agreement | "Excessive consensus may be masking risk." |

Fallback to "default" templates when no signal keywords match.

## Deterministic Template Selection

```python
index = hash(prompt) % len(templates)
```

Same prompt → same output. No randomness. Test stability preserved.
