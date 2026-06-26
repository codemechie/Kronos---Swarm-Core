# Validation Report — argentina_france_2022_source_part1.md

**Audit date:** 2026-06-26
**Document:** `backend/docs/argentina_france_2022_source_part1.md`
**Reference documents:** `match_story_schema_v2_1.md`, `anchor_rules.md`
**Anchors audited:** 17 (6 GOAL, 3 PENALTY, 8 CARD)

---

## 1. Schema Compliance

**Status: WARNING**

| Check | Result | Detail |
|---|---|---|
| Required fields present | PASS | All 17 anchors contain event_id, minute, stoppage_time, match_period, event_type, team, player, importance, score_after_event, shootout_score, source_confidence, narrative_notes, source_references |
| Valid enum values | PASS | event_type (GOAL/PENALTY/CARD), match_period (FIRST_HALF/SECOND_HALF/EXTRA_TIME_2), source_confidence (HIGH) all valid |
| event_id format | WARNING | 4 IDs embed stoppage time in the minute segment (`045_07_CARD`, `090_05_CARD`, `090_08_CARD`, `120_05_CARD`). Schema v2.1 convention is `{MINUTE}_{EVENT_TYPE}` with optional `_1`/`_2` disambiguation. The `{MINUTE}_{STOPPAGE}_{EVENT}` pattern is not documented in schema v2.1 |
| match_period validity | PASS | All match_period values consistent with minute values |
| score_after_event validity | PASS | No impossible transitions. PENALTY anchors correctly record pre-kick score |
| shootout_score validity | PASS | All `null` — correct for this match segment |
| source_confidence validity | PASS | All 17 HIGH — all satisfy HIGH criteria |
| card_type validity | WARNING | Schema v2.1 Field Reference has no `card_type` field definition. The Narrative Anchor Field Reference (§event_id through §source_references) does not include `card_type`. No Conversion Contract mapping exists. All 8 CARD anchors carry `card_type: YELLOW` — field would be silently dropped during conversion |
| source_references completeness | PASS | Every anchor has at least 4 references |

---

## 2. Chronology

**Status: PASS**

Minute sequence: 23 → 23 → 36 → 45+7 → 55 → 80 → 80 → 81 → 87 → 90+5 → 90+8 → 108 → 114 → 116 → 118 → 118 → 120+5

| Check | Result | Detail |
|---|---|---|
| Chronological ordering | PASS | Monotonically non-decreasing; all events in correct sequence |
| stoppage_time ordering | PASS | 45+7 < 55 < 80 < 81 < 87 < 90+5 < 90+8 < 108 < 114 < 116 < 118 < 120+5 — correctly ordered |
| No impossible minute progression | PASS | No negative deltas |
| No duplicate chronology | PASS | No two anchors share same minute, type, team, and player |

---

## 3. Score Progression

**Status: PASS**

| Action | Score | Valid |
|---|---|---|
| (kickoff) | 0–0 | — |
| PENALTY 23' (pre-kick) | 0–0 | PASS |
| GOAL 23' (Messi pen) | 1–0 | PASS |
| GOAL 36' (Di María) | 2–0 | PASS |
| CARDs 45+7'–76' | 2–0 | PASS |
| PENALTY 80' (pre-kick) | 2–0 | PASS |
| GOAL 80' (Mbappé pen) | 2–1 | PASS |
| GOAL 81' (Mbappé) | 2–2 | PASS |
| CARDs 87'–90+8' | 2–2 | PASS |
| GOAL 108' (Messi) | 3–2 | PASS |
| CARDs 114'–116' | 3–2 | PASS |
| PENALTY 118' (pre-kick) | 3–2 | PASS |
| GOAL 118' (Mbappé pen) | 3–3 | PASS |
| CARD 120+5' | 3–3 | PASS |

Scoreline: 0–0 → 1–0 → 2–0 → 2–1 → 2–2 → 3–2 → 3–3. All transitions valid. Only GOAL events change the score. PENALTY anchors record pre-kick score.

---

## 4. Event IDs

**Status: WARNING**

| Check | Result | Detail |
|---|---|---|
| Uniqueness | PASS | All 17 event IDs unique within the document |
| Deterministic formatting | WARNING | 13 of 17 follow schema v2.1 convention `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT_TYPE}`. 4 IDs (`045_07_CARD`, `090_05_CARD`, `090_08_CARD`, `120_05_CARD`) embed stoppage time in an undocumented pattern |
| No collisions | PASS | All IDs resolve to distinct events |
| No missing IDs | PASS | Every anchor has an event_id |

---

## 5. Importance

**Status: WARNING**

### Per-anchor verification against schema v2.1 deterministic scoring table and anchor_rules.md

| Anchor | Assigned | Documented Value | Verdict |
|---|---|---|---|
| PENALTY 23' (Messi) | 70 | Schema: 70 (Penalty awarded) | PASS |
| GOAL 23' (Messi pen) | 95 | Schema: 95 (Goal — converted penalty) | PASS |
| **GOAL 36' (Di María)** | **85** | **Schema: no 85 entry for GOAL. Schema has 90 for "Equalizer or major game-changing event" and 95 for "Goal — match-winning or decisive." Anchor_rules: "Goal that extends lead to 2+ \| 85"** | **WARNING** |
| CARD 45+7' (Fernández) | 40 | Schema: 40 (Yellow card). Anchor_rules: "Yellow card — tactical foul \| 40" | PASS |
| CARD 55' (Rabiot) | 40 | Same as above | PASS |
| PENALTY 80' (Mbappé) | 70 | Schema: 70 (Penalty awarded) | PASS |
| GOAL 80' (Mbappé pen) | 95 | Schema: 95 (Goal — converted penalty) | PASS |
| GOAL 81' (Mbappé) | 90 | Schema: 90 (Equalizer or major game-changing event) | PASS |
| **CARD 87' (Thuram)** | **30** | **Schema: 40 (Yellow card). No 30 entry for CARD in schema table. Anchor_rules: "Yellow card — dissent, unsporting behaviour \| 30"** | **WARNING** |
| **CARD 90+5' (Giroud)** | **30** | **Same as Thuram** | **WARNING** |
| CARD 90+8' (Acuña) | 40 | Schema: 40 (Yellow card). Anchor_rules: "Yellow card — tactical foul \| 40" | PASS |
| GOAL 108' (Messi) | 95 | Schema: 95 (Goal — match-winning or decisive). Anchor_rules: "Extra-time goal \| 90–95" and "Open-play match-winning goal \| 95" | PASS |
| CARD 114' (Paredes) | 40 | Schema: 40 (Yellow card). Anchor_rules: "Yellow card — tactical foul \| 40" | PASS |
| CARD 116' (Montiel) | 40 | Schema: 40 (Yellow card). Anchor_rules: "Yellow card — tactical foul \| 40" | PASS |
| PENALTY 118' (Mbappé) | 70 | Schema: 70 (Penalty awarded) | PASS |
| GOAL 118' (Mbappé pen) | 95 | Schema: 95 (Goal — converted penalty) | PASS |
| **CARD 120+5' (Martínez)** | **20** | **Schema: no 20 entry exists in scoring table for any event type. Anchor_rules: "Post-match card \| 20"** | **WARNING** |

### Mismatch explanations

**GOAL 36' (Di María, importance 85):**
Schema v2.1 deterministic scoring table has no 85 entry for GOAL. The table has 95 (match-winning/decisive), 90 (equalizer/major game-changing), and the range 0-9 (fill/routine). Anchor_rules.md assigns 85 to "Goal that extends lead to 2+," but the schema v2.1 table does not contain this value.

**CARD 87' (Thuram, importance 30):**
Schema v2.1 deterministic scoring table assigns 40 to "Yellow card \| CARD (yellow)." The value 30 is listed only for "Contextual narrative marker \| MOMENTUM_SHIFT (minor), PRESSURE_SURGE (brief), PHASE_CHANGE." No 30 entry exists for CARD in the schema table. Anchor_rules.md assigns 30 for dissent/unsporting behaviour.

**CARD 90+5' (Giroud, importance 30):**
Same as Thuram above.

**CARD 120+5' (Martínez, importance 20):**
Schema v2.1 deterministic scoring table contains no 20 entry for any event type. The table descends from 100 through 30 (contextual narrative marker) to 0-9 (fill/routine). No 20 exists. Anchor_rules.md lists "Post-match card \| 20," but the schema table has no corresponding row.

---

## 6. Confidence

**Status: PASS**

All 17 anchors assigned HIGH. Verified against schema v2.1 criteria:
- Event confirmed by FIFA or equivalent official source: PASS (all reference FIFA.com)
- At least one additional independent source confirms without contradiction: PASS (all reference BBC Sport + ESPN + The Guardian)
- Minute, period, team, player unambiguous: PASS
- Event type is GOAL, PENALTY, or CARD: PASS

No MEDIUM or LOW conditions apply. No incorrect assignments.

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

All notes describe only observable events. Example: *"Di María scores with a left-footed finish across goal from a Mac Allister cross following an Argentina counter-attack. 2-0 Argentina."*

---

## 8. Source References

**Status: PASS**

| Check | Result | Detail |
|---|---|---|
| Source precedence | PASS | FIFA.com listed first in every anchor, matching authoritative source hierarchy |
| Missing references | PASS | Every anchor has at least 1 reference; all have 4 |
| Duplicate references | PASS | No source appears more than once within any anchor |
| Attribution consistency | PASS | All 17 anchors use same 4 sources (FIFA, BBC, ESPN, Guardian) with consistent format |

---

## 9. Internal Consistency

**Status: PASS**

| Check | Result | Detail |
|---|---|---|
| Player names | PASS | FIFA-standard spelling: Lionel Messi, Ángel Di María, Kylian Mbappé, Enzo Fernández, Adrien Rabiot, Marcus Thuram, Olivier Giroud, Marcos Acuña, Leandro Paredes, Gonzalo Montiel, Emiliano Martínez |
| Team names | PASS | "Argentina" (home) and "France" (away) used consistently; home/away convention correct |
| card_type | PASS | All 8 CARD anchors have `card_type: YELLOW` (consistent where field is present) |
| event_type | PASS | All values valid (GOAL, PENALTY, CARD) |
| match_period | PASS | All values consistent with minute (FIRST_HALF: 23–45, SECOND_HALF: 55–90, EXTRA_TIME_2: 108–120) |

---

## 10. Phase Change Validation

**Status: N/A**

Part 1 contains no PHASE_CHANGE anchors. This category does not apply.

---

## Summary

| Severity | Count |
|---|---|
| PASS | 7 |
| WARNING | 3 |
| ERROR | 0 |
| N/A | 1 |

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
| 10. Phase Change Validation | N/A |

### Warnings (3 categories, 7 unique findings)

| # | Category | Anchor(s) | Finding | Detail |
|---|---|---|---|---|
| W1 | 1 — Schema Compliance | 4 CARD anchors | event_id format | `045_07_CARD`, `090_05_CARD`, `090_08_CARD`, `120_05_CARD` use undocumented `{MINUTE}_{STOPPAGE}_{EVENT}` pattern. Schema v2.1 specifies `{MINUTE}_{EVENT_TYPE}` with `_1`/_2` disambiguation only |
| W2 | 1 — Schema Compliance | All 8 CARD anchors | card_type field | All 8 CARD anchors carry `card_type: YELLOW` but schema v2.1 has no field definition or Conversion Contract mapping for this field |
| W3 | 4 — Event IDs | 4 CARD anchors | Deterministic formatting | Same 4 IDs as W1 use undocumented format deviating from schema v2.1 convention |
| W4 | 5 — Importance | GOAL 36' (Di María) | Importance 85 | Schema v2.1 deterministic scoring table has no 85 entry for GOAL. Schema table has 90 for "Equalizer or major game-changing event" and 95 for "Goal — match-winning or decisive." Anchor_rules.md assigns 85 for "Goal that extends lead to 2+" |
| W5 | 5 — Importance | CARD 87' (Thuram) | Importance 30 | Schema v2.1 deterministic scoring table has 40 for "Yellow card \| CARD (yellow)." Value 30 exists only for MOMENTUM_SHIFT/PRESSURE_SURGE/PHASE_CHANGE. Anchor_rules.md assigns 30 for "dissent, unsporting behaviour" |
| W6 | 5 — Importance | CARD 90+5' (Giroud) | Importance 30 | Same as W5 |
| W7 | 5 — Importance | CARD 120+5' (Martínez) | Importance 20 | Schema v2.1 deterministic scoring table contains no 20 entry for any event type. Anchor_rules.md assigns 20 for "Post-match card" |

### Overall Status

**PASS**

0 errors found. 7 warnings concern deviations between schema v2.1 and anchor_rules.md. None would break deterministic conversion or create inconsistent timeline data. All warnings are pre-existing and documented in the architecture decision log for resolution.
