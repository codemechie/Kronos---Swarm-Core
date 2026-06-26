# Validation Report — argentina_france_2022_source_part1.md

**Audit date:** 2026-06-25
**Document under review:** `backend/docs/argentina_france_2022_source_part1.md`
**Reference schemas:** `match_story_schema_v2_1.md`, `anchor_rules.md`
**Anchors audited:** 17 (6 GOAL, 3 PENALTY, 8 CARD)

---

## 1. Schema Compliance

**Status: WARNING**

### Required fields present
All 17 anchors contain all required fields: event_id, minute, stoppage_time, match_period, event_type, team, player, importance, score_after_event, shootout_score, source_confidence, narrative_notes, source_references.

CARD anchors additionally contain `card_type` — see finding below.

### Valid enum values
- **event_type**: GOAL, PENALTY, CARD — all valid. PASS.
- **match_period**: FIRST_HALF, SECOND_HALF, EXTRA_TIME_1, EXTRA_TIME_2 — all valid enum values. PASS for listed values.
- **source_confidence**: HIGH on all anchors — valid. PASS.
- **card_type**: YELLOW on all 8 CARD anchors — valid value. PASS.

### event_id format — WARNING
The schema convention (v2.1 §event_id) specifies: `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT_TYPE}` with disambiguation suffix `_1`, `_2` for collisions.

Four event IDs use a `{MINUTE}_{STOPPAGE}_{EVENT}` format:
- `ARG_FRA_2022_045_07_CARD`
- `ARG_FRA_2022_090_05_CARD`
- `ARG_FRA_2022_090_08_CARD`
- `ARG_FRA_2022_120_05_CARD`

These IDs are deterministic and collision-free, but they deviate from the published schema convention. A downstream parser expecting the standard `{MINUTE}_{EVENT_TYPE}` format would not recognise these patterns without additional configuration.

| ID | Schema-conformant alternative |
|---|---|
| `045_07_CARD` | `045_CARD` (but collides — would need `_1` disambiguation across stoppage) |
| `090_05_CARD` | `090_CARD` (collides with Acuña at 90+8) |
| `090_08_CARD` | `090_CARD_1` |
| `120_05_CARD` | `120_CARD` |

### match_period validity — ERROR
**Anchor `ARG_FRA_2022_108_GOAL`** (Messi, minute 108) has `match_period: EXTRA_TIME_1`.

According to the match clock convention used by the schema (minute range 1–120):
- EXTRA_TIME_1 spans minutes 90–104 (first 15-minute period)
- EXTRA_TIME_2 spans minutes 105–120 (second 15-minute period)

Minute 108 > 105, therefore it must be `EXTRA_TIME_2`. The current value `EXTRA_TIME_1` is invalid.

### score_after_event validity — PASS
All 17 anchors have valid score_after_event objects. No impossible transitions. See Section 3.

### shootout_score validity — PASS
All anchors have `null`. Correct — this document contains no penalty shootout anchors.

### source_confidence validity — PASS
All anchors are HIGH. All meet the criteria (FIFA-confirmed + at least one independent source).

### card_type validity — WARNING
`card_type` is not defined as a field in schema v2.1. The schema's Narrative Anchor Field Reference (sections event_id through source_references) does not include a `card_type` field. The Conversion Contract (§Conversion Contract) does not map `card_type` to any target field.

The field was added per editorial instruction, but it is an orphan field with no downstream representation. It would be silently dropped during timeline conversion.

The anchor_rules.md (§CARD Creation Criteria) states: "Second yellow cards produce a single CARD anchor with ... `card_type` documented in `detail`" — i.e., within source_references, not as a top-level field.

### source_references completeness — WARNING
GOAL and PENALTY anchors list 4 sources (FIFA, BBC, ESPN, Guardian). CARD anchors list only 2 (FIFA, BBC). The extraction plan states: "Every anchor's source_references array must include all sources that contributed evidence." If ESPN and Guardian reported the card events, they should be included. Their omission is undocumented.

Conversely, if ESPN and Guardian do NOT contain these card events, the Change 5 instruction requires a "Not reported" note — which is absent. The status of these sources for card events is therefore ambiguous.

---

## 2. Chronology

**Status: PASS**

### Chronological ordering
All 17 anchors are in correct chronological sequence:

| # | Event | Minute | Period |
|---|---|---|---|
| 1 | PENALTY Messi | 23 | FIRST_HALF |
| 2 | GOAL Messi | 23 | FIRST_HALF |
| 3 | GOAL Di María | 36 | FIRST_HALF |
| 4 | CARD Fernández | 45+7 | FIRST_HALF |
| 5 | CARD Rabiot | 55 | SECOND_HALF |
| 6 | PENALTY Mbappé | 80 | SECOND_HALF |
| 7 | GOAL Mbappé | 80 | SECOND_HALF |
| 8 | GOAL Mbappé | 81 | SECOND_HALF |
| 9 | CARD Thuram | 87 | SECOND_HALF |
| 10 | CARD Giroud | 90+5 | SECOND_HALF |
| 11 | CARD Acuña | 90+8 | SECOND_HALF |
| 12 | GOAL Messi | 108 | EXTRA_TIME_1* |
| 13 | CARD Paredes | 114 | EXTRA_TIME_2 |
| 14 | CARD Montiel | 116 | EXTRA_TIME_2 |
| 15 | PENALTY Mbappé | 118 | EXTRA_TIME_2 |
| 16 | GOAL Mbappé | 118 | EXTRA_TIME_2 |
| 17 | CARD Martínez | 120+5 | EXTRA_TIME_2 |

\* Period value is disputed — see Schema Compliance ERROR above.

### stoppage_time ordering
Correct: 90+5 (Giroud) precedes 90+8 (Acuña). 120+5 (Martínez) correctly final.

### No impossible minute progression
All minutes increase monotonically. No duplicates except paired PENALTY+GOAL at same minute (permitted per Penalty Event Generation Rule).

### No duplicate chronology
No two anchors share the same minute, type, team, and player.

---

## 3. Score Progression

**Status: PASS**

| Anchor | Score after event | Delta | Valid? |
|---|---|---|---|
| (kickoff) | 0–0 | — | — |
| PENALTY 23' | 0–0 | — | ✅ (pre-kick, no change) |
| GOAL 23' (Messi, ARG) | 1–0 | ARG +1 | ✅ |
| GOAL 36' (Di María, ARG) | 2–0 | ARG +1 | ✅ |
| CARD 45+7' | 2–0 | — | ✅ |
| CARD 55' | 2–0 | — | ✅ |
| PENALTY 80' | 2–0 | — | ✅ (pre-kick, no change) |
| GOAL 80' (Mbappé, FRA) | 2–1 | FRA +1 | ✅ |
| GOAL 81' (Mbappé, FRA) | 2–2 | FRA +1 | ✅ |
| CARD 87' | 2–2 | — | ✅ |
| CARD 90+5' | 2–2 | — | ✅ |
| CARD 90+8' | 2–2 | — | ✅ |
| GOAL 108' (Messi, ARG) | 3–2 | ARG +1 | ✅ |
| CARD 114' | 3–2 | — | ✅ |
| CARD 116' | 3–2 | — | ✅ |
| PENALTY 118' | 3–2 | — | ✅ (pre-kick, no change) |
| GOAL 118' (Mbappé, FRA) | 3–3 | FRA +1 | ✅ |
| CARD 120+5' | 3–3 | — | ✅ |

Scoreline: 0–0 → 1–0 → 2–0 → 2–1 → 2–2 → 3–2 → 3–3. All transitions valid. No impossible jumps.

---

## 4. Event IDs

**Status: WARNING**

### Uniqueness — PASS
All 17 event IDs are unique within the document. No collisions.

### Deterministic formatting — WARNING
See Schema Compliance above. Four IDs use `{MINUTE}_{STOPPAGE}_{EVENT}` instead of `{MINUTE}_{EVENT_TYPE}` + `_1`/`_2` suffix. While deterministic, this custom format is not part of the schema specification and requires downstream parser support.

### No collisions — PASS
All IDs resolve to distinct events.

### No missing IDs — PASS
Every anchor has a valid event_id.

---

## 5. Importance

**Status: WARNING**

| Anchor | Assigned | Expected (schema v2.1) | Expected (anchor_rules.md) | Verdict |
|---|---|---|---|---|
| PENALTY 23' | 70 | 70 (awarded, later converted) | 70 | ✅ PASS |
| GOAL 23' (converted pen) | 95 | 95 (converted penalty) | 95 | ✅ PASS |
| **GOAL 36' (Di María)** | **90** | **90 (major game-changing)** | **85 (extends lead to 2+)** | **⚠️ WARNING** |
| GOAL 80' (converted pen) | 95 | 95 (converted penalty) | 95 | ✅ PASS |
| GOAL 81' (equalizer) | 90 | 90 (equalizer) | 90 | ✅ PASS |
| GOAL 108' (extra time) | 95 | 90–95 (extra-time goal) | 90–95 | ✅ PASS |
| GOAL 118' (converted pen) | 95 | 95 (converted penalty) | 95 | ✅ PASS |
| PENALTY 80' | 70 | 70 | 70 | ✅ PASS |
| PENALTY 118' | 70 | 70 | 70 | ✅ PASS |
| CARD Fernández (tactical foul) | 40 | 40 (yellow) | 40 (tactical foul) | ✅ PASS |
| CARD Rabiot (tactical foul) | 40 | 40 (yellow) | 40 (tactical foul) | ✅ PASS |
| CARD Thuram (simulation) | 30 | 30 (contextual/simulation) | 30 (unsporting) | ✅ PASS |
| CARD Giroud (dissent) | 30 | 30 (contextual/dissent) | 30 (dissent) | ✅ PASS |
| CARD Acuña (tactical foul) | 40 | 40 (yellow) | 40 (tactical foul) | ✅ PASS |
| CARD Paredes (tactical foul) | 40 | 40 (yellow) | 40 (tactical foul) | ✅ PASS |
| CARD Montiel (handball) | 40 | 40 (yellow) | 40 (tactical foul) | ✅ PASS |
| CARD Martínez (post-match) | 20 | — (not in schema table) | 20 (post-match) | ✅ PASS |

### GOAL 36' finding — WARNING
The schema v2.1 deterministic scoring table lists:
- `90` = "Equalizer or major game-changing event | GOAL that draws level or swings control"

The anchor_rules.md (§Importance Guidelines for GOAL) lists:
- `85` = "Goal that extends lead to 2+"

Di María's goal extends Argentina's lead from 1–0 to 2–0. This matches the anchor_rules.md entry (85) specifically. The schema entry (90 for "swings control") is broader and could also apply. The two documents disagree for this exact scenario.

The document assigns 90, relying on the schema's broader category. The anchor_rules.md, which provides more granular guidance, indicates 85. This is a documented ambiguity between the two reference documents.

### CARD Martínez finding — NOTE
The schema's deterministic scoring table does not list an entry for post-match cards (importance 20). The anchor_rules.md lists "Post-match card | 20" in its CARD Importance Guidelines. The value is correct per anchor_rules.md but has no corresponding entry in the schema table.

---

## 6. Confidence

**Status: PASS**

All 17 anchors are assigned HIGH. Verified against HIGH criteria from anchor_rules.md (§Confidence Assignment Rules):

| Criterion | Met? |
|---|---|
| Event confirmed by FIFA or equivalent official source | ✅ All anchors trace to FIFA match report |
| At least one additional independent source | ✅ All anchors have BBC; GOAL/PENALTY also have ESPN/Guardian |
| Minute, period, team, player unambiguous | ✅ |
| Event type is GOAL, PENALTY, or CARD | ✅ |

No HIGH→MEDIUM or HIGH→LOW downgrade conditions apply (no timing disagreements ≥3 minutes, no inferred event types).

---

## 7. Narrative Notes

**Status: PASS**

All 17 anchors' narrative_notes were reviewed against the prohibited content rules from schema v2.1 (§narrative_notes):

| Prohibited content | Found? |
|---|---|
| Emotional interpretation | ❌ None found |
| Inferred psychology | ❌ None found |
| Tactical conclusions | ❌ None found |
| Speculative statements | ❌ None found |

All notes are factual, observable, and can be verified against source material. Each fits within 1–3 sentences.

---

## 8. Source References

**Status: WARNING**

### Source precedence — PASS
FIFA.com is listed first in every anchor's source_references, matching the authoritative source hierarchy.

### Missing references — PASS
Every anchor has at least one source_reference (minimum: FIFA + BBC).

### Duplicate references — PASS
No source appears more than once within any anchor's reference list.

### Attribution consistency — WARNING
GOAL and PENALTY anchors consistently list 4 sources:
1. FIFA.com
2. BBC Sport
3. ESPN FC
4. The Guardian

CARD anchors list only 2 sources:
1. FIFA.com
2. BBC Sport

This creates an inconsistency. The extraction plan (§Attribution Retention) states: "Every anchor's source_references array must include all sources that contributed evidence." If ESPN and The Guardian covered the card events in their match timelines (as they likely did for a World Cup Final), they should be included. If they did not cover specific cards, a "Not reported" note should document verified absence per Change 5 instructions.

The current state is ambiguous — it does not distinguish between "source absent" and "source not checked."

---

## 9. Internal Consistency

**Status: WARNING**

### Player names — PASS
All player names use FIFA-standard spelling:
- Lionel Messi ✅
- Ángel Di María ✅
- Kylian Mbappé ✅
- Enzo Fernández ✅
- Adrien Rabiot ✅
- Marcus Thuram ✅
- Olivier Giroud ✅
- Marcos Acuña ✅
- Leandro Paredes ✅
- Gonzalo Montiel ✅
- Emiliano Martínez ✅

### Team names — PASS
"Argentina" and "France" used consistently. Home/away convention in score_after_event is correct (Argentina = home, France = away).

### card_type — PASS
All 8 CARD anchors have `card_type: YELLOW`. No red cards or second-yellow dismissals occurred in this match.

### event_type — PASS
All event_type values are valid enum members. ✅

### match_period — ERROR
As noted in Section 1, the anchor at minute 108 uses `EXTRA_TIME_1` but should be `EXTRA_TIME_2`.

All other match_period values are consistent with their minute values:
- 23, 36, 45 → FIRST_HALF ✅
- 55, 80, 81, 87, 90 → SECOND_HALF ✅
- 108 → EXTRA_TIME_1 ❌ (should be EXTRA_TIME_2)
- 114, 116, 118, 120 → EXTRA_TIME_2 ✅

---

## Summary

| Category | PASS | WARNING | ERROR |
|---|---|---|---|
| 1. Schema Compliance | — | 3 | 1 |
| 2. Chronology | 4 | — | — |
| 3. Score Progression | 1 | — | — |
| 4. Event IDs | 3 | 1 | — |
| 5. Importance | 15 | 1 | — |
| 6. Confidence | 1 | — | — |
| 7. Narrative Notes | 1 | — | — |
| 8. Source References | 3 | 1 | — |
| 9. Internal Consistency | 4 | — | 1 |

| Metric | Count |
|---|---|
| PASS | 32 |
| WARNING | 7 |
| ERROR | 2 |

### Errors
| # | Finding | Location | Impact |
|---|---|---|---|
| E1 | `match_period` = EXTRA_TIME_1 for minute 108, should be EXTRA_TIME_2 | Line 239 | Would produce incorrect timeline phase assignment. Affects 1 anchor. |
| E2 | `match_period` EXTRA_TIME_1 for minute 108 violates schema rule "must be consistent with minute" | Line 239 | Downstream timeline converter would either reject or misplace the anchor. |

### Warnings
| # | Finding | Location | Impact |
|---|---|---|---|
| W1 | `card_type` field not defined in schema v2.1; orphan during conversion | All CARD anchors | No timeline impact; field silently dropped |
| W2 | Event ID format `{MINUTE}_{STOPPAGE}_{EVENT}` deviates from schema convention | Lines 76, 199, 220, 343 | Deterministic but non-standard; requires parser override |
| W3 | Importance 90 for GOAL 36' (Di María) vs anchor_rules 85 for "extends lead to 2+" | Line 63 | Ambiguity between schema and anchor_rules; choose canonical source |
| W4 | CARD source_references incomplete vs GOAL/PENALTY; ESPN/Guardian status undocumented | Lines 89, 110, 191, 212, 233, 274, 295, 356 | Verified vs unverified coverage not distinguished |

---

## Overall Status

**REQUIRES CORRECTION**

2 errors found — both stemming from the same incorrect `match_period` assignment for minute 108.

Resolution priority:
1. **E1/E2**: Change `EXTRA_TIME_1` to `EXTRA_TIME_2` for anchor `ARG_FRA_2022_108_GOAL` (line 239)
2. **W4**: Either add ESPN/Guardian to CARD source_references or append "Not reported" notes to document verified absence
3. **W2/W3/W1**: Accept as design decisions if explicitly documented in match_story_architecture_log.md or project conventions
