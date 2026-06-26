# Independent Validation Audit — argentina_france_2022_source_part1.md

**Audit date:** 2026-06-26
**Document under review:** `backend/docs/argentina_france_2022_source_part1.md`
**Reference hierarchy (per ADR-005):**
  1. `match_story_architecture_log.md` (ADRs-001–005)
  2. `match_story_schema_v2_1.md`
  3. `anchor_rules.md`
**Anchors audited:** 17 (6 GOAL, 3 PENALTY, 8 CARD)
**Audit type:** Independent — findings reflect current specification hierarchy as of audit date

---

## 1. Schema Compliance

**Status: WARNING**

### Required fields present
All 17 anchors contain all required fields: event_id, minute, stoppage_time, match_period, event_type, team, player, importance, score_after_event, shootout_score, source_confidence, narrative_notes, source_references. ✅ PASS

CARD anchors additionally contain `card_type` — now canonical per ADR-002. ✅ PASS

### Valid enum values
- **event_type**: GOAL, PENALTY, CARD — all valid. ✅ PASS
- **match_period**: FIRST_HALF, SECOND_HALF, EXTRA_TIME_1, EXTRA_TIME_2 — valid enum members. All values are among the allowed set. ✅ PASS
- **source_confidence**: HIGH on all 17 anchors — valid. ✅ PASS
- **card_type**: YELLOW on all 8 CARD anchors — valid value per ADR-002. ✅ PASS

### event_id format — PASS (updated per ADR-001)
With ADR-001 ratified, the `{MINUTE}_{STOPPAGE}_{EVENT}` format for stoppage-time events is now the canonical convention. All 17 event IDs comply:
- IDs without stoppage: `{MINUTE}_{EVENT}` format ✅
- IDs with stoppage: `{MINUTE}_{STOPPAGE}_{EVENT}` format (`045_07_CARD`, `090_05_CARD`, `090_08_CARD`, `120_05_CARD`) ✅
- All minutes zero-padded to 3 digits ✅
- All stoppage values zero-padded to 2 digits ✅
- Underscore delimiter used consistently ✅
- No `_1`/`_2` disambiguation suffixes needed ✅

The prior report's WARNING on this item is **resolved** by ADR-001.

### match_period validity — ERROR
**Anchor `ARG_FRA_2022_108_GOAL`** (Messi, minute 108) has `match_period: EXTRA_TIME_1`.

Per schema v2.1 and standard match clock convention:
- EXTRA_TIME_1 spans minutes 90–104 (first 15-minute period)
- EXTRA_TIME_2 spans minutes 105–120 (second 15-minute period)

Minute 108 > 105, therefore must be `EXTRA_TIME_2`. This error is **not addressed by any ADR**.

### score_after_event validity — PASS
All 17 anchors have valid score_after_event objects. No impossible transitions. See Section 3.

### shootout_score validity — PASS
All anchors have `null`. Correct — no penalty shootout anchors in this document.

### source_confidence validity — PASS
All 17 anchors are HIGH. Every event is confirmed by FIFA + at least one independent source.

### card_type validity — PASS (updated per ADR-002)
`card_type` is now a canonical top-level field per ADR-002. The schema v2.1 has not yet been updated to reflect this, but the ADR supersedes the schema. All 8 CARD anchors carry the field. ✅

The prior report's WARNING on this item is **resolved** by ADR-002.

### source_references completeness — WARNING (per ADR-004)
ADR-004 requires every HIGH confidence anchor to document all four primary sources (FIFA, BBC, ESPN, The Guardian), with explicit "Not reported" entries where a source was verified absent.

Current state:
- GOAL and PENALTY anchors (9 anchors): list all 4 sources ✅
- CARD anchors (8 anchors): list only FIFA + BBC; ESPN and Guardian status undocumented ❌

The ADR-004 implementation status confirms the source file has not yet been updated. This remains a compliance gap.

---

## 2. Chronology

**Status: PASS**

### Chronological ordering
All 17 anchors in correct chronological sequence by minute (+ stoppage_time):

| # | Event | Minute+Stoppage | Period |
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
| 12 | GOAL Messi | 108 | EXTRA_TIME_1† |
| 13 | CARD Paredes | 114 | EXTRA_TIME_2 |
| 14 | CARD Montiel | 116 | EXTRA_TIME_2 |
| 15 | PENALTY Mbappé | 118 | EXTRA_TIME_2 |
| 16 | GOAL Mbappé | 118 | EXTRA_TIME_2 |
| 17 | CARD Martínez | 120+5 | EXTRA_TIME_2 |

† Period value is disputed — see Schema Compliance ERROR.

### No duplicate chronology
No two anchors share the same minute, type, team, and player. Paired PENALTY+GOAL at the same minute is permitted per Penalty Event Generation Rule.

### stoppage_time ordering
Correct: 90+5 (Giroud) precedes 90+8 (Acuña). 120+5 (Martínez) correctly final.

---

## 3. Score Progression

**Status: PASS**

| # | Anchor | Score after | Delta | Valid? |
|---|---|---|---|---|
| — | (kickoff) | 0–0 | — | — |
| 1 | PENALTY 23' | 0–0 | — | ✅ pre-kick |
| 2 | GOAL 23' (Messi, ARG) | 1–0 | ARG +1 | ✅ |
| 3 | GOAL 36' (Di María, ARG) | 2–0 | ARG +1 | ✅ |
| 4–11 | CARDs 45+7'–90+8' | 2–0 → 2–2 | — | ✅ no score change |
| 12 | GOAL 108' (Messi, ARG) | 3–2 | ARG +1 | ✅ |
| 13–14 | CARDs 114', 116' | 3–2 | — | ✅ no score change |
| 15 | PENALTY 118' | 3–2 | — | ✅ pre-kick |
| 16 | GOAL 118' (Mbappé, FRA) | 3–3 | FRA +1 | ✅ |
| 17 | CARD 120+5' | 3–3 | — | ✅ no score change |

Scoreline: 0–0 → 1–0 → 2–0 → 2–1 → 2–2 → 3–2 → 3–3. All transitions valid. No impossible jumps.

---

## 4. Event IDs

**Status: PASS** (updated per ADR-001)

### Uniqueness — PASS
All 17 event IDs are unique within the document. No collisions.

### Format compliance — PASS
All IDs conform to the canonical format defined by ADR-001:
- Normal-time events: `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT}`
- Stoppage-time events: `{HOME}_{AWAY}_{YEAR}_{MINUTE}_{STOPPAGE}_{EVENT}`
- Minutes zero-padded to 3 digits
- Stoppage values zero-padded to 2 digits
- Underscore delimiter throughout

The prior report's WARNING on this item is **resolved** — ADR-001 ratified the format that was already in use.

### No missing IDs — PASS
Every anchor has a valid event_id.

---

## 5. Importance

**Status: ERROR** (updated per ADR-003)

| Anchor | Assigned | Reference | Expected | Verdict |
|---|---|---|---|---|
| PENALTY 23' | 70 | schema + anchor_rules | 70 | ✅ PASS |
| GOAL 23' (converted pen) | 95 | schema + anchor_rules | 95 | ✅ PASS |
| **GOAL 36' (Di María)** | **90** | **ADR-003 + anchor_rules** | **85** | **❌ ERROR** |
| GOAL 80' (converted pen) | 95 | schema + anchor_rules | 95 | ✅ PASS |
| GOAL 81' (equalizer) | 90 | schema + anchor_rules | 90 | ✅ PASS |
| GOAL 108' (extra time) | 95 | anchor_rules (90–95) | 90–95 | ✅ PASS |
| GOAL 118' (converted pen) | 95 | schema + anchor_rules | 95 | ✅ PASS |
| PENALTY 80' | 70 | schema + anchor_rules | 70 | ✅ PASS |
| PENALTY 118' | 70 | schema + anchor_rules | 70 | ✅ PASS |
| CARD Fernández (tactical) | 40 | anchor_rules | 40 | ✅ PASS |
| CARD Rabiot (tactical) | 40 | anchor_rules | 40 | ✅ PASS |
| CARD Thuram (simulation) | 30 | anchor_rules | 30 | ✅ PASS |
| CARD Giroud (dissent) | 30 | anchor_rules | 30 | ✅ PASS |
| CARD Acuña (tactical) | 40 | anchor_rules | 40 | ✅ PASS |
| CARD Paredes (tactical) | 40 | anchor_rules | 40 | ✅ PASS |
| CARD Montiel (handball) | 40 | anchor_rules | 40 | ✅ PASS |
| CARD Martínez (post-match) | 20 | anchor_rules | 20 | ✅ PASS |

### GOAL 36' finding — ERROR (upgraded from prior WARNING)
ADR-003 explicitly resolves the ambiguity between schema v2.1 and anchor_rules.md for the "Goal extending lead to 2+" scenario. The ADR states:

> "The correct value per this ADR is **85**."

The document currently assigns 90. Since ADR-003 is a ratified architecture decision with highest precedence, this is now a definitive compliance violation — not merely an ambiguity.

### CARD Martínez finding — NOTE
Importance 20 for post-match card is not in the schema's deterministic scoring table but is defined in anchor_rules.md (post-match card = 20). Per the document hierarchy (anchor_rules.md > schema), this is valid. No finding.

---

## 6. Confidence

**Status: WARNING**

### Confidence level assignment — PASS
All 17 anchors are assigned HIGH. Each meets the criteria:
- Event confirmed by FIFA official source ✅
- At least one additional independent source ✅
- Minute, period, team, player unambiguous ✅
- Event type is GOAL, PENALTY, or CARD ✅

### Source attribution completeness — WARNING (per ADR-004)
ADR-004 requires all four primary sources (FIFA, BBC, ESPN, Guardian) to be documented for every HIGH anchor. CARD anchors (8 of 17) only list 2 sources. Until the CARD source_references are updated per ADR-004, the confidence documentation for these anchors is incomplete.

This is a compliance gap rather than a factual error — the events themselves are confirmed by FIFA + BBC, which meets the original HIGH criteria. The ADR-004 documentation requirement is not yet satisfied.

---

## 7. Narrative Notes

**Status: PASS**

All 17 anchors reviewed against schema v2.1 prohibited content rules:

| Prohibited content | Found? |
|---|---|
| Emotional interpretation | ❌ None |
| Inferred psychology | ❌ None |
| Tactical conclusions | ❌ None |
| Speculative statements | ❌ None |

All notes are factual, observable, 1–3 sentences. Examples:
- *"Messi places the ball low to the left from the penalty spot. Lloris dives right. 1-0 Argentina."* ✅
- *"Di María scores with a left-footed finish across goal from a Mac Allister cross following an Argentina counter-attack. 2-0 Argentina."* ✅

---

## 8. Source References

**Status: WARNING**

### Source precedence — PASS
FIFA.com is listed first in every anchor's source_references, matching the authoritative source hierarchy.

### Missing references — PASS
Every anchor has at least one source_reference.

### Duplicate references — PASS
No source appears more than once within any anchor's reference list.

### Attribution completeness — WARNING (per ADR-004)
CARD anchors have only 2 of the 4 required sources:

| Source | GOAL/PENALTY (9 anchors) | CARD (8 anchors) |
|---|---|---|
| FIFA.com | ✅ Present | ✅ Present |
| BBC Sport | ✅ Present | ✅ Present |
| ESPN FC | ✅ Present | ❌ Missing |
| The Guardian | ✅ Present | ❌ Missing |

Per ADR-004, each missing source must be either added (if it reported the event) or documented as "Not reported" (if verified absent). The current state is non-compliant.

---

## 9. Internal Consistency

**Status: ERROR**

### Player names — PASS
FIFA-standard spelling used consistently: Lionel Messi, Ángel Di María, Kylian Mbappé, Enzo Fernández, Adrien Rabiot, Marcus Thuram, Olivier Giroud, Marcos Acuña, Leandro Paredes, Gonzalo Montiel, Emiliano Martínez.

### Team names — PASS
"Argentina" (home) and "France" (away) used consistently. Home/away convention in score_after_event is correct.

### card_type — PASS
All 8 CARD anchors have `card_type: YELLOW`. No red cards or second-yellow dismissals in this match.

### event_type — PASS
All event_type values are valid enum members.

### match_period — ERROR
Same finding as Section 1: minute 108 has `EXTRA_TIME_1` but should be `EXTRA_TIME_2`.

| Minute | Current match_period | Expected | Status |
|---|---|---|---|
| 23, 36, 45 | FIRST_HALF | FIRST_HALF | ✅ |
| 55, 80, 81, 87, 90 | SECOND_HALF | SECOND_HALF | ✅ |
| 108 | EXTRA_TIME_1 | EXTRA_TIME_2 | ❌ |
| 114, 116, 118, 120 | EXTRA_TIME_2 | EXTRA_TIME_2 | ✅ |

---

## 10. Substitution Justification

**Status: N/A**

Part 1 (GOAL, PENALTY, CARD) contains no SUBSTITUTION anchors. No substitution justification applies.

---

## Summary

| Category | PASS | WARNING | ERROR | N/A |
|---|---|---|---|---|
| 1. Schema Compliance | 5 | 1 | 1 | — |
| 2. Chronology | 4 | — | — | — |
| 3. Score Progression | 1 | — | — | — |
| 4. Event IDs | 3 | — | — | — |
| 5. Importance | 16 | — | 1 | — |
| 6. Confidence | 1 | 1 | — | — |
| 7. Narrative Notes | 1 | — | — | — |
| 8. Source References | 3 | 1 | — | — |
| 9. Internal Consistency | 4 | — | 1 | — |
| 10. Substitution Justification | — | — | — | 1 |

### Aggregate counts
| Severity | Count |
|---|---|
| PASS | 38 |
| WARNING | 4 |
| ERROR | 3 |
| N/A | 1 |

### Notable changes from prior validation report (2026-06-25)
| Prior finding | Old severity | New severity | Reason |
|---|---|---|---|
| event_id format deviation | WARNING | PASS | Resolved by ADR-001 |
| card_type not in schema | WARNING | PASS | Resolved by ADR-002 |
| GOAL 36' importance (90 vs 85) | WARNING | ERROR | ADR-003 removes ambiguity; document is now definitively non-compliant |
| CARD source_references incomplete | WARNING | WARNING | ADR-004 ratified but not yet implemented |
| match_period EXTRA_TIME_1 at min 108 | ERROR | ERROR | Unchanged — not addressed by any ADR |

### Errors
| # | Finding | Location | ADR status |
|---|---|---|---|
| E1 | `match_period` = EXTRA_TIME_1 for minute 108, should be EXTRA_TIME_2 | Line 244 | Not addressed by any ADR |
| E2 | GOAL 36' (Di María) importance = 90, should be 85 per ADR-003 | Line 63 | ADR-003 ratified, document not updated |

### Warnings
| # | Finding | Location | ADR status |
|---|---|---|---|
| W1 | CARD source_references incomplete — ESPN/Guardian status undocumented for 8 anchors | Lines 89, 110, 191, 212, 233, 274, 295, 356 | ADR-004 ratified, not yet implemented |
| W2 | CARD anchors lack documented HIGH confidence source attribution completeness per ADR-004 | Lines 89, 110, 191, 212, 233, 274, 295, 356 | Tied to W1 |

---

## Overall Status

**REQUIRES CORRECTION**

3 errors found (2 unique issues):

1. **E1 — match_period**: Change `EXTRA_TIME_1` to `EXTRA_TIME_2` for anchor `ARG_FRA_2022_108_GOAL` (line 244). No ADR covers this — it is a factual data error.

2. **E2 — GOAL 36' importance**: Change importance from `90` to `85` per ADR-003 (line 63).

Remediation priority:
1. Fix E1 (factual error, no ADR dependency)
2. Fix E2 (ratified ADR, document not updated)
3. Resolve W1/W2 by updating CARD source_references per ADR-004
