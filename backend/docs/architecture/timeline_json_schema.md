# Timeline JSON Schema — Runtime Timeline Contract

**Document version:** 1.0
**Date:** 2026-06-26
**Status:** Ratified
**Supersedes:** `match_story_schema_v2_1.md §Runtime Timeline Contract`

---

## Version Summary

| Version Type | Value |
|---|---|
| **Document Version** | `1.0` — version of this specification document |
| **Runtime Schema Version** | `2.1` — version of the runtime JSON schema that this document defines |
| **Canonical Schema Compatibility** | `2.1` — this runtime schema is compatible with canonical narrative datasets authored against schema v2.1 |

The root JSON field `schema_version` (§3.1) carries the **Runtime Schema Version** (`"2.1"`).

All three versions are independent. A new document version may be published without changing the runtime schema version. A new runtime schema version may be published without changing the canonical schema compatibility.

---

## 1. Purpose

This document is the **Runtime Timeline Contract** between the Timeline Compiler and the Kronos frontend.

The runtime consumes **timeline JSON** — a deterministic, immutable, versioned document produced by the Timeline Compiler from canonical narrative anchors.

The frontend must consume **only** this schema. It must never depend directly on canonical narrative anchors, anchor rules, or extraction plans.

All runtime fields are compiler-generated. No runtime field may require additional inference by the frontend.

---

## Compiler Contract

### Input

Canonical Narrative Dataset

### Output

Runtime Timeline JSON

### Invariants

- Every canonical anchor produces exactly one runtime event.
- No runtime event may exist without a canonical source.
- The compiler performs deterministic transformation only.
- No AI generation.
- No external inference.

---

## Compiler-only Fields

The following fields exist ONLY during extraction and QA and MUST NOT appear in runtime JSON:

- `creation_reason`
- `supporting_signals`
- `pressure_indicators`
- `phase_transition`

These fields are removed during compilation.

---

## 2. Design Principles

| Principle | Definition |
|---|---|
| **Deterministic** | The same canonical dataset always produces identical JSON. No randomness, no AI, no external state. |
| **Immutable** | Once emitted, a timeline document must never be mutated. Updates produce a new document with a new `generation_time`. |
| **Versioned** | Every document carries `schema_version` and `compiler_version`. The frontend selects a parser by version. |
| **Frontend-friendly** | Flat structure, no nested recursion, no optional chains deeper than one level. All values are primitives or simple objects. |
| **Compact** | No redundant fields. Arrays of events, not nested trees. Boolean flags over string enums for runtime hints. |
| **Extensible** | New event types produce a valid timeline object with default visual metadata and a warning. The frontend must tolerate unknown `event_type` values. |
| **Platform-independent** | JSON only. No platform-specific types, no type annotations, no binary encoding. Any standard JSON parser can consume it. |

---

## 3. Root Structure

Every timeline document is a single JSON object with five top-level keys.

```json
{
  "schema_version": "2.1",
  "match_id": "ARG_FRA_2022",
  "match": { ... },
  "timeline": [ ... ],
  "metadata": { ... }
}
```

### 3.1 `schema_version`

| Property | Value |
|---|---|
| **Purpose** | Identifies the JSON schema version. The frontend uses this to select the correct parser. |
| **Type** | String (semantic version) |
| **Validation** | Required. Must match a supported version. Reject on mismatch. |
| **Default** | `"2.1"` |
| **Example** | `"2.1"` |

### 3.2 `match_id`

| Property | Value |
|---|---|
| **Purpose** | Unique match identifier. Links the timeline document to its source dataset. |
| **Type** | String |
| **Validation** | Required. Must match `{HOME}_{AWAY}_{YEAR}`. |
| **Default** | (none) |
| **Example** | `"ARG_FRA_2022"` |

### 3.3 `match`

| Property | Value |
|---|---|
| **Purpose** | Match-level metadata. Static data about the fixture. |
| **Type** | Object |
| **Validation** | Required. Must contain `home_team`, `away_team`, `date`, `competition`, `venue`. |
| **Default** | (none) |
| **Example** | See §3.3.1 |

#### 3.3.1 `match` Object Fields

| Field | Type | Purpose | Example |
|---|---|---|---|
| `home_team` | String | Home side name | `"Argentina"` |
| `away_team` | String | Away side name | `"France"` |
| `date` | String (ISO 8601) | Match date | `"2022-12-18"` |
| `competition` | String | Tournament name | `"FIFA World Cup Final"` |
| `venue` | String | Stadium name | `"Lusail Stadium"` |
| `home_score` | Integer | Full-time home score | `3` |
| `away_score` | Integer | Full-time away score | `3` |
| `home_shootout_score` | Integer or null | Shootout home score | `4` |
| `away_shootout_score` | Integer or null | Shootout away score | `2` |

All fields are required. `home_shootout_score` and `away_shootout_score` are `null` when no shootout occurred.

### 3.4 `timeline`

| Property | Value |
|---|---|
| **Purpose** | Ordered array of timeline event objects. Every canonical anchor produces exactly one entry. |
| **Type** | Array of objects |
| **Validation** | Required. Must contain at least one event. Must be sorted by `(minute, stoppage_time)` ascending. All `id` values must be unique. |
| **Default** | `[]` |
| **Example** | See §4 |

### 3.5 `metadata`

| Property | Value |
|---|---|
| **Purpose** | Compiler-generated provenance data. Not derived from canonical anchors. |
| **Type** | Object |
| **Validation** | Required. Must contain `generation_time`, `compiler_version`, `source_dataset`, `total_events`, `validation_status`, `schema_version`. |
| **Default** | (none) |
| **Example** | See §7 |

---

## 4. Timeline Event Object

Each event in the `timeline` array is a flat JSON object. All fields below are **required** unless marked as optional.

### 4.1 `id`

| Property | Value |
|---|---|
| **Purpose** | Unique event identifier within the timeline document. Identical to the canonical anchor `event_id`. Enables stable cross-referencing. |
| **Type** | String |
| **Validation** | Required. Must be unique within the document. Must be a non-empty string. |
| **Default** | (none) |
| **Example** | `"ARG_FRA_2022_023_GOAL"` |

#### 4.1.1 Traceability

`Timeline Event.id` is identical to `Canonical Anchor.event_id`.

This guarantees one-to-one traceability from every runtime event back to its canonical source.

No runtime event may lose this relationship.

### 4.2 `minute`

| Property | Value |
|---|---|
| **Purpose** | The minute in match time when the event occurred. The frontend uses this for timeline positioning. |
| **Type** | Integer |
| **Validation** | Required. `1`–`120`. For `PENALTY_SHOOTOUT` events, value must be `120`. |
| **Default** | (none) |
| **Example** | `23` |

### 4.3 `stoppage_time`

| Property | Value |
|---|---|
| **Purpose** | Additional minutes beyond the regulation minute for injury-time events. `null` for non-stoppage events. The frontend displays `minute + stoppage_time` for positioning. |
| **Type** | Integer or null |
| **Validation** | Must be `null` or `>= 1`. Must be `null` for events that occurred in regular time. |
| **Default** | `null` |
| **Example** | `7` |

### 4.4 `match_period`

| Property | Value |
|---|---|
| **Purpose** | Identifies the phase of the match. Resolves ambiguity when the same minute exists in multiple periods (e.g., minute 90 in `SECOND_HALF` vs `FIRST_HALF`). |
| **Type** | Enum (string) |
| **Validation** | Required. Must be one of the allowed values. |
| **Allowed values** | `FIRST_HALF`, `SECOND_HALF`, `EXTRA_TIME_1`, `EXTRA_TIME_2`, `PENALTY_SHOOTOUT` |
| **Default** | (none) |
| **Example** | `"FIRST_HALF"` |

### 4.5 `event_type`

| Property | Value |
|---|---|
| **Purpose** | Categorical discriminator. Determines visual metadata, timeline group, and frontend rendering behaviour. |
| **Type** | Enum (string) |
| **Validation** | Required. If the type is not recognised (future event type), the frontend must apply default visual metadata and display the event. Must not reject the document. |
| **Supported values** | `GOAL`, `PENALTY`, `CARD`, `SUBSTITUTION`, `MOMENTUM_SHIFT`, `PRESSURE_SURGE`, `PHASE_CHANGE` |
| **Future values** | `INJURY`, `VAR_DECISION`, `CROWD_SURGE` (opt-in, forward-compatible) |
| **Default** | (none) |
| **Example** | `"GOAL"` |

### 4.6 `team`

| Property | Value |
|---|---|
| **Purpose** | The participating side. For `GOAL`: the scoring team. For `CARD`: the player's team. For `SUBSTITUTION`: the team making the change. For `PHASE_CHANGE` and `VAR_DECISION`: `null`. |
| **Type** | String or null |
| **Validation** | Must match a registered team name or be `null`. |
| **Default** | `null` |
| **Example** | `"Argentina"` |

### 4.7 `player`

| Property | Value |
|---|---|
| **Purpose** | The primary participant. For `GOAL`: the scorer. For `CARD`: the recipient. For `SUBSTITUTION`: the substituted player. For `PHASE_CHANGE` and `PRESSURE_SURGE`: `null`. |
| **Type** | String or null |
| **Validation** | Free text or `null`. Must be `null` when no individual is directly involved. |
| **Default** | `null` |
| **Example** | `"Lionel Messi"` |

### 4.8 `weight`

| Property | Value |
|---|---|
| **Purpose** | Normalised importance of the event. The frontend uses this to size visual elements, control opacity, and prioritise display. Derived from canonical `importance` as `importance / 100`. |
| **Type** | Float |
| **Validation** | Required. `0.0`–`1.0`. Must round to 2 decimal places. |
| **Default** | (none) |
| **Example** | `0.95` |

### 4.9 `score`

| Property | Value |
|---|---|
| **Purpose** | The scoreline immediately after the event. The frontend displays this on the timeline for score-altering events. |
| **Type** | Object `{ "home": Integer, "away": Integer }` |
| **Validation** | Required. Both values must be non-negative integers. Must increment by exactly 1 on `GOAL` events for the scoring side. Must not change on non-`GOAL` events. Locked at full-time score during `PENALTY_SHOOTOUT`. |
| **Default** | `{ "home": 0, "away": 0 }` |
| **Example** | `{ "home": 1, "away": 0 }` |

### 4.10 `shootout_score`

| Property | Value |
|---|---|
| **Purpose** | Penalty shootout score. Only populated during `PENALTY_SHOOTOUT` match period. `null` otherwise. |
| **Type** | Object `{ "home": Integer, "away": Integer }` or null |
| **Validation** | Must be `null` unless `match_period` is `PENALTY_SHOOTOUT`. Both values must be non-negative integers. |
| **Default** | `null` |
| **Example** | `{ "home": 4, "away": 2 }` |

### 4.11 `description`

| Property | Value |
|---|---|
| **Purpose** | Human-readable narrative of the event. Displayed in the timeline event card or tooltip. Derived from canonical `narrative_notes`. |
| **Type** | String |
| **Validation** | Required. Must not be empty. Plain text only (no markdown). 1–3 sentences. |
| **Default** | (none) |
| **Example** | `"Messi places the ball low to the left from the penalty spot. Lloris dives right. 1-0 Argentina."` |

### 4.12 `confidence`

| Property | Value |
|---|---|
| **Purpose** | Confidence level of the anchor extraction. Informs the frontend whether to display certainty indicators. |
| **Type** | Enum (string) |
| **Validation** | Required. Must be one of the allowed values. |
| **Allowed values** | `HIGH`, `MEDIUM`, `LOW` |
| **Default** | `HIGH` |
| **Example** | `"HIGH"` |

### 4.13 `timeline_group`

| Property | Value |
|---|---|
| **Purpose** | Group identifier for frontend timeline filtering and legend display. The frontend may allow users to show/hide entire groups. |
| **Type** | Enum (string) |
| **Validation** | Required. Must be one of the allowed values. Determined by `event_type` per §5. |
| **Allowed values** | `MATCH_STATE`, `GOAL_EVENTS`, `DISCIPLINE`, `TACTICAL`, `PRESSURE`, `MOMENTUM`, `STRUCTURE` |
| **Default** | `MATCH_STATE` (unknown event types default to match state) |
| **Example** | `"GOAL_EVENTS"` |

### 4.14 `icon`

| Property | Value |
|---|---|
| **Purpose** | Icon identifier for visual rendering. Maps to a sprite or SVG in the frontend asset system. |
| **Type** | String |
| **Validation** | Required. Must be a recognised icon identifier. Unknown values use `"unknown"` icon. |
| **Default** | `"unknown"` |
| **Example** | `"goal"` |

### 4.15 `color`

| Property | Value |
|---|---|
| **Purpose** | Hex colour string for visual rendering. The frontend uses this for event markers, cards, and legend items. |
| **Type** | String (hex colour) |
| **Validation** | Required. Must be a 6-character hex colour prefixed with `#`. |
| **Default** | `"#CCCCCC"` |
| **Example** | `"#00FF88"` |

### 4.16 `animation`

| Property | Value |
|---|---|
| **Purpose** | Animation identifier for timeline entry entrance effects. `null` when no animation is defined. |
| **Type** | String or null |
| **Validation** | Must be a recognised animation key or `null`. |
| **Default** | `null` |
| **Example** | `"goal_flash"` |

### 4.17 `audio_trigger`

| Property | Value |
|---|---|
| **Purpose** | Audio cue identifier. The frontend plays the associated sound when the event becomes visible. `null` when no audio cue is defined. |
| **Type** | String or null |
| **Validation** | Must be a recognised audio cue key or `null`. |
| **Default** | `null` |
| **Example** | `"crowd_roar"` |

### 4.18 `visible`

| Property | Value |
|---|---|
| **Purpose** | Whether the event should be rendered on the timeline by default. The frontend may still expose hidden events through a toggle. |
| **Type** | Boolean |
| **Validation** | Required. Determined by `event_type` and `weight` per §4.18.1. |
| **Default** | `true` |
| **Example** | `true` |

#### 4.18.1 `visible` Derivation

| Condition | `visible` |
|---|---|
| `event_type` is `GOAL`, `PENALTY`, `CARD`, `SUBSTITUTION` | `true` |
| `event_type` is `MOMENTUM_SHIFT`, `PRESSURE_SURGE`, `PHASE_CHANGE` and `weight >= 0.60` | `true` |
| `event_type` is `MOMENTUM_SHIFT`, `PRESSURE_SURGE`, `PHASE_CHANGE` and `weight >= 0.30 and < 0.60` | `true` |
| `weight < 0.10` (fill / routine events) | `false` |
| `event_type` is `PHASE_CHANGE` with `weight <= 0.30` | `false` (structural markers not rendered) |

### 4.19 `runtime_flags`

| Property | Value |
|---|---|
| **Purpose** | Compiler-generated runtime metadata flags. These are NOT derived from canonical anchors. They are computed deterministically from `event_type`, `weight`, and predefined runtime rules. |
| **Type** | Object |
| **Validation** | Required. Must contain all six flags. Each flag must be a boolean. |
| **Default** | `{ "is_key_event": false, "is_highlight": false, "is_commentary_trigger": false, "show_on_timeline": true, "include_in_replay": true, "requires_user_attention": false }` |
| **Example** | See §4.19.1 |

#### 4.19.1 `runtime_flags` Fields

```json
{
  "is_key_event": true,
  "is_highlight": true,
  "is_commentary_trigger": true,
  "show_on_timeline": true,
  "include_in_replay": true,
  "requires_user_attention": false
}
```

| Flag | Purpose | Typical `true` Conditions |
|---|---|---|
| `is_key_event` | The event is a primary match-defining moment. Goals, penalties awarded, red cards, and major momentum shifts. The frontend may use this to pin events to a summary view. | `weight >= 0.70` and `event_type` is `GOAL`, `PENALTY`, `CARD` (red), or `MOMENTUM_SHIFT` |
| `is_highlight` | The event is highlight-reel material. The frontend may use this for auto-generated highlight reels or clip recommendations. | `event_type` is `GOAL` with `weight >= 0.90`, or `MOMENTUM_SHIFT` with `weight >= 0.80`, or any `CARD` with `card_type` of `RED` |
| `is_commentary_trigger` | The event warrants automated commentary insertion or live text update. The frontend may use this to trigger a commentary widget. | All `GOAL` and `PENALTY` events. `MOMENTUM_SHIFT` with `weight >= 0.70`. `PHASE_CHANGE` with `phase_transition` of `HALF_TIME` or `FULL_TIME`. |
| `show_on_timeline` | Whether the event appears on the main timeline by default. Mirrors `visible` for frontend convenience. | Same as `visible` deration (§4.18.1) |
| `include_in_replay` | Whether the event should be included in match replay sequences. | All `GOAL`, `PENALTY`, `CARD` events. `MOMENTUM_SHIFT` with `weight >= 0.60`. `PRESSURE_SURGE` with `weight >= 0.60`. |
| `requires_user_attention` | The event demands user interaction or acknowledgment. Reserved for `VAR_DECISION` (future), controversial calls, or match-stopping events. | `event_type` is `VAR_DECISION`. Red cards during `PENALTY_SHOOTOUT`. (Currently unused in v2.1) |

#### 4.19.2 Critical Rule

`runtime_flags` are **compiler-generated runtime metadata**. They MUST NOT exist in the canonical narrative anchor dataset. No anchor field maps to `runtime_flags`. The flags are computed deterministically from `event_type`, `weight`, and predefined runtime rules. The Timeline Compiler performs no additional inference when generating `runtime_flags`.

---

## 5. Timeline Groups

Timeline groups define the high-level categorisation of events for frontend filtering, legend display, and accessibility.

### 5.1 Group Definitions

| Group | Event Types | Purpose | Default Visible |
|---|---|---|---|
| `MATCH_STATE` | `PHASE_CHANGE` | Structural match events: kickoff, half-time, full-time, extra time periods, penalty shootout | Yes (if weight >= 0.60) |
| `GOAL_EVENTS` | `GOAL`, `PENALTY` | All goal-scoring events and penalty awards | Yes |
| `DISCIPLINE` | `CARD` | Yellow cards, red cards, second yellows | Yes |
| `TACTICAL` | `SUBSTITUTION` | Player substitutions and tactical changes | Yes |
| `PRESSURE` | `PRESSURE_SURGE` | Sustained attacking pressure sequences | Yes (if weight >= 0.60) |
| `MOMENTUM` | `MOMENTUM_SHIFT` | Momentum shifts and match control reversals | Yes (if weight >= 0.60) |
| `STRUCTURE` | (none in v2.1) | Reserved for future structural annotations (formation changes, tactical restructures) | Yes |

### 5.2 Group Mapping

| `event_type` | `timeline_group` |
|---|---|
| `GOAL` | `GOAL_EVENTS` |
| `PENALTY` | `GOAL_EVENTS` |
| `CARD` | `DISCIPLINE` |
| `SUBSTITUTION` | `TACTICAL` |
| `MOMENTUM_SHIFT` | `MOMENTUM` |
| `PRESSURE_SURGE` | `PRESSURE` |
| `PHASE_CHANGE` | `MATCH_STATE` |
| Unknown / future | `MATCH_STATE` (default) |

### 5.3 Frontend Responsibilities

- The frontend must provide a group toggle UI for all groups.
- When a group is hidden, all events in that group must be removed from the timeline display.
- Groups with zero visible events (all events have `visible: false`) should still appear in the legend but be greyed out.
- The frontend must tolerate unknown group values and display them under an "Other" legend entry.

---

## 6. Visual Metadata

Visual metadata is determined exclusively by `event_type`. The Timeline Compiler applies these mappings during conversion.

### 6.1 GOAL

| Property | Value |
|---|---|
| `icon` | `goal` |
| `color` | `#00FF88` |
| `animation` | `goal_flash` |
| `audio_trigger` | `crowd_roar` |
| `timeline_group` | `GOAL_EVENTS` |

**Penalty shootout override:** `animation` becomes `shootout_goal`, `audio_trigger` becomes `shootout_cymbal`.

### 6.2 PENALTY

| Property | Value |
|---|---|
| `icon` | `penalty` |
| `color` | `#FF4444` |
| `animation` | `penalty_award` |
| `audio_trigger` | `whistle` |
| `timeline_group` | `GOAL_EVENTS` |

**Penalty shootout override:** `animation` becomes `shootout_penalty`, `audio_trigger` becomes `shootout_whistle`.

### 6.3 CARD

| Property | Value |
|---|---|
| `icon` | `card_yellow`, `card_red`, or `card_second_yellow` — determined by `card_type` |
| `color` | `#FFD700` (YELLOW), `#FF0000` (RED), `#FF6600` (SECOND_YELLOW) |
| `animation` | `card_flash` |
| `audio_trigger` | `whistle` |
| `timeline_group` | `DISCIPLINE` |

**`icon` selection:**

| `card_type` | `icon` |
|---|---|
| `YELLOW` | `card_yellow` |
| `RED` | `card_red` |
| `SECOND_YELLOW` | `card_second_yellow` |
| absent or `null` | `card_yellow` (default) |

### 6.4 SUBSTITUTION

| Property | Value |
|---|---|
| `icon` | `substitution` |
| `color` | `#888888` |
| `animation` | `substitution_board` |
| `audio_trigger` | `null` |
| `timeline_group` | `TACTICAL` |

### 6.5 PRESSURE_SURGE

| Property | Value |
|---|---|
| `icon` | `pressure` |
| `color` | `#FF8800` |
| `animation` | `pressure_pulse` |
| `audio_trigger` | `intensity_rise` |
| `timeline_group` | `PRESSURE` |

### 6.6 MOMENTUM_SHIFT

| Property | Value |
|---|---|
| `icon` | `momentum` |
| `color` | `#AA44FF` |
| `animation` | `momentum_wave` |
| `audio_trigger` | `momentum_shift` |
| `timeline_group` | `MOMENTUM` |

### 6.7 PHASE_CHANGE

| Property | Value |
|---|---|
| `icon` | `phase_change` |
| `color` | `#4444FF` |
| `animation` | `phase_transition` |
| `audio_trigger` | `phase_chime` |
| `timeline_group` | `MATCH_STATE` |

### 6.8 Unknown / Future Event Type

| Property | Value |
|---|---|
| `icon` | `unknown` |
| `color` | `#CCCCCC` |
| `animation` | `null` |
| `audio_trigger` | `null` |
| `timeline_group` | `MATCH_STATE` |

---

## 7. Metadata Object

The `metadata` object is compiler-generated provenance data. It is not derived from canonical anchors.

### 7.1 Fields

| Field | Type | Purpose | Example |
|---|---|---|---|
| `generation_time` | String (ISO 8601) | Timestamp of document generation | `"2026-06-26T12:00:00Z"` |
| `compiler_version` | String (semantic version) | Version of the Timeline Compiler | `"1.0.0"` |
| `source_dataset` | String | File name of the canonical dataset used as input | `"argentina_france_2022_source.md"` |
| `total_events` | Integer | Total number of events in the timeline array | `42` |
| `validation_status` | String | Result of post-conversion validation | `"PASS"` |
| `schema_version` | String (semantic version) | JSON schema version (same as root `schema_version`) | `"2.1"` |

### 7.2 Example

```json
{
  "generation_time": "2026-06-26T12:00:00Z",
  "compiler_version": "1.0.0",
  "source_dataset": "argentina_france_2022_source.md",
  "total_events": 42,
  "validation_status": "PASS",
  "schema_version": "2.1"
}
```

---

## 8. Validation Rules

### 8.1 Document-Level Validation

Performed by the Timeline Compiler after conversion, before emission.

| Rule | Check | Failure Action |
|---|---|---|
| V1 | `schema_version` is a supported version | Reject document |
| V2 | `match_id` matches the source dataset | Reject document |
| V3 | `match` contains all required fields | Reject document |
| V4 | `timeline` is a non-empty array | Reject document |
| V5 | `metadata` contains all required fields | Reject document |

### 8.2 Event-Level Validation

| Rule | Check | Failure Action |
|---|---|---|
| V6 | All `id` values are unique | Reject document |
| V7 | Events are sorted by `(minute, stoppage_time)` ascending with `null` sorted before values | Warn if unsorted; reject if major disorder |
| V8 | `score.home` and `score.away` are non-negative integers | Reject event |
| V9 | `score` increments by exactly 1 on `GOAL` events for the scoring side | Reject document |
| V10 | `score` does not change on non-`GOAL` events | Reject document |
| V11 | `shootout_score` is `null` unless `match_period` is `PENALTY_SHOOTOUT` | Reject document |
| V12 | `weight` is float `0.0`–`1.0` | Reject event |
| V13 | `confidence` is `HIGH`, `MEDIUM`, or `LOW` | Reject event |
| V14 | `match_period` is consistent with `minute` (e.g., minute 108 cannot be `FIRST_HALF`) | Reject document |
| V15 | `runtime_flags` contains all six required flags, each boolean | Reject event |
| V16 | `visible` matches the deration rules in §4.18.1 | Downgrade to warning |

### 8.3 Frontend Validation

The frontend must not reject a document for warnings. It may log warnings for debugging.

| Rule | Check | Action |
|---|---|---|
| F1 | Unknown `event_type` values use default visual metadata | Log warning, render with defaults |
| F2 | Unknown `timeline_group` values display under "Other" | Log warning, display in "Other" group |
| F3 | Missing optional fields (`stoppage_time`, `shootout_score`) are treated as `null` | Graceful fallback |
| F4 | `runtime_flags` keys beyond the six defined flags are ignored | Silent ignore |

---

## 9. Versioning

### 9.1 Schema Version Policy

| Policy | Rule |
|---|---|
| **Backward compatible** | New schema versions must not remove, rename, or change the type of any existing field. Only additive changes are permitted. |
| **Forward compatible** | The frontend must tolerate unknown `event_type` values, unknown `timeline_group` values, and additional keys in any object. |
| **Version selection** | The frontend reads `schema_version` from the document root and selects the appropriate parser. If the version is higher than supported, the frontend must attempt to render with the nearest lower version, ignoring unknown fields. |
| **Compiler version** | `compiler_version` is informational. The frontend must not reject a document based on `compiler_version`. |

### 9.2 Adding New Fields

| Action | Allowed |
|---|---|
| Add a new optional field to the timeline event object | Yes |
| Add a new required field to the timeline event object | No (breaking change) |
| Add a new event type to `event_type` | Yes (frontend uses defaults) |
| Add a new timeline group | Yes (frontend displays under "Other") |
| Add new fields to `match` object | Yes, optional fields only |
| Change type of an existing field | No (breaking change) |
| Remove an existing field | No (breaking change) |
| Rename an existing field | No (breaking change) |

### 9.3 Schema Version Lifecycle

| Runtime Schema Version | Status | Notes |
|---|---|---|---|
| 2.1 | Current | Initial runtime JSON schema defined by this document (document v1.0) |
| 2.0 | Deprecated | Superseded by v2.1. No longer supported by the Timeline Compiler. |
| 2.2 | Future | Reserved for additions: `card_type` field in timeline event, `VAR_DECISION` event type support, `INJURY` event type support. |

---

## 10. Example Timeline Document

```json
{
  "schema_version": "2.1",
  "match_id": "ARG_FRA_2022",
  "match": {
    "home_team": "Argentina",
    "away_team": "France",
    "date": "2022-12-18",
    "competition": "FIFA World Cup Final",
    "venue": "Lusail Stadium",
    "home_score": 3,
    "away_score": 3,
    "home_shootout_score": 4,
    "away_shootout_score": 2
  },
  "timeline": [
    {
      "id": "ARG_FRA_2022_001_PHASE_CHANGE",
      "minute": 1,
      "stoppage_time": null,
      "match_period": "FIRST_HALF",
      "event_type": "PHASE_CHANGE",
      "team": null,
      "player": null,
      "weight": 0.60,
      "score": { "home": 0, "away": 0 },
      "shootout_score": null,
      "description": "Match kicks off at Lusail Stadium. Argentina in possession. Scoreline 0-0.",
      "confidence": "MEDIUM",
      "timeline_group": "MATCH_STATE",
      "icon": "phase_change",
      "color": "#4444FF",
      "animation": "phase_transition",
      "audio_trigger": "phase_chime",
      "visible": true,
      "runtime_flags": {
        "is_key_event": false,
        "is_highlight": false,
        "is_commentary_trigger": true,
        "show_on_timeline": true,
        "include_in_replay": false,
        "requires_user_attention": false
      }
    },
    {
      "id": "ARG_FRA_2022_023_GOAL",
      "minute": 23,
      "stoppage_time": null,
      "match_period": "FIRST_HALF",
      "event_type": "GOAL",
      "team": "Argentina",
      "player": "Lionel Messi",
      "weight": 0.95,
      "score": { "home": 1, "away": 0 },
      "shootout_score": null,
      "description": "Messi places the ball low to the left from the penalty spot. Lloris dives right. 1-0 Argentina.",
      "confidence": "HIGH",
      "timeline_group": "GOAL_EVENTS",
      "icon": "goal",
      "color": "#00FF88",
      "animation": "goal_flash",
      "audio_trigger": "crowd_roar",
      "visible": true,
      "runtime_flags": {
        "is_key_event": true,
        "is_highlight": true,
        "is_commentary_trigger": true,
        "show_on_timeline": true,
        "include_in_replay": true,
        "requires_user_attention": false
      }
    }
  ],
  "metadata": {
    "generation_time": "2026-06-26T12:00:00Z",
    "compiler_version": "1.0.0",
    "source_dataset": "argentina_france_2022_source.md",
    "total_events": 2,
    "validation_status": "PASS",
    "schema_version": "2.1"
  }
}
```

---

## 11. Compatibility Matrix

| Schema Version | Compiler v1.0.x | Frontend v1.x | Notes |
|---|---|---|---|
| 2.0 | Generates (legacy) | Consumes (legacy) | Deprecated. Missing `runtime_flags`, `metadata`. |
| 2.1 | Generates (native) | Consumes (native) | Current. All features supported. |

### 11.1 Migration Path

When a new schema version is published:

1. The Timeline Compiler is updated to emit the new version.
2. The old version is still emitted on request via `schema_version` parameter.
3. The frontend is updated to support both versions.
4. After the transition period, the old version is deprecated and eventually removed from the compiler.
5. The frontend continues to consume both versions during the transition, selected by `schema_version`.

---

## Document Metadata

| Field | Value |
|---|---|
| **document_version** | `1.0` (version of this specification document) |
| **runtime_schema_version** | `2.1` (version of the runtime JSON schema defined herein) |
| **canonical_schema_compatibility** | `2.1` (this runtime schema is compatible with canonical datasets authored against schema v2.1) |
| **ratified_by** | Architecture review (Phase 5.3C) |
| **precedes** | `timeline_conversion_rules.md` (this schema is the output target of the converter) |

---

## Change Log

| Date | Entry | Description |
|---|---|---|
| 2026-06-26 | Initial | Runtime Timeline Contract. Defined root structure, timeline event object, runtime_flags, timeline groups, visual metadata, metadata object, validation rules, and versioning policy. |
