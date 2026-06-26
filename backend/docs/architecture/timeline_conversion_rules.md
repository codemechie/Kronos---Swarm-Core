# Timeline Conversion Rules

**Document version:** 1.0
**Date:** 2026-06-26
**Status:** Ratified
**Supersedes:** `match_story_schema_v2_1.md §Conversion Contract`

---

## 1. Purpose

Canonical narrative anchors are a human-authorable, source-gated intermediate representation. They are designed for long-term maintainability, manual review, and deterministic transformation. They are not the runtime format.

The runtime consumes **timeline objects** — JSON structures optimised for rendering, animation, audio cue processing, and frontend timeline composition.

This document specifies the deterministic conversion from canonical narrative anchors into Kronos runtime timeline objects. Every converter implementation — whether in Python, TypeScript, or any future language — must conform to this specification exactly.

The conversion is:
- **Lossless**: every canonical field appears in the timeline object, either directly or via a documented transformation.
- **Deterministic**: the same anchor always produces the same timeline object, regardless of converter implementation.
- **Independent**: no external data, AI inference, or runtime state may influence the conversion.
- **Monotonic**: one canonical anchor produces exactly one timeline object. No merging, splitting, or suppression.

---

## 2. Conversion Principles

### 2.1 Deterministic Conversion

Every canonical anchor field maps to exactly one timeline object field via a documented transformation rule. The mapping is computable without consulting any external registry, database, or API.

### 2.2 No External Inference

The converter must not:
- Query external data sources (databases, APIs, files beyond the anchor document).
- Apply machine learning or heuristic inference.
- Interpret `narrative_notes` to derive new fields.
- Supplement missing fields with runtime state.

### 2.3 No AI Generation

Timeline object fields must not be generated or rewritten by AI. The converter is a pure function: anchor in, timeline object out.

### 2.4 No Missing Fields

Every canonical anchor field must be present in the timeline object. Optional canonical fields (`stoppage_time`, `shootout_score`, `card_type`) must be included even when `null`. Runtime-only fields must be populated per the rules in §4.

### 2.5 One-to-One Correspondence

One canonical anchor produces exactly one timeline object. The converter must not:
- Merge multiple anchors into one object (e.g., PENALTY + GOAL must remain two objects).
- Split one anchor into multiple objects.
- Suppress any anchor based on runtime conditions.

---

## 3. Field Mapping Table

### 3.1 Mapping Conventions

| Notation | Meaning |
|---|---|
| Direct copy | Source value written to target unchanged |
| Scaled | Numeric source transformed by a deterministic formula |
| Renamed | Field name changes; value unchanged |
| Computed | Target field derived from source via specified rule |
| Passthrough | Unknown values forwarded without transformation |

Unless otherwise specified, `null` maps to `null`.

---

### 3.2 Field Mapping

#### `event_id`

| Property | Value |
|---|---|
| Source field | `event_id` |
| Target field | `event_id` |
| Transformation | Direct copy |
| Validation | Must be a non-empty string. Must be unique within the match. Must match `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{STOPPAGE}_{EVENT_TYPE}` or `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT_TYPE}` per ADR-001 |
| Example | `ARG_FRA_2022_023_GOAL` → `ARG_FRA_2022_023_GOAL` |

---

#### `minute`

| Property | Value |
|---|---|
| Source field | `minute` |
| Target field | `minute` |
| Transformation | Direct copy |
| Validation | Integer `1`–`120`. For `PENALTY_SHOOTOUT` events, value must be `120` |
| Example | `23` → `23` |

---

#### `stoppage_time`

| Property | Value |
|---|---|
| Source field | `stoppage_time` |
| Target field | `stoppage_time` |
| Transformation | Direct copy |
| Validation | Integer `>= 1` or `null`. Must be `null` for non-stoppage events |
| Example | `7` → `7` |

---

#### `match_period`

| Property | Value |
|---|---|
| Source field | `match_period` |
| Target field | `match_period` |
| Transformation | Direct copy |
| Validation | Must be one of: `FIRST_HALF`, `SECOND_HALF`, `EXTRA_TIME_1`, `EXTRA_TIME_2`, `PENALTY_SHOOTOUT`. Must be consistent with `minute` |
| Example | `FIRST_HALF` → `FIRST_HALF` |

---

#### `event_type`

| Property | Value |
|---|---|
| Source field | `event_type` |
| Target field | `event_type` |
| Transformation | Direct copy |
| Validation | Must be a recognised type (§5). Unknown types pass through with warning. Must not be `null` |
| Example | `GOAL` → `GOAL` |

---

#### `card_type`

| Property | Value |
|---|---|
| Source field | `card_type` |
| Target field | `card_type` |
| Transformation | Direct copy |
| Validation | Must be `YELLOW`, `SECOND_YELLOW`, or `RED` when present. Must be `null` for non-CARD event types. If absent on a CARD anchor, emit `null` |
| Example | `YELLOW` → `YELLOW` |

(Canonical per ADR-002. This field was added to the schema after v2.1. Converters targeting schema v2.1 must tolerate its absence.)

---

#### `team`

| Property | Value |
|---|---|
| Source field | `team` |
| Target field | `team` |
| Transformation | Direct copy |
| Validation | Must match a registered team name or `null`. `null` is valid for neutral event types (`PHASE_CHANGE`, `VAR_DECISION`) |
| Example | `Argentina` → `Argentina` |

---

#### `player`

| Property | Value |
|---|---|
| Source field | `player` |
| Target field | `player` |
| Transformation | Direct copy |
| Validation | Free text or `null`. Must be `null` for `PHASE_CHANGE` and `PRESSURE_SURGE`. Optional for `MOMENTUM_SHIFT` |
| Example | `Lionel Messi` → `Lionel Messi` |

---

#### `importance`

| Property | Value |
|---|---|
| Source field | `importance` |
| Target field | `weight` |
| Transformation | Scaled: `importance / 100` → float in range `0.0`–`1.0`. Must round to 2 decimal places. Floating-point precision must not produce values outside `[0.0, 1.0]` |
| Validation | Source `importance` must be integer `0`–`100`. Target `weight` must be float `0.0`–`1.0`. Reject values outside range |
| Example | `95` → `0.95` |

---

#### `narrative_notes`

| Property | Value |
|---|---|
| Source field | `narrative_notes` |
| Target field | `description` |
| Transformation | Direct copy |
| Validation | Must not be empty. Must be plain text (no markdown). Must fit 1–3 sentences |
| Example | `Messi places the ball low to the left from the penalty spot.` → `Messi places the ball low to the left from the penalty spot.` |

---

#### `source_confidence`

| Property | Value |
|---|---|
| Source field | `source_confidence` |
| Target field | `confidence` |
| Transformation | Direct copy |
| Validation | Must be one of: `HIGH`, `MEDIUM`, `LOW` |
| Example | `HIGH` → `HIGH` |

---

#### `score_after_event`

| Property | Value |
|---|---|
| Source field | `score_after_event` |
| Target field | `score` |
| Transformation | Direct copy of `{ home, away }` object |
| Validation | Both values must be non-negative integers. Must increment by exactly 1 on `GOAL` events for the scoring side. Must not change on events of any other type. Must match `{ "home": <full-time score>, "away": <full-time score> }` during `PENALTY_SHOOTOUT` |
| Example | `{ "home": 2, "away": 1 }` → `{ "home": 2, "away": 1 }` |

---

#### `shootout_score`

| Property | Value |
|---|---|
| Source field | `shootout_score` |
| Target field | `shootout_score` |
| Transformation | Direct copy |
| Validation | Must be `null` unless `match_period` is `PENALTY_SHOOTOUT`. Both values must be non-negative integers. Must not modify `score` |
| Example | `{ "home": 4, "away": 2 }` → `{ "home": 4, "away": 2 }` |

---

#### `source_references`

| Property | Value |
|---|---|
| Source field | `source_references` |
| Target field | `attribution` |
| Transformation | Array of objects copied directly. If the output format requires a string, serialise as comma-separated `"Source: detail"` pairs. The converter may preserve the array structure when targeting JSON output |
| Validation | Each element must have `source` (string) and `detail` (string). At least one element required |
| Example | `[ { "source": "FIFA.com", "detail": "Match Report — 23'" } ]` → `[ { "source": "FIFA.com", "detail": "Match Report — 23'" } ]` |

---

## 4. Runtime Fields

Runtime fields are computed from the canonical anchor during conversion. They have no source equivalent in the anchor format. They control frontend behaviour, rendering, and audio.

| Field | Type | Computation Rule | Example |
|---|---|---|---|
| `weight` | Float `0.0–1.0` | `importance / 100`. Round to 2 decimal places | `0.95` |
| `visible` | Boolean | `true` for all event types except `PHASE_CHANGE` with `importance` <= 30. `false` for fill events (importance 0–9). Default: `true` | `true` |
| `animation` | String or null | Determined by `event_type` per §5 mapping table. `null` when no animation is defined | `"goal_flash"` |
| `audio_trigger` | String or null | Determined by `event_type` per §5 mapping table. `null` when no audio cue is defined | `"crowd_roar"` |
| `timeline_group` | String | Group identifier for frontend timeline filtering. Always present | `"scoreline"` |
| `icon` | String | Icon identifier per event type mapping. Always present | `"goal"` |
| `color` | String | Hex colour string per event type mapping. Always present | `"#00FF88"` |

### 4.1 Runtime Field Derivation Rules

#### `visible`

Controlled by event type and importance.

| Condition | `visible` |
|---|---|
| `event_type` is `GOAL`, `PENALTY`, `CARD`, `SUBSTITUTION` | `true` |
| `event_type` is `MOMENTUM_SHIFT`, `PRESSURE_SURGE`, `PHASE_CHANGE` and `importance` >= 60 | `true` |
| `event_type` is `MOMENTUM_SHIFT`, `PRESSURE_SURGE`, `PHASE_CHANGE` and `importance` >= 30 and < 60 | `true` |
| `importance` 0–9 (fill / routine) | `false` |
| `event_type` is `PHASE_CHANGE` with `importance` <= 30 | `false` (structural markers not rendered) |

#### `timeline_group`

Determined by event type.

| Event Type | `timeline_group` |
|---|---|
| `GOAL` | `scoreline` |
| `PENALTY` | `scoreline` |
| `CARD` | `discipline` |
| `SUBSTITUTION` | `personnel` |
| `MOMENTUM_SHIFT` | `narrative` |
| `PRESSURE_SURGE` | `narrative` |
| `PHASE_CHANGE` | `structure` |

---

## 5. Event Type Mapping

### 5.1 GOAL

| Property | Value |
|---|---|
| `icon` | `goal` |
| `color` | `#00FF88` |
| `animation` | `goal_flash` |
| `audio_trigger` | `crowd_roar` |
| `timeline_group` | `scoreline` |
| `visible` | `true` |

**Additional rules:**
- A `GOAL` that is a converted penalty inherits no special runtime fields beyond the standard `GOAL` mapping. The distinction between open-play goals and penalty conversions is carried by the pairing with a `PENALTY` anchor at the same minute.
- A `GOAL` during `PENALTY_SHOOTOUT` inherits the same mapping but the `animation` field becomes `shootout_goal` and `audio_trigger` becomes `shootout_cymbal`.

---

### 5.2 PENALTY

| Property | Value |
|---|---|
| `icon` | `penalty` |
| `color` | `#FF4444` |
| `animation` | `penalty_award` |
| `audio_trigger` | `whistle` |
| `timeline_group` | `scoreline` |
| `visible` | `true` |

**Additional rules:**
- A `PENALTY` anchor always precedes or is paired with a `GOAL` anchor at the same minute. The converter must not merge them.
- During `PENALTY_SHOOTOUT`, the PENALTY anchor uses `animation`: `shootout_penalty` and `audio_trigger`: `shootout_whistle`.

---

### 5.3 CARD

| Property | Value |
|---|---|
| `icon` | `card_yellow`, `card_red`, or `card_second_yellow` based on `card_type` |
| `color` | `#FFD700` for `YELLOW`, `#FF0000` for `RED`, `#FF6600` for `SECOND_YELLOW` |
| `animation` | `card_flash` |
| `audio_trigger` | `whistle` |
| `timeline_group` | `discipline` |
| `visible` | `true` |

**`icon` selection:**
- `card_type` is `YELLOW` → `card_yellow`
- `card_type` is `RED` → `card_red`
- `card_type` is `SECOND_YELLOW` → `card_second_yellow`
- `card_type` is absent or `null` → `card_yellow` (default)

---

### 5.4 SUBSTITUTION

| Property | Value |
|---|---|
| `icon` | `substitution` |
| `color` | `#888888` |
| `animation` | `substitution_board` |
| `audio_trigger` | `null` |
| `timeline_group` | `personnel` |
| `visible` | `true` |

**Additional rules:**
- The `description` field should include both the player leaving and the player entering. If the canonical anchor only names one player, the converter copies `narrative_notes` verbatim.

---

### 5.5 PRESSURE_SURGE

| Property | Value |
|---|---|
| `icon` | `pressure` |
| `color` | `#FF8800` |
| `animation` | `pressure_pulse` |
| `audio_trigger` | `intensity_rise` |
| `timeline_group` | `narrative` |
| `visible` | `true` when `importance >= 60` |

---

### 5.6 MOMENTUM_SHIFT

| Property | Value |
|---|---|
| `icon` | `momentum` |
| `color` | `#AA44FF` |
| `animation` | `momentum_wave` |
| `audio_trigger` | `momentum_shift` |
| `timeline_group` | `narrative` |
| `visible` | `true` when `importance >= 60` |

---

### 5.7 PHASE_CHANGE

| Property | Value |
|---|---|
| `icon` | `phase_change` |
| `color` | `#4444FF` |
| `animation` | `phase_transition` |
| `audio_trigger` | `phase_chime` |
| `timeline_group` | `structure` |
| `visible` | `true` when `importance >= 60`. `false` when `importance <= 30` |

---

## 6. Validation Rules

### 6.1 Pre-Conversion Validation (Anchor Integrity)

Before conversion begins, the converter must validate the input anchor document against the canonical schema. If any check fails, the converter must reject the document and report the first failure.

| Rule | Check | Failure Action |
|---|---|---|
| V1 | Every anchor has all required fields present | Reject document |
| V2 | Every `event_id` is unique within the document | Reject document |
| V3 | Every `event_type` is a recognised value | Reject document (unknown types fail; see §7 for passthrough) |
| V4 | `minute` is integer `1`–`120` | Reject document |
| V5 | `match_period` is consistent with `minute` (e.g., minute 108 cannot be `FIRST_HALF`) | Reject document |
| V6 | `score_after_event` increments by exactly 1 on `GOAL` events for the scoring side | Reject document |
| V7 | `score_after_event` does not change on non-`GOAL` events | Reject document |
| V8 | `shootout_score` is `null` unless `match_period` is `PENALTY_SHOOTOUT` | Reject document |
| V9 | Every converted penalty has both a `PENALTY` anchor and a `GOAL` anchor at the same minute | Reject document |
| V10 | `source_references` has at least one entry per anchor | Reject document |

### 6.2 Post-Conversion Validation (Timeline Integrity)

After conversion, the converter must validate the output timeline. Failures must be reported but may be downgraded to warnings for non-critical issues.

| Rule | Check | Failure Action |
|---|---|---|
| V11 | Every timeline object has all required fields (`event_id`, `minute`, `event_type`, `weight`, `description`, `confidence`) | Reject object |
| V12 | `weight` is float `0.0`–`1.0` | Reject object |
| V13 | `confidence` is `HIGH`, `MEDIUM`, or `LOW` | Reject object |
| V14 | Runtime fields (`visible`, `animation`, `audio_trigger`, `timeline_group`, `icon`, `color`) are populated according to §4 and §5 | Downgrade to warning — may be populated by default values |
| V15 | Objects are sorted by `(minute, stoppage_time)` ascending | Warn if unsorted |

---

## 7. Future Compatibility

### 7.1 Unknown Event Types

The converter must handle future event types that do not yet appear in §5.

**Behaviour:**

- If an anchor's `event_type` is not recognised, the converter must:
  1. Copy all canonical fields per §3 mappings.
  2. Assign runtime fields from a **default mapping**:

     | Runtime Field | Default Value |
     |---|---|
     | `icon` | `unknown` |
     | `color` | `#CCCCCC` |
     | `animation` | `null` |
     | `audio_trigger` | `null` |
     | `timeline_group` | `unknown` |
     | `visible` | `true` |

  3. Emit a structured warning: `"unrecognised_event_type: {event_type}"`.

- The converter must not reject the document solely because of an unrecognised event type (overrides V3 failure action — downgrade to warning).

- Future schema versions must update §5 of this document before any converter implementation is changed. This ensures the specification remains authoritative.

### 7.2 New Canonical Fields

If a future schema version adds new canonical fields:

- Unknown fields in the source anchor must be copied to the timeline object by name if the output format supports arbitrary keys. If the output format is rigid, unknown fields must be logged and dropped.
- New fields with documented transformations must be added to §3 via a new ADR.

### 7.3 Version Awareness

The converter must read `schema_version` and `anchor_version` from the document-level metadata block. When multiple converter versions exist, the appropriate converter must be selected by these values.

| Header Field | Purpose |
|---|---|
| `schema_version` | Selects the field mapping table version |
| `anchor_version` | Selects the expected anchor format version |

If `schema_version` is higher than the converter's maximum supported version, the converter must reject the document with: `"unsupported_schema_version: {version}"`.

---

## 8. Conversion Contract (Summary Table)

| Source Field | Target Field | Rule |
|---|---|---|
| `event_id` | `event_id` | Direct copy |
| `minute` | `minute` | Direct copy |
| `stoppage_time` | `stoppage_time` | Direct copy. `null` → `null` |
| `match_period` | `match_period` | Direct copy |
| `event_type` | `event_type` | Direct copy. Future types passthrough |
| `card_type` | `card_type` | Direct copy. `null` for non-CARD. Canonical per ADR-002 |
| `team` | `team` | Direct copy |
| `player` | `player` | Direct copy |
| `importance` | `weight` | Scaled: `importance / 100` → float |
| `narrative_notes` | `description` | Direct copy |
| `source_confidence` | `confidence` | Direct copy |
| `score_after_event` | `score` | Direct copy of `{ home, away }` |
| `shootout_score` | `shootout_score` | Direct copy. `null` → `null` |
| `source_references` | `attribution` | Array preserved or serialised per output format |
| *(computed)* | `visible` | §4.1 visibility rules |
| *(computed)* | `animation` | §5 event type mapping |
| *(computed)* | `audio_trigger` | §5 event type mapping |
| *(computed)* | `timeline_group` | §4.1 group rules |
| *(computed)* | `icon` | §5 event type mapping |
| *(computed)* | `color` | §5 event type mapping |

No anchor field may be dropped, transformed ambiguously, or supplemented with external data during conversion.

---

## Document Metadata

| Field | Value |
|---|---|
| **document_version** | `1.0` |
| **schema_version** | `2.1` (extends the Conversion Contract) |
| **ratified_by** | Architecture review (Phase 5.3A) |
| **supersedes** | `match_story_schema_v2_1.md §Conversion Contract` |

---

## Change Log

| Date | Entry | Description |
|---|---|---|
| 2026-06-26 | Initial | Comprehensive conversion specification superseding schema v2.1 Conversion Contract. Added runtime fields, event type mappings, validation rules, and future compatibility |
