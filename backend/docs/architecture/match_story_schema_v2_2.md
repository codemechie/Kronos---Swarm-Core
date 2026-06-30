# Historical Match Intelligence Pipeline — Canonical Source Schema (Version 2.2)

**Document-Level Metadata**

| Field | Value |
|---|---|
| **match_id** | `{HOME}_{AWAY}_{YEAR}` |
| **schema_version** | `2.2` |
| **anchor_version** | `2.2` |

These fields exist at the document level, not per event. They identify the match and the schema version against which all anchors in this document were authored. Future migration of extraction rules and timeline converters MUST reference `schema_version` and `anchor_version` to select the correct parser.

---

A structured narrative anchor format for encoding football match events into a deterministic, timeline-ready intermediate representation. Designed for long-term maintainability and one-to-one conversion into Kronos timeline JSON.

---

## Narrative Anchor — Field Reference

### `event_id`

- **Purpose**: Unique identifier for every narrative anchor. Enables stable referencing across timelines, diffs, and cross-match queries.
- **Type**: String
- **Validation**: Required. Must be unique within a match. Convention: `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT_TYPE}`. For stoppage-time events: `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{STOPPAGE}_{EVENT_TYPE}` with `MINUTE` zero-padded to 3 digits and `STOPPAGE` zero-padded to 2 digits. For penalty shootout events, replace `{MINUTE}` with `PSO_{ROUND}`. The underscore `_` is the canonical delimiter for all segments.
- **Examples**: `ARG_FRA_2022_023_PENALTY`, `ARG_FRA_2022_023_GOAL`, `ARG_FRA_2022_090_05_CARD`, `ARG_FRA_2022_080_GOAL`, `ARG_FRA_2022_PSO_04_GOAL`

---

### `minute`

- **Purpose**: Temporal anchor. Establishes when the event occurred in match time.
- **Type**: Integer
- **Validation**: `1` – `120` (regulation + extra time). Must not exceed match duration. When an event occurs in stoppage time, `minute` records the last full minute of the period and `stoppage_time` records the additional minutes.
- **Examples**: `23`, `80`, `90`, `105`

---

### `stoppage_time`

- **Purpose**: Stores additional time beyond the regulation minute for injury-time events. Preserves chronological accuracy when events occur in added time.
- **Type**: Integer or null
- **Validation**: Must be `null` for non-stoppage events. Must be `>= 1` when set. Cannot exist without `minute`. Independent of `match_period` — stoppage time can occur in any period.
- **Examples**: `null`, `3`, `8`, `13`

---

### `match_period`

- **Purpose**: Identifies the phase of the match in which the event occurred. Resolves minute ambiguity during extra time and penalty shootouts.
- **Type**: Enum (string)
- **Validation**: Must be present on every anchor. Must be consistent with `minute` — e.g., minute `105` cannot be in `FIRST_HALF`.
- **Allowed values**:
  - `FIRST_HALF`
  - `SECOND_HALF`
  - `EXTRA_TIME_1`
  - `EXTRA_TIME_2`
  - `PENALTY_SHOOTOUT`
- **Examples**: `FIRST_HALF`, `SECOND_HALF`, `EXTRA_TIME_1`

---

### `event_type`

- **Purpose**: Categorical discriminator. Determines how the anchor is processed, styled, and weighted during timeline conversion.
- **Type**: Enum (string)
- **Validation**: Must be one of the supported types. Extensible via opt-in future types.
- **Supported values**:
  - `GOAL`
  - `PENALTY`
  - `CARD`
  - `SUBSTITUTION`
  - `MOMENTUM_SHIFT`
  - `PRESSURE_SURGE`
  - `PHASE_CHANGE`
- **Future values** (opt-in):
  - `INJURY`
  - `VAR_DECISION`
  - `CROWD_SURGE`
- **Examples**: `GOAL`, `MOMENTUM_SHIFT`, `PHASE_CHANGE`

---

### `card_type`

- **Purpose**: Identifies the category of disciplinary sanction for CARD anchors. Enables downstream differentiation without parsing `narrative_notes`.
- **Type**: Enum (string) or null
- **Validation**: Required on CARD anchors. Must be null for non-CARD event types. Positioned immediately after `event_type`, before `team`.
- **Allowed values**:
  - `YELLOW` — Standard caution.
  - `SECOND_YELLOW` — Second caution leading to dismissal. Produces a single CARD anchor per the anchor rules.
  - `RED` — Direct red card (dismissal without prior caution).
- **Examples**: `YELLOW`, `SECOND_YELLOW`, `RED`

---

### `team`

- **Purpose**: Identifies the participating side. Context-dependent — the scoring team for `GOAL`, the fouling team for `CARD`, the affected side for `MOMENTUM_SHIFT`.
- **Type**: String or null
- **Validation**: Must match one of the two teams registered for the match. Use `null` for neutral events (e.g., `PHASE_CHANGE`, `VAR_DECISION`).
- **Examples**: `Argentina`, `France`, `null`

---

### `player`

- **Purpose**: Identifies the primary participant. The scorer for `GOAL`, the recipient for `CARD`, the substituted player for `SUBSTITUTION`.
- **Type**: String or null
- **Validation**: Free text full name. Must be null when no individual is directly involved (e.g., `PHASE_CHANGE`, `PRESSURE_SURGE`). Optional for `MOMENTUM_SHIFT`.
- **Examples**: `Lionel Messi`, `Kylian Mbappé`, `null`

---

### `importance`

- **Purpose**: Deterministic weight of the anchor within the match narrative. Controls visual prominence, commentary emphasis, and timeline density downstream. Must be assigned consistently across all matches.
- **Type**: Integer
- **Validation**: `0` – `100`. Assigned from the deterministic scoring table below. Every anchor must carry the score that matches its event category; deviations require documented justification. For GOAL importance, `anchor_rules.md` takes precedence over the scoring table below per ADR-003.
- **Deterministic scoring table**:

| Score | Category | Applicable To |
|---|---|---|
| 100 | Match-defining event | Any event type when it is the single most defining moment of the match |
| 95 | Goal — match-winning or decisive | GOAL (open play, match-winning or decisive) |
| 95 | Goal — converted penalty | GOAL (resulting from a penalty conversion that directly changes the scoreline) |
| 90 | Equalizer | GOAL that draws level |
| 90 | Penalty saved | PENALTY (shot saved by goalkeeper, no goal scored) |
| 90 | Penalty missed | PENALTY (shot off target, no goal scored) |
| 85 | Goal extending lead to 2+ | GOAL that extends the lead to a two-goal margin (per anchor_rules.md, supersedes schema per ADR-003) |
| 85 | Red card | CARD (red) |
| 80 | Major momentum shift | MOMENTUM_SHIFT (clear inflection point) |
| 70 | Penalty awarded | PENALTY (foul, handball, VAR confirmation — pre-kick anchor) |
| 70 | Sustained pressure surge | PRESSURE_SURGE (3+ consecutive attacks or saves) |
| 60 | Tactical phase change | PHASE_CHANGE (structural match state transition) |
| 50 | Substitution | SUBSTITUTION |
| 40 | Yellow card | CARD (yellow) |
| 30 | Contextual narrative marker | MOMENTUM_SHIFT (minor), PRESSURE_SURGE (brief), PHASE_CHANGE |
| 0-9 | Fill / routine event | Kickoff restart, minor injury pause, routine passage |

**PENALTY importance assignment rules**:

- If the penalty is awarded and later converted: the `PENALTY` anchor receives `70`, the paired `GOAL` anchor receives `95`.
- If the penalty is saved: the `PENALTY` anchor receives `90`. No `GOAL` anchor is generated.
- If the penalty is missed: the `PENALTY` anchor receives `90`. No `GOAL` anchor is generated.

- **Examples**: `100`, `95`, `90`, `85`, `80`, `70`, `50`, `40`

---

### `score_after_event`

- **Purpose**: Immutable record of the scoreline immediately after the event resolves. Enables chronological score reconstruction without derived state.
- **Type**: Object with two integer fields
- **Validation**: Both values must be non-negative integers. `home` always refers to the first-listed team, `away` to the second. Must increment by exactly 1 on `GOAL` events for the scoring side. Must NOT change from a `PENALTY` anchor alone — the `GOAL` anchor carries the updated score. Must not change during `PENALTY_SHOOTOUT` — use `shootout_score` instead.
- **Structure**: `{ "home": 2, "away": 1 }`
- **Examples**: `{ "home": 1, "away": 0 }`, `{ "home": 3, "away": 3 }`

---

### `shootout_score`

- **Purpose**: Tracks penalty shootout progression independently from match score. Keeps shootout state isolated from regulation/extra-time scoreline.
- **Type**: Object or null
- **Structure**: `{ "home": 4, "away": 2 }`
- **Validation**: Optional. Must be `null` unless the match reaches a shootout. Must not modify `score_after_event`. Both values must be non-negative integers. Increments by 1 for each successful conversion.
- **Examples**: `{ "home": 4, "away": 2 }`, `null`

---

### `source_confidence`

- **Purpose**: Indicates the reliability level of the narrative anchor's source material. Distinguishes between confirmed, reported, and inferred events.
- **Type**: Enum (string)
- **Validation**: Required. Must be one of the three levels.
- **Allowed values**:
  - `HIGH` — Confirmed by FIFA or equivalent official source plus at least one additional independent source (broadcast, official match report, data feed).
  - `MEDIUM` — Confirmed by a single reputable source (official report, verified broadcast).
  - `LOW` — Derived or inferred narrative event (MOMENTUM_SHIFT, PRESSURE_SURGE, PHASE_CHANGE where no explicit source documents the event; synthesized from multiple secondary sources).
- **Examples**: `HIGH`, `MEDIUM`, `LOW`

---

### `narrative_notes`

- **Purpose**: Factual, observable, source-supported annotation capturing what happened. Provides the deterministic prose foundation for downstream commentary generation.
- **Type**: String
- **Validation**: Plain text. No markdown, no formatting. Must fit a single paragraph (1-3 sentences). Must describe only what happened — factual, observable events that can be verified against source material.
- **Permitted content**: Ball progression, player actions, referee decisions, score state, timing, substitutions, tactical formations (as observed).
- **Prohibited content** (MUST NOT contain):
  - Emotional interpretation — e.g., *"France seize momentum"*, *"Argentina crumble"*
  - Inferred psychology — e.g., *"desperate"*, *"relieved"*, *"confident"*
  - Tactical conclusions — e.g., *"a masterstroke by the manager"*, *"poor defending"*
  - Speculative statements — e.g., *"this could prove decisive"*, *"Mbappé looks dangerous"*
- **Good examples**:
  - *France score twice within two minutes. Mbappé converts from the penalty spot at 80'. Mbappé scores again at 81' — a volley from a Thuram cross.*
  - *Messi places the ball low and left from the penalty spot. Lloris dives right. 1-0 Argentina.*
- **Bad examples**:
  - *France seize momentum and overwhelm Argentina* (emotional interpretation).
  - *Argentina look shell-shocked after the quick double* (inferred psychology).
  - *Deschamps' tactical adjustment changes the game* (tactical conclusion).

---

### `source_references`

- **Purpose**: Attribution trail for every anchor. Enables traceability back to original match reports, broadcast timestamps, or official data feeds.
- **Type**: Array of objects
- **Validation**: Each reference must contain at minimum a `source` (string) and `detail` (string). Timestamps are optional but recommended. At least one reference is required per anchor. For `LOW` confidence anchors, include the secondary sources from which the event was inferred. For `HIGH` confidence anchors, all four primary sources (FIFA.com, BBC Sport, ESPN FC, The Guardian) must be explicitly documented — either as reporting the event or as verified as not reporting it.
- **Structure**:
  ```json
  [
    { "source": "FIFA.com", "detail": "Match Report — 67'", "timestamp": "2022-12-18T18:45:00Z" }
  ]
  ```
- **Examples**:
  - `{ "source": "BBC Sport", "detail": "Live text commentary — minute 80" }`
  - `{ "source": "ESPN FC", "detail": "Not reported" }`
  - `{ "source": "The Guardian", "detail": "Not yet verified" }`

---

## Canonical Markdown Template

```markdown
## Event — {event_type}

| Field | Value |
|---|---|
| **event_id** | `{event_id}` |
| **minute** | {minute} |
| **stoppage_time** | {stoppage_time} |
| **match_period** | {match_period} |
| **event_type** | {event_type} |
| **card_type** | {card_type} |
| **team** | {team} |
| **player** | {player} |
| **importance** | {importance} |
| **score_after_event** | `{ "home": {home}, "away": {away} }` |
| **shootout_score** | `{ "home": {home}, "away": {away} }` |
| **source_confidence** | {source_confidence} |
| **narrative_notes** | {narrative_notes} |
| **source_references** | `[ { "source": "...", "detail": "..." } ]` |
```

---

## Entry 1 — GOAL (converted penalty, first half)

```markdown
## Event — GOAL

| Field | Value |
|---|---|
| **event_id** | `ARG_FRA_2022_023_GOAL` |
| **minute** | 23 |
| **stoppage_time** | `null` |
| **match_period** | FIRST_HALF |
| **event_type** | GOAL |
| **card_type** | `null` |
| **team** | Argentina |
| **player** | Lionel Messi |
| **importance** | 95 |
| **score_after_event** | `{ "home": 1, "away": 0 }` |
| **shootout_score** | `null` |
| **source_confidence** | HIGH |
| **narrative_notes** | Messi places the ball low and left from the penalty spot. Lloris dives right. 1-0 Argentina. The penalty was awarded after Di María was brought down by Dembélé inside the area. |
| **source_references** | `[ { "source": "FIFA.com", "detail": "Match Report — 23'", "timestamp": "2022-12-18T17:23:00Z" }, { "source": "BBC Sport", "detail": "Live text — 23' penalty awarded" }, { "source": "ESPN FC", "detail": "Match timeline — 23'" }, { "source": "The Guardian", "detail": "Minute-by-minute report — 23'" } ]` |
```

---

## Entry 2 — PENALTY anchor (paired with the GOAL above)

```markdown
## Event — PENALTY

| Field | Value |
|---|---|
| **event_id** | `ARG_FRA_2022_023_PENALTY` |
| **minute** | 23 |
| **stoppage_time** | `null` |
| **match_period** | FIRST_HALF |
| **event_type** | PENALTY |
| **card_type** | `null` |
| **team** | Argentina |
| **player** | Lionel Messi |
| **importance** | 70 |
| **score_after_event** | `{ "home": 0, "away": 0 }` |
| **shootout_score** | `null` |
| **source_confidence** | HIGH |
| **narrative_notes** | Penalty awarded after referee Szymon Marciniak points to the spot. Di María was fouled by Dembélé inside the area. Messi takes the ball. |
| **source_references** | `[ { "source": "FIFA.com", "detail": "Match Report — 23'" }, { "source": "BBC Sport", "detail": "Live text — 23' penalty awarded" }, { "source": "ESPN FC", "detail": "Match timeline — 23'" }, { "source": "The Guardian", "detail": "Minute-by-minute report — 23'" } ]` |
```

---

## Entry 3 — MOMENTUM_SHIFT (second half)

```markdown
## Event — MOMENTUM_SHIFT

| Field | Value |
|---|---|
| **event_id** | `ARG_FRA_2022_080_MOMENTUM_SHIFT` |
| **minute** | 80 |
| **stoppage_time** | `null` |
| **match_period** | SECOND_HALF |
| **event_type** | MOMENTUM_SHIFT |
| **card_type** | `null` |
| **team** | France |
| **player** | Kylian Mbappé |
| **importance** | 80 |
| **score_after_event** | `{ "home": 2, "away": 1 }` |
| **shootout_score** | `null` |
| **source_confidence** | MEDIUM |
| **narrative_notes** | France score from the penalty spot. Mbappé converts after a Collado challenge on Kolo Muani inside the area. Scoreline shifts to 2-1. France within one goal. |
| **source_references** | `[ { "source": "FIFA.com", "detail": "Match Report — 80'", "timestamp": "2022-12-18T18:20:00Z" }, { "source": "L'Équipe", "detail": "Minute-by-minute — 80'" } ]` |
```

---

## Entry 4 — PHASE_CHANGE (extra time)

```markdown
## Event — PHASE_CHANGE

| Field | Value |
|---|---|
| **event_id** | `ARG_FRA_2022_090_PHASE_CHANGE` |
| **minute** | 90 |
| **stoppage_time** | `null` |
| **match_period** | SECOND_HALF |
| **event_type** | PHASE_CHANGE |
| **card_type** | `null` |
| **team** | null |
| **player** | null |
| **importance** | 60 |
| **score_after_event** | `{ "home": 3, "away": 3 }` |
| **shootout_score** | `null` |
| **source_confidence** | MEDIUM |
| **narrative_notes** | Full-time whistle. Scoreline level at 3-3. Match proceeds to extra time. Two 15-minute periods will be played. |
| **source_references** | `[ { "source": "FIFA.com", "detail": "Match Report — 90'" } ]` |
```

---

## Entry 5 — PENALTY_SHOOTOUT anchor

```markdown
## Event — GOAL

| Field | Value |
|---|---|
| **event_id** | `ARG_FRA_2022_PSO_04_GOAL` |
| **minute** | 120 |
| **stoppage_time** | `null` |
| **match_period** | PENALTY_SHOOTOUT |
| **event_type** | GOAL |
| **card_type** | `null` |
| **team** | France |
| **player** | Kylian Mbappé |
| **importance** | 95 |
| **score_after_event** | `{ "home": 3, "away": 3 }` |
| **shootout_score** | `{ "home": 4, "away": 2 }` |
| **source_confidence** | HIGH |
| **narrative_notes** | Mbappé converts France's second penalty of the shootout. Places the ball high to the right. Martinez dives left. Shootout score 4-2. |
| **source_references** | `[ { "source": "FIFA.com", "detail": "Match Report — Penalty Shootout" }, { "source": "BBC Sport", "detail": "Live text — shootout round 4" }, { "source": "ESPN FC", "detail": "Penalty shootout log — round 4" }, { "source": "The Guardian", "detail": "Minute-by-minute — shootout round 4" } ]` |
```

---

## Event Creation Rules

### Penalty Event Generation Rule

Every converted penalty generates exactly two narrative anchors:

1. **PENALTY** — records the award of the penalty (whistle, foul, referee decision). `score_after_event` reflects the score BEFORE the kick. Importance: `70`.
2. **GOAL** — records the conversion. `score_after_event` reflects the score AFTER the kick. Importance: `95`.

This rule is mandatory. The two anchors serve different downstream purposes:
- The `PENALTY` anchor drives pre-kick narrative state, pressure context, and referee decision tracking.
- The `GOAL` anchor drives scoreline state and match timeline events.

**Example**: Messi's 23rd-minute penalty produces both `ARG_FRA_2022_023_PENALTY` (importance 70) and `ARG_FRA_2022_023_GOAL` (importance 95).

Missed or saved penalties produce a `PENALTY` anchor only. The `GOAL` anchor is not generated. Importance: `90`. `narrative_notes` must document the miss or save outcome.

### Shootout Penalty Rule

Penalties during a `PENALTY_SHOOTOUT` period also produce two anchors per the Penalty Event Generation Rule, with the following distinctions:
- `match_period` must be `PENALTY_SHOOTOUT`
- `score_after_event` must remain at the full-time score (e.g., `{ "home": 3, "away": 3 }`).
- `shootout_score` tracks the shootout progression.
- `event_id` uses `PSO` instead of minute (e.g., `ARG_FRA_2022_PSO_04_GOAL` for the fourth round).
- Importance for shootout PENALTY anchors follows the standard rules: awarded `70`, saved `90`, missed `90`. Importance for shootout GOAL anchors: `95`.

---

## Conversion Contract

Every well-formed narrative anchor must map deterministically to exactly one Kronos timeline object. The conversion rules are:

| Source Field | Target Field | Rule |
|---|---|---|
| `event_id` | `event_id` | Direct copy |
| `minute` | `minute` | Direct copy |
| `stoppage_time` | `stoppage_time` | Direct copy. `null` maps to `null` |
| `match_period` | `match_period` | Direct copy |
| `event_type` | `event_type` | Direct copy. Future types passthrough with warning |
| `card_type` | `card_type` | Direct copy. `null` for non-CARD event types |
| `team` | `team` | Direct copy |
| `player` | `player` | Direct copy |
| `importance` | `weight` | Scaled: `importance / 100` → float `0.0-1.0` |
| `score_after_event` | `score` | Direct copy of `{ home, away }` |
| `shootout_score` | `shootout_score` | Direct copy. `null` maps to `null` |
| `source_confidence` | `confidence` | Direct copy |
| `narrative_notes` | `description` | Direct copy |
| `source_references` | `attribution` | Array converted to comma-separated string or preserved as array per output format |

No anchor field may be dropped, transformed ambiguously, or supplemented with external data during conversion.

---

## Schema Version History

| Version | Changes |
|---|---|
| 2.0 | Initial canonical schema. |
| 2.1 | Added `shootout_score` field. Added future event types. Added Conversion Contract. |
| 2.2 | Updated `event_id` format per ADR-001 (underscore delimiter, stoppage encoding, zero-padding). Added `card_type` as canonical top-level field per ADR-002. Updated importance scoring table per ADR-003 (anchor_rules.md precedence, "Goal extending lead to 2+" = 85). Updated `source_references` validation per ADR-004 (four-source check, "Not reported" convention). Terminology updated to Historical Match Intelligence Pipeline. |
