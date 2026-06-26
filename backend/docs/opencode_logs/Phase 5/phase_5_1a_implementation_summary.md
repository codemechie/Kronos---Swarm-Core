# PHASE 5.1A — MATCH STORY DATA MODEL IMPLEMENTATION SUMMARY

Last updated: 2026-06-24

---

## SCOPE

Frontend-only Match Story data structures and pure derivation functions. No backend modifications. No SSE schema changes.

---

## FILES CREATED (4)

| File | Purpose |
|---|---|
| `frontend/src/lib/matchStory/deriveProbabilities.ts` | Classifies agent verdicts from `debateOutputs`, blends with `overallConfidence` to produce home/draw/away probabilities |
| `frontend/src/lib/matchStory/deriveTeamIntelligence.ts` | Maps telemetry fields to home/away health, aggression, and momentum scores (0-100) |
| `frontend/src/lib/matchStory/generateCommentary.ts` | Synthesizes narrative entries from agent risk levels, fracture index, telemetry thresholds, and match phase |
| `frontend/src/lib/matchStory/buildMatchStorySnapshot.ts` | Composer — calls all three derivations and returns a `MatchStorySnapshot` |

## FILES MODIFIED (1)

| File | Change |
|---|---|
| `frontend/src/types/kronos.ts` | Added `MatchProbabilities`, `TeamStats`, `TeamIntelligence`, `CommentaryEntry`, `MatchStorySnapshot` interfaces |

## ARCHITECTURE

```
KronosState (useKronos)
     │
     ├─ deriveProbabilities(debateOutputs, overallConfidence)
     │    └─ MatchProbabilities { homeWin, draw, awayWin }
     │
     ├─ deriveTeamIntelligence(telemetry)
     │    └─ TeamIntelligence { home: TeamStats, away: TeamStats }
     │
     ├─ generateCommentary(agents, phase, fractureIndex, telemetry)
     │    └─ CommentaryEntry[]
     │
     └─ buildMatchStorySnapshot(state)
          └─ MatchStorySnapshot
```

## DATA SOURCES

All functions consume existing `KronosState` fields only:

- `telemetry` — `minute`, `score_home`, `score_away`, all tactical/physical/psychological/game_theory/environment metrics
- `debateOutputs` — raw agent verdict strings (5 agents)
- `swarmMetrics` — `fracture_index`
- `validation` — `overall_confidence`
- `phase` — `GRIND` / `WEATHER` / `CHAOS`

## EXAMPLE MatchStorySnapshot

```json
{
  "minute": 76,
  "score": { "home": 1, "away": 1 },
  "probabilities": { "homeWin": 42, "draw": 28, "awayWin": 30 },
  "teamIntelligence": {
    "home": { "health": 62, "aggression": 78, "momentum": 55 },
    "away": { "health": 48, "aggression": 91, "momentum": 45 }
  },
  "commentaryEntries": [
    { "minute": 76, "text": "Anarchist flags elevated risk conditions.", "source": "swarm_synthesis" },
    { "minute": 76, "text": "Critical fracture detected in swarm analysis.", "source": "swarm_synthesis" },
    { "minute": 76, "text": "Chaos phase — conditions are degrading rapidly.", "source": "phase" }
  ]
}
```

## CONFIRMATIONS

| Check | Result |
|---|---|
| Backend files modified | None |
| SSE contracts modified | None |
| Backend tests (`py -m pytest tests/ -v`) | 119 passed, 110 subtests passed |
| Frontend typescript (`npx tsc --noEmit`) | Zero errors |

## DERIVATION DETAIL

### deriveProbabilities

1. Classifies each agent verdict text using keyword matching (same logic as backend `_classify`)
2. Computes distribution over `HOME_WIN`, `AWAY_WIN`, `DRAW`, `HIGH_RISK`, `LOW_RISK`, `UNKNOWN`
3. Normalizes outcome categories to percentages
4. Damps home/away probability proportionally to `(1 - overallConfidence)`, pushing remaining weight into draw

### deriveTeamIntelligence

Maps telemetry fields to three team attributes per side:

| Attribute | Home Sources | Away Sources |
|---|---|---|
| `health` | `defensive_fatigue` (inv), `recovery_time_sec` (inv) | `sprint_drop_off` (inv), `recovery_time_sec` (inv) |
| `aggression` | `foul_escalation`, `panic_index` | `foul_escalation`, `panic_index` |
| `momentum` | `field_tilt`, `crowd_decibels` | 100-`field_tilt`, `sub_shock_index` |

Each metric is clamped to [0, 1], optionally inverted, scaled to 0-100, then averaged.

### generateCommentary

Produces up to 4 entries per minute:
1. **High-risk agent alert** — if any agent reports HIGH_RISK
2. **Fracture commentary** — at fracture >= 40 / >= 60 / >= 80 thresholds
3. **Telemetry alert** — panic_index, pitch_slickness, foul_escalation, crowd_decibels, xg_delta, sub_shock_index thresholds
4. **Phase shift note** — for WEATHER and CHAOS phases

Falls back to a single "nominal conditions" entry when no triggers fire.

### buildMatchStorySnapshot

Stateless composer that receives `KronosState` and returns `MatchStorySnapshot`. Intended to be called from a `useMemo` inside the future Match Story page component.
