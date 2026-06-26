# Validation Report — argentina_france_2022_source_part1.md

**Audit date:** 2026-06-26
**Document:** `backend/docs/argentina_france_2022_source_part1.md`
**Reference documents:** `match_story_schema_v2_1.md`, `anchor_rules.md`
**Anchors:** 17 (6 GOAL, 3 PENALTY, 8 CARD)

---

## 1. Schema Compliance

**Status: WARNING**

| Check | Result |
|---|---|
| Required fields present | PASS — All 17 anchors contain all required fields (event_id, minute, stoppage_time, match_period, event_type, team, player, importance, score_after_event, shootout_score, source_confidence, narrative_notes, source_references) |
| Valid enum values | PASS — event_type (GOAL/PENALTY/CARD), match_period (FIRST_HALF/SECOND_HALF/EXTRA_TIME_2), source_confidence (HIGH) all valid enum members |
| event_id format | WARNING — 4 event IDs embed stoppage time in the ID segment, which is not documented in schema v2.1 convention `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT_TYPE}`: `ARG_FRA_2022_045_07_CARD`, `ARG_FRA_2022_090_05_CARD`, `ARG_FRA_2022_090_08_CARD`, `ARG_FRA_2022_120_05_CARD` |
| match_period validity | PASS — All match_period values consistent with minute |
| score_after_event validity | PASS — All scores valid; PENALTY anchors correctly record pre-kick score; GOAL anchors correctly increment by 1 for scoring side |
| shootout_score validity | PASS — All anchors have `null`; correct for this match segment (no shootout anchors in Part 1) |
| source_confidence validity | PASS — All 17 anchors assigned HIGH; all satisfy HIGH criteria (FIFA confirmed + at least one additional independent source) |
| card_type validity | WARNING — Schema v2.1 does not define `card_type` as a field. The Narrative Anchor Field Reference (§event_id through §source_references) does not include `card_type`. No Conversion Contract mapping exists. All 8 CARD anchors carry `card_type: YELLOW` — this field would be silently dropped during conversion |
| source_references completeness | PASS — Every anchor has at least one reference; all have 4 |

**2 WARNING findings:** event_id format deviation (4 IDs), card_type undefined in schema.

---

## 2. Chronology

**Status: PASS**

| Check | Result |
|---|---|
| Chronological ordering | PASS — 23' → 23' → 36' → 45' → 55' → 80' → 80' → 81' → 87' → 90' → 90' → 108' → 114' → 116' → 118' → 118' → 120' — all in correct sequence |
| stoppage_time ordering | PASS — 45+7 < 55 < 80 < 81 < 87 < 90+5 < 90+8 < 108 < 114 < 116 < 118 < 120+5; all stoppage values ≥ 1 |
| No impossible minute progression | PASS — Monotonically non-decreasing; no negative deltas |
| No duplicate chronology | PASS — No two anchors share the same minute, type, team, and player |

---

## 3. Score Progression

**Status: PASS**

| Transition | Score | Valid |
|---|---|---|
| (kickoff) | 0-0 | — |
| PENALTY 23' (pre-kick) | 0-0 | PASS |
| GOAL 23' (Messi) | 1-0 | PASS |
| GOAL 36' (Di María) | 2-0 | PASS |
| CARDs 45+7'–76' | 2-0 | PASS |
| PENALTY 80' (pre-kick) | 2-0 | PASS |
| GOAL 80' (Mbappé pen) | 2-1 | PASS |
| GOAL 81' (Mbappé) | 2-2 | PASS |
| CARDs 87'–90+8' | 2-2 | PASS |
| GOAL 108' (Messi) | 3-2 | PASS |
| CARDs 114'–116' | 3-2 | PASS |
| PENALTY 118' (pre-kick) | 3-2 | PASS |
| GOAL 118' (Mbappé pen) | 3-3 | PASS |
| CARD 120+5' | 3-3 | PASS |

No impossible transitions. Score increments by exactly 1 on all GOAL events for the scoring side. PENALTY anchors correctly record pre-kick score.

---

## 4. Event IDs

**Status: WARNING**

| Check | Result |
|---|---|
| Uniqueness | PASS — All 17 event IDs unique within the document |
| Deterministic formatting | WARNING — 13 of 17 IDs follow schema v2.1 convention `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT_TYPE}`. 4 IDs embed stoppage time (`045_07_CARD`, `090_05_CARD`, `090_08_CARD`, `120_05_CARD`), matching no convention documented in schema v2.1 |
| No collisions | PASS — All IDs resolve to distinct events |
| No missing IDs | PASS — Every anchor has an event_id |

**1 WARNING finding:** 4 event IDs use an undocumented format.

---

## 5. Importance

**Status: WARNING**

| Anchor | Assigned | Schema v2.1 table value | Matches? |
|---|---|---|---|
| PENALTY 23' (Messi) | 70 | 70 (awarded) | PASS |
| GOAL 23' (Messi pen) | 95 | 95 (converted penalty) | PASS |
| GOAL 36' (Di María) | 85 | 90 (equalizer/major game-changing event) — schema table has no 85 for GOAL | **WARNING** |
| CARD Fernández | 40 | 40 (yellow card) | PASS |
| CARD Rabiot | 40 | 40 (yellow card) | PASS |
| PENALTY 80' (Mbappé) | 70 | 70 (awarded) | PASS |
| GOAL 80' (Mbappé pen) | 95 | 95 (converted penalty) | PASS |
| GOAL 81' (Mbappé) | 90 | 90 (equalizer) | PASS |
| CARD Thuram | 30 | 40 (yellow card) | **WARNING** |
| CARD Giroud | 30 | 40 (yellow card) | **WARNING** |
| CARD Acuña | 40 | 40 (yellow card) | PASS |
| GOAL 108' (Messi) | 95 | 95 (match-winning/decisive) | PASS |
| CARD Paredes | 40 | 40 (yellow card) | PASS |
| CARD Montiel | 40 | 40 (yellow card) | PASS |
| PENALTY 118' (Mbappé) | 70 | 70 (awarded) | PASS |
| GOAL 118' (Mbappé pen) | 95 | 95 (converted penalty) | PASS |
| CARD Martínez | 20 | — (schema table has 30 and 0-9; no 20 entry) | **WARNING** |

**Mismatch explanations:**

- **GOAL 36' (Di María, 85):** Schema v2.1 scoring table assigns 90 to "Equalizer or major game-changing event" for GOAL type. No 85 exists for GOAL in the table. The value 85 comes from anchor_rules.md ("Goal that extends lead to 2+ | 85"), which is a different document.

- **CARD Thuram (30) and CARD Giroud (30):** Schema v2.1 scoring table assigns 40 to "Yellow card | CARD (yellow)." The value 30 is listed as "Contextual narrative marker" for MOMENTUM_SHIFT (minor) and PRESSURE_SURGE (brief) — not for CARD. The anchor_rules.md provides granular values (30 for dissent/unsporting behaviour), but the schema table has no corresponding entry.

- **CARD Martínez (20):** Schema v2.1 scoring table contains no 20 entry for any event type. The table ranges from 100 down through 30 (contextual narrative marker) and 0-9 (fill/routine). The value 20 comes from anchor_rules.md ("Post-match card | 20"), which is a different document.

**4 WARNING findings:** All four mismatches arise because the two reference documents (schema v2.1 table vs. anchor_rules.md) assign different values to these scenarios.

---

## 6. Confidence

**Status: PASS**

All 17 anchors assigned HIGH. Verified against schema v2.1 criteria:
- Event confirmed by FIFA or equivalent official source: PASS (all reference FIFA.com)
- At least one additional independent source confirms without contradiction: PASS (all reference BBC Sport)
- Minute, period, team, player unambiguous: PASS
- Event type is GOAL, PENALTY, or CARD: PASS

No incorrect assignments.

---

## 7. Narrative Notes

**Status: PASS**

All 17 anchors' narrative_notes reviewed against schema v2.1 prohibited content rules:

| Prohibited content | Found? |
|---|---|
| Emotional interpretation | None |
| Inferred psychology | None |
| Tactical conclusions | None |
| Speculative statements | None |

All notes factual and observable. Example: *"Di María scores with a left-footed finish across goal from a Mac Allister cross following an Argentina counter-attack. 2-0 Argentina."* — describes only what happened.

---

## 8. Source References

**Status: PASS**

| Check | Result |
|---|---|
| Source precedence | PASS — FIFA.com listed first in every anchor, matching the authoritative source hierarchy |
| Missing references | PASS — Every anchor has at least one reference; all have 4 |
| Duplicate references | PASS — No source appears more than once within any anchor |
| Attribution consistency | PASS — All 17 anchors use the same four sources (FIFA, BBC, ESPN, Guardian) with consistent formatting |

---

## 9. Internal Consistency

**Status: PASS**

| Check | Result |
|---|---|
| Player names | PASS — All names use FIFA-standard spelling (Lionel Messi, Ángel Di María, Kylian Mbappé, etc.) |
| Team names | PASS — "Argentina" (home) and "France" (away) used consistently |
| card_type | PASS — All 8 CARD anchors have `card_type: YELLOW`; consistent where field is present |
| event_type | PASS — All values valid (GOAL, PENALTY, CARD) |
| match_period | PASS — All values consistent with minute values |

---

## 10. Substitution Validation

**Status: N/A**

Part 1 contains no SUBSTITUTION anchors.

---

## 11. Pressure Surge Validation

**Status: N/A**

Part 1 contains no PRESSURE_SURGE anchors.

---

## Summary

| Category | Result |
|---|---|
| 1. Schema Compliance | WARNING |
| 2. Chronology | PASS |
| 3. Score Progression | PASS |
| 4. Event IDs | WARNING |
| 5. Importance | WARNING |
| 6. Confidence | PASS |
| 7. Narrative Notes | PASS |
| 8. Source References | PASS |
| 9. Internal Consistency | PASS |
| 10. Substitution Validation | N/A |
| 11. Pressure Surge Validation | N/A |

| Severity | Count |
|---|---|
| PASS | 7 |
| WARNING | 3 |
| ERROR | 0 |
| N/A | 2 |

### Warnings (3 categories, 7 unique findings)

| # | Category | Finding | Detail |
|---|---|---|---|
| W1 | 1 — Schema Compliance | event_id format | 4 IDs (`045_07_CARD`, `090_05_CARD`, `090_08_CARD`, `120_05_CARD`) embed stoppage time; format not documented in schema v2.1 |
| W2 | 1 — Schema Compliance | card_type field | All 8 CARD anchors carry `card_type: YELLOW` but schema v2.1 has no `card_type` field definition or Conversion Contract mapping |
| W3 | 4 — Event IDs | deterministic formatting | Same 4 IDs as W1 use undocumented pattern |
| W4 | 5 — Importance | GOAL 36' | Importance 85 not in schema v2.1 scoring table for GOAL type |
| W5 | 5 — Importance | CARD Thuram | Importance 30 differs from schema v2.1's 40 for yellow cards |
| W6 | 5 — Importance | CARD Giroud | Same as W5 |
| W7 | 5 — Importance | CARD Martínez | Importance 20 has no entry in schema v2.1 scoring table |

### Overall Status

**PASS**

0 errors found. 7 warnings concern deviations between schema v2.1 and anchor_rules.md. None would break deterministic conversion or create inconsistent timeline data.
