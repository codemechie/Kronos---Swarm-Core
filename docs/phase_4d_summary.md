# Phase 4.1B — Agent Personality Layer

## Files
- `backend/agents/persona_builder.py` (created) — Persona templates with signal-aware rationale generation
- `backend/llm/mock_provider.py` (modified) — Delegates to PersonaBuilder instead of hardcoded strings
- `backend/tests/test_llm_gateway.py` (modified) — Updated assertions for new content format

## Architecture
`MockProvider.generate()` → `PersonaBuilder.build(agent_name, prompt, is_risk)` → scans prompt for telemetry keywords → selects context-relevant template via `hash(prompt)` → returns `"[AGENT]: High-risk/Nominal: {voice text}"`

## Agent Voices
- **Market Pragmatist** — calm, analytical (efficiency/xG focus)
- **Mood Ring** — emotional, human-centered (psychology/crowd focus)
- **Gambler** — high-energy, risk-oriented (variance/volatility focus)
- **Judge** — formal, objective (discipline/threshold focus)
- **Anarchist** — skeptical, provocative (blind spots/environment focus)

## Signal Detection
Per-agent prompt keyword analysis selects from multiple templates:
- Pragmatist: pressing, scoreline signals
- Mood Ring: crowd, panic, fatigue signals
- Gambler: desperation, variance, subs signals
- Judge: discipline, contradiction, pressure signals
- Anarchist: environment, consensus signals

## Constraints Preserved
- No SSE schema changes (still `Dict[str, str]` in debate_outputs)
- No `_parse_assessment_from_content()` changes (keywords "High-risk"/"Nominal" preserved)
- No frontend changes
- No provider architecture changes
- No risk/confidence calculation changes

## Tests
119 passed, 110 subtests passed — zero regressions.
