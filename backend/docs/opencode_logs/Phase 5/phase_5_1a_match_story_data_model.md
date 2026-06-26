# PHASE 5.1A — MATCH STORY DATA MODEL PROPOSAL

Last updated: 2026-06-24

---

## ARCHITECTURE PRINCIPLE

The Match Story layer is a **derived/presentation layer only**. It wraps existing pipeline outputs with zero changes to the orchestration flow (Ticker → Agents → Validation → Granite). Two categories:

1. **Backend-originated** — data the ticker already simulates but doesn't yet expose (goal events, team identities)
2. **Frontend-derived** — pure-function transformations of existing `useKronos()` state (probabilities, team intelligence, commentary)

---

## 1. MatchEvent Schema (Backend — New)

**Rationale**: The ticker simulates goals (score changes), phase transitions (GRIND → WEATHER → CHAOS), and threshold crossings. None are recorded as structured events.

### Python Dataclass

```python
# backend/contracts/match_events.py  (NEW)

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict


class MatchEventType(str, Enum):
    GOAL            = "GOAL"
    CARD            = "CARD"
    SUBSTITUTION    = "SUBSTITUTION"
    PHASE_SHIFT     = "PHASE_SHIFT"
    PRESSURE_SHIFT  = "PRESSURE_SHIFT"
    MOMENTUM_SWING  = "MOMENTUM_SWING"


@dataclass(frozen=True)
class MatchEvent:
    minute: int
    event_type: MatchEventType
    team: str | None = None              # "HOME" | "AWAY" | None
    description: str = ""
    detail: Dict[str, Any] = None        # {"card_type": "YELLOW", "player": "..."}
```

### TypeScript Interface

```typescript
// frontend/src/types/kronos.ts — add

export type MatchEventType =
  | "GOAL"
  | "CARD"
  | "SUBSTITUTION"
  | "PHASE_SHIFT"
  | "PRESSURE_SHIFT"
  | "MOMENTUM_SWING";

export interface MatchEvent {
  minute: number;
  event_type: MatchEventType;
  team?: "HOME" | "AWAY";
  description: string;
  detail?: Record<string, unknown>;
}
```

### Where Generated

Backend, inside `KronosMatchTicker`. The ticker already knows when a goal occurs (score changes), when weather shifts (minute 65), and when fatigue exceeds thresholds. A `events: List[MatchEvent]` accumulator is flushed per tick.

### SSE Payload Addition

New field `"match_events"` array appended in `_build_payload` (`app_server.py`):

```json
"match_events": [
  { "minute": 23, "event_type": "GOAL", "team": "HOME", "description": "Home team scores", "detail": {} },
  { "minute": 65, "event_type": "PHASE_SHIFT", "team": null, "description": "Weather system detected: RAIN", "detail": {} }
]
```

### Existing Structures Reused

- Ticker score logic (`KronosMatchTicker.home_score` / `away_score` deltas)
- Phase derivation (`KronosStateMachine._derive_match_phase`)
- Scripted triggers (e.g., minute 76 away goal)

---

## 2. MatchStoryTick Schema (Frontend — Derived)

The enriched per-minute snapshot consumed by the Match Story page.

```typescript
// frontend/src/types/kronos.ts — add

export interface MatchStoryTick {
  minute: number;
  teams: { home: string; away: string };
  score: { home: number; away: number };
  probabilities: MatchProbabilities;
  teamIntelligence: TeamIntelligence;
  commentary: string;
  events: MatchEvent[];
}
```

### Where Generated

Frontend, as a derived snapshot composited from existing normalized state + new `match_events` SSE field.

### Existing Structures Reused

| Field | Source |
|---|---|
| `minute` | `Telemetry.minute` |
| `score.home` | `Telemetry.score_home` |
| `score.away` | `Telemetry.score_away` |

---

## 3. Probabilities Schema (Frontend — Derived Pure Function)

```typescript
// frontend/src/types/kronos.ts — add

export interface MatchProbabilities {
  homeWin: number;   // 0-100
  draw: number;      // 0-100
  awayWin: number;   // 0-100
}
```

### Derivation Rule

Existing `SwarmFractureMetrics.prediction_distribution` contains `HOME_WIN`, `AWAY_WIN`, `DRAW` counts from agent verdict classification. These are normalized to percentages and blended with `Validation.overall_confidence`.

```typescript
// frontend/src/lib/matchStory/deriveProbabilities.ts  (NEW)

export function deriveProbabilities(
  distribution: Record<string, number>,
  overallConfidence: number,
): MatchProbabilities {
  const total = Object.values(distribution).reduce((s, v) => s + v, 0) || 1;
  const raw: MatchProbabilities = {
    homeWin: ((distribution.HOME_WIN ?? 0) / total) * 100,
    draw: ((distribution.DRAW ?? 0) / total) * 100,
    awayWin: ((distribution.AWAY_WIN ?? 0) / total) * 100,
  };
  const uncertainty = 1 - overallConfidence;
  raw.homeWin *= (1 - uncertainty * 0.3);
  raw.awayWin *= (1 - uncertainty * 0.3);
  raw.draw = Math.max(raw.draw, 100 - raw.homeWin - raw.awayWin);
  return raw;
}
```

### Existing Structures Reused

- `SwarmFractureMetrics.prediction_distribution`
- `Validation.overall_confidence`

### JSON Example

```json
{ "homeWin": 42, "draw": 28, "awayWin": 30 }
```

---

## 4. Team Intelligence Schema (Frontend — Derived Pure Function)

```typescript
// frontend/src/types/kronos.ts — add

export interface TeamIntelligence {
  home: TeamStats;
  away: TeamStats;
}

export interface TeamStats {
  health: number;     // 0-100
  aggression: number; // 0-100
  momentum: number;   // 0-100
}
```

### Mapping from Telemetry

| Metric | Applies To | Affects |
|---|---|---|
| `defensive_fatigue` (inverted) | both | `health` |
| `sprint_drop_off` (inverted) | both | `health` |
| `recovery_time_sec` (inverted) | both | `health` |
| `foul_escalation` | both | `aggression` |
| `panic_index` | both | `aggression` |
| `crowd_decibels` | home | `momentum` (home advantage) |
| `field_tilt` | home/away split | `momentum` |
| `xg_delta` | both | `momentum` |
| `sub_shock_index` | both | `momentum` (negative on defensive side) |

### Derivation

```typescript
// frontend/src/lib/matchStory/deriveTeamIntelligence.ts  (NEW)

export function deriveTeamIntelligence(tel: Telemetry): TeamIntelligence {
  const f = (v: number | undefined, inv = false) => {
    const raw = v ?? 0.5;
    return Math.round((inv ? 1 - raw : raw) * 100);
  };

  return {
    home: {
      health:       f(tel.defensive_fatigue, true),
      aggression:   f(tel.foul_escalation),
      momentum:     f(tel.field_tilt),
    },
    away: {
      health:       f(tel.sprint_drop_off, true),
      aggression:   f(tel.panic_index),
      momentum:     100 - f(tel.field_tilt),
    },
  };
}
```

### Existing Structures Reused

- All `PhysicalMetrics`, `PsychologicalMetrics`, `TacticalMetrics`, `GameTheoryMetrics`

### JSON Example

```json
{
  "home": { "health": 62, "aggression": 78, "momentum": 55 },
  "away": { "health": 48, "aggression": 91, "momentum": 45 }
}
```

---

## 5. Commentary Schema (Frontend — Derived Pure Function)

```typescript
// frontend/src/types/kronos.ts — add

export interface CommentaryEntry {
  minute: number;
  text: string;
  source: string;
}
```

### Derivation

Each agent's `debate_outputs` contains rich telemetry-aware text. The commentary function selects the most impactful agent output per minute (highest risk level, strongest signal) and frames it as narrative prose.

```typescript
// frontend/src/lib/matchStory/generateCommentary.ts  (NEW)

export function generateCommentary(
  agents: SwarmAgent[],
  events: MatchEvent[],
  phase: MatchPhase,
): CommentaryEntry[];
```

### Example

Raw agent output: *"Pitch slickness 0.82 — environmental friction is degrading expected performance by 40%"*

Generated commentary: *"[75'] Anarchist reports pitch conditions are severely degrading match quality."*

### Existing Structures Reused

- `debate_outputs` (all agent raw text)
- `SwarmAgent` normalized list

### JSON Example

```json
{
  "minute": 75,
  "text": "Chaos phase initiated. Pitch slickness is critical at 0.82, wind interference severe.",
  "source": "swarm_synthesis"
}
```

---

## 6. File Locations — Summary

| File | Purpose |
|---|---|
| `backend/contracts/match_events.py` | `MatchEventType` enum, `MatchEvent` dataclass |
| `backend/utils/match_event_tracker.py` | Event detection logic (called by ticker) |
| `frontend/src/lib/matchStory/deriveProbabilities.ts` | Pure function for probabilities |
| `frontend/src/lib/matchStory/deriveTeamIntelligence.ts` | Pure function for team stats |
| `frontend/src/lib/matchStory/generateCommentary.ts` | Commentary synthesis |
| `frontend/src/lib/matchStory/buildMatchStoryTick.ts` | Composer: calls all derives, returns `MatchStoryTick` |
| `frontend/src/pages/MatchStory.tsx` | New route page |
| `frontend/src/types/kronos.ts` | Add all new interfaces |

---

## 7. Existing Structures Reused — Summary

| New Schema | Reuses |
|---|---|
| `MatchEvent` | Ticker score deltas, phase machine, scripted triggers |
| `MatchStoryTick` | `Telemetry.minute`, `Telemetry.score_home`, `Telemetry.score_away` |
| `MatchProbabilities` | `SwarmFractureMetrics.prediction_distribution`, `Validation.overall_confidence` |
| `TeamStats.health` | `PhysicalMetrics` (defensive_fatigue, sprint_drop_off, recovery_time_sec) |
| `TeamStats.aggression` | `PsychologicalMetrics` (foul_escalation, panic_index, crowd_decibels) |
| `TeamStats.momentum` | `TacticalMetrics.field_tilt`, `PsychologicalMetrics.xg_delta`, `GameTheoryMetrics.sub_shock_index` |
| `CommentaryEntry` | `debate_outputs` (agent raw text) |

---

## 8. New Structures Required — Summary

| Structure | Type | Why |
|---|---|---|
| `MatchEventType` + `MatchEvent` | Backend dataclass | Events not explicitly tracked today |
| Match event accumulator in ticker | Backend state | Record events as they occur during simulation |
| `MatchProbabilities` | Frontend interface | New derived data type |
| `TeamIntelligence` / `TeamStats` | Frontend interface | New derived data type |
| `CommentaryEntry` | Frontend interface | New derived data type |
| 5 pure functions in `frontend/src/lib/matchStory/` | Frontend logic | All derivation lives here |
| `MatchStory.tsx` page | Frontend component | New route at `/match-story` |

---

## 9. Route & Navigation

New route in `App.tsx`:

```
/                → Landing
/war-room        → Command Center
/swarm           → Swarm Intelligence
/transcript      → Debate Transcript
/granite         → Granite Intelligence
/match-story     → Match Story       ← NEW
```

CommandHeader nav gains a 6th link. The Match Story page becomes the primary UX surface; existing pages remain as supporting detail views.

---

## 10. Proposed Implementation Order

1. Backend: `MatchEvent` dataclass + event tracker in `KronosMatchTicker` + SSE payload extension
2. Frontend types: Add all interfaces to `kronos.ts`
3. Frontend lib: 5 pure functions in `src/lib/matchStory/`
4. Frontend page: `MatchStory.tsx` component + route wiring in `App.tsx`
5. Navigation: Add `/match-story` link to `CommandHeader`
