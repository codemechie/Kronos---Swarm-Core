# Extraction Plan — Argentina vs France (2022 FIFA World Cup Final)

---

## 1. Source Acquisition Strategy

### Source Inventory

| # | Source | Type | Expected Volume | Acquisition Method |
|---|---|---|---|---|
| 1 | FIFA Official Match Report | PDF / HTML match report, lineups, events, statistical summary | 1 document, ~30-50 event entries | Download from FIFA.com. Archive locally as PDF + plaintext. |
| 2 | BBC Match Coverage | Live text commentary, match report, analysis page | 1 article + 1 live-text page, ~40-60 timestamped entries | Fetch BBC Sport page. Preserve paragraph-level timestamps. |
| 3 | ESPN Match Timeline | Play-by-play timeline, shot list, card log | 1 timeline page, ~50-70 entries | Fetch ESPN FC match page. Preserve minute-level event log. |
| 4 | Guardian Minute-by-Minute | Live text blog, full replay | 1 blog page, ~60-80 entries | Fetch Guardian Football page. Preserve minute headings in raw text. |

### Acquisition Order

1. **FIFA Official Match Report** — authoritative source for timing, participants, and scoreline. All conflicts are resolved against this source.
2. **BBC Match Coverage** — primary secondary source. Used to confirm FIFA entries and fill context.
3. **ESPN Match Timeline** — tertiary source. Used for cross-reference and disambiguation.
4. **Guardian Minute-by-Minute** — quaternary source. Used for low-confidence inferred events and as a completeness check.

### Fallback Strategy

If any source is unavailable (paywall, region lock, removed content):

- Replace with alternative source at the same precedence tier:
  - Tier 1 alternative: UEFA.com technical report, CONMEBOL match report
  - Tier 2 alternative: L'Équipe, Marca
  - Tier 3 alternative: Opta / Stats Perform data feed
- Document the substitution in the extraction log.

---

## 2. Source Precedence Rules

### Hierarchy

```
1. FIFA Official Match Report        (definitive)
2. BBC Match Coverage                 (primary secondary)
3. ESPN Match Timeline                (tertiary)
4. Guardian Minute-by-Minute          (quaternary)
```

### Conflict Resolution

| Conflict Type | Resolution |
|---|---|
| Timing disagreement (minute differs by 1-2) | Prefer FIFA minute. Record the conflicting source in `source_references` with a note: *"BBC reports this event at {minute}."* |
| Timing disagreement (minute differs by 3+) | Prefer FIFA. Flag for review during QA. |
| Participant disagreement (player name differs) | Prefer FIFA. Retain both names in `narrative_notes` with attribution. |
| Event existence (FIFA lists an event that BBC omits) | Create the anchor. Source confidence = HIGH. BBC omission is not grounds for exclusion. |
| Event existence (BBC lists an event that FIFA omits) | Do not create until verified against a third source. Confidence cannot exceed MEDIUM. |
| Description conflict (FIFA says "shot saved" while Guardian says "shot wide") | Prefer FIFA. Record the disagreement in `narrative_notes`. |

### Attribution Retention

Every anchor's `source_references` array must include all sources that contributed evidence, not only the authoritative one. The authoritative source is listed first.

---

## 3. Evidence Collection Workflow

### Step 1 — Initial Harvest

For each source, in precedence order:

1. Read the source end-to-end.
2. For each discrete event (goal, card, substitution, phase transition, attack sequence), create a raw harvest entry using `raw_event_harvest_template.md`.
3. Mark the Candidate Event Types checkbox for all applicable types for each entry.
4. Quote the source text verbatim in the `Raw Source Text` field.
5. Record the source name, URL, minute, and match period.

### Step 2 — Source Cross-Reference

After all four sources are harvested:

1. Sort all harvest entries by minute.
2. Identify entries from different sources that describe the same event.
3. Merge duplicate entries per the deduplication workflow (Section 4).
4. Identify events reported by only one source. Flag as MEDIUM or LOW confidence.

### Step 3 — Gap Detection

1. Walk through the match minute by minute in 5-minute blocks.
2. Identify any block with zero harvest entries across all sources.
3. If a block has no events for 15+ continuous minutes, review sources for missed entries.
4. If confirmed empty, allow the gap. Not every minute requires an anchor.

### Step 4 — Candidate Classification

1. For each unique event after deduplication, finalise the event type(s).
2. Apply the conflict resolution rules from `anchor_rules.md` to resolve type ambiguity.
3. Record the `Potential Importance` from the deterministic scoring table.

---

## 4. Deduplication Workflow

### Pre-Deduplication State

Expected raw harvest entries: **55-75** across all four sources.

### Deduplication Steps

1. **Group by minute.** All entries at the same minute are potential duplicates.
2. **Group by event type within each minute.** If two sources both record a GOAL at minute 23, they describe the same event.
3. **Retain the highest-ranked source.** For a GOAL at minute 23 with entries from FIFA, BBC, and ESPN: retain FIFA as authoritative. Copy BBC and ESPN into `source_references`.
4. **Flag timing mismatches.** If FIFA says 23' and Guardian says 24', retain 23'. Add Guardian to `source_references` with a timing note.
5. **Split merged events.** If one source describes both a foul and the resulting goal in a single paragraph, split into two harvest entries (one PENALTY, one GOAL) before deduplication.

### Expected Post-Deduplication State

Unique events after deduplication: **35-45**.

---

## 5. Confidence Assignment Workflow

### Assignment Order

1. **Check FIFA confirmation.** Is the event in the FIFA match report?
   - YES → candidate for HIGH
   - NO → cannot exceed MEDIUM

2. **Check independent confirmation.** Is the event confirmed by at least one additional source (BBC, ESPN, or Guardian)?
   - YES and FIFA confirmed → HIGH
   - YES but FIFA not confirmed → MEDIUM
   - NO independent confirmation → LOW

3. **Check event type modifier.**
   - MOMENTUM_SHIFT with exactly 2 signals → cannot exceed MEDIUM regardless of source rank
   - PRESSURE_SURGE with exactly 3 signals → cannot exceed MEDIUM
   - GOAL, PENALTY, CARD at FIFA → always HIGH
   - PHASE_CHANGE at half-time, full-time → always HIGH

4. **Check timing precision.** If any source disagrees on minute:
   - 1-2 minute disagreement → remain at current tier
   - 3+ minute disagreement → drop one tier (HIGH→MEDIUM, MEDIUM→LOW)

### Expected Confidence Distribution

| Confidence | Expected Count | Typical Types |
|---|---|---|
| HIGH | 25-30 | GOAL, PENALTY, CARD, half-time PHASE_CHANGE, converted shootout penalties |
| MEDIUM | 8-12 | SUBSTITUTION, MOMENTUM_SHIFT, PRESSURE_SURGE, extra time PHASE_CHANGE |
| LOW | 2-4 | Inferred MOMENTUM_SHIFT, borderline PRESSURE_SURGE |

---

## 6. Anchor Creation Workflow

### Step 1 — Validate Against Creation Criteria

For each unique event, check `anchor_rules.md` creation criteria:

- GOAL: Always create. Verify source confidence ≥ MEDIUM.
- PENALTY: Always create if penalty awarded. Verify paired with GOAL if converted.
- CARD: Create for each card. Verify type differentiation (yellow / second yellow / red).
- SUBSTITUTION: Create only if tactical/injury/formation/major-player criterion is met.
- MOMENTUM_SHIFT: Verify ≥ 2 independent signals within 10-minute window.
- PRESSURE_SURGE: Verify ≥ 3 signals within 5-minute window.
- PHASE_CHANGE: Verify structural transition.

### Step 2 — Assign Importance

Use the deterministic scoring table from `match_story_schema_v2_1.md`:

| Score | Applies To |
|---|---|
| 100 | Match-defining event |
| 95 | GOAL (match-winning or decisive, including converted penalty) |
| 90 | GOAL (equalizer), PENALTY (saved or missed) |
| 85 | CARD (red) |
| 80 | MOMENTUM_SHIFT (major) |
| 75 | CARD (second yellow dismissal) |
| 70 | PENALTY (awarded), PRESSURE_SURGE (with shot on target) |
| 60 | PHASE_CHANGE (tactical) |
| 50 | SUBSTITUTION (significant) |
| 40 | CARD (yellow) |
| 30 | MOMENTUM_SHIFT (minor), PRESSURE_SURGE (no shot), CARD (dissent) |
| 0-9 | Fill |

### Step 3 — Write Narrative Notes

Apply strict rules from `match_story_schema_v2_1.md`:
- Factual only. Observable actions.
- No emotional interpretation, inferred psychology, tactical conclusions, or speculation.
- Cross-reference `narrative_notes` across all sources. Use the FIFA description as the base, supplement with BBC/ESPN/Guardian detail for factual context only.

### Step 4 — Assemble Source References

Each anchor's `source_references` must include:
- First entry: FIFA (always present for HIGH confidence anchors)
- Subsequent entries: Each additional source that recorded this event

### Step 5 — Budget Check

After all anchors are created, verify against density controls:
- Total anchors: 25-45 (45-65 with shootout)
- Per-category caps (anchor_rules.md: Summary Reference Table)

---

## 7. Quality Assurance Workflow

### QA Pass 1 — Completeness

Verify every event in the FIFA match report has a corresponding anchor. FIFA is the ground truth. Any FIFA event without an anchor is a defect.

Checklist:

- [ ] Every FIFA-listed goal has a GOAL anchor
- [ ] Every FIFA-listed penalty has a PENALTY anchor
- [ ] Every FIFA-listed card has a CARD anchor
- [ ] Every FIFA-listed substitution meeting creation criteria has a SUBSTITUTION anchor
- [ ] Half-time, full-time, extra-time transitions have PHASE_CHANGE anchors
- [ ] Scoreline state changes (2-goal margin changes) have PHASE_CHANGE anchors where criteria are met

### QA Pass 2 — Consistency

Verify that equivalent events carry equivalent importance scores.

Checklist:

- [ ] All first-half penalties awarded but not yet taken: importance 70
- [ ] All saved/missed penalties: importance 90
- [ ] All converted penalties: PENALTY 70 + GOAL 95
- [ ] All yellow cards without dismissal: importance 40
- [ ] All PHASE_CHANGE for half-time/full-time: importance 60
- [ ] No two anchors share the same `event_id`

### QA Pass 3 — Narrative Notes Audit

Randomly sample 20% of anchors. Verify each sampled anchor's `narrative_notes`:

- [ ] Describes only what happened
- [ ] Contains no emotional language
- [ ] Contains no inferred psychology
- [ ] Contains no tactical conclusions
- [ ] Contains no speculative statements
- [ ] Can be verified against the quoted source text in the harvest entry

### QA Pass 4 — Density Audit

- [ ] Total anchor count is between 25 and 45 (standard) or 45-65 (including shootout)
- [ ] MOMENTUM_SHIFT count ≤ 6
- [ ] PRESSURE_SURGE count ≤ 8
- [ ] SUBSTITUTION count ≤ 6
- [ ] CARD count ≤ 10
- [ ] PHASE_CHANGE count ≤ 8
- [ ] No consecutive MOMENTUM_SHIFT or PRESSURE_SURGE anchors for the same team without a counter-event

### QA Pass 5 — Source Reference Audit

- [ ] Every anchor has at least one `source_references` entry
- [ ] HIGH confidence anchors have ≥ 2 independent sources
- [ ] MEDIUM confidence anchors have ≥ 1 reputable source
- [ ] All source URLs are valid
- [ ] FIFA is listed first in every anchor where it is included

### Final Approval

All five QA passes must be green before the anchor set is finalised.

---

## Expected Anchor Estimates

### Regulation + Extra Time (0'-120')

| Event Type | Expected Count | Notes |
|---|---|---|
| GOAL | 6 | Messi 23', Di María 36', Mbappé 80', Mbappé 81', Messi 108', Mbappé 118' |
| PENALTY | 3 | 23' (Messi), 80' (Mbappé), 118' (Mbappé) |
| CARD | 7-9 | Yellow cards only. No red cards. ~5 France, ~3 Argentina |
| SUBSTITUTION | 4-6 | Tactically significant substitutions only |
| MOMENTUM_SHIFT | 4-5 | After first goal, after Di María goal, after Mbappé double, after Messi extra-time goal, after Mbappé extra-time penalty |
| PRESSURE_SURGE | 4-5 | France pre-penalty (75-80'), France post-equalizer (81-85'), Argentina extra-time first half, France extra-time second half |
| PHASE_CHANGE | 6 | Half-time, full-time, extra time 1 start, extra time 2 start, shootout start, 2-0 lead established |
| **Subtotal** | **34-40** | Within 25-45 budget |

### Penalty Shootout (PSO)

| Event Type | Expected Count | Notes |
|---|---|---|
| GOAL | 6 | 4 Argentina, 2 France (converted shootout penalties) |
| PENALTY | 6 | One per shootout attempt (all 6 produce anchors regardless of conversion) |
| **Subtotal** | **12** | |

### Grand Total

| Category | Count |
|---|---|
| Regulation + extra time anchors | 34-40 |
| Shootout anchors | 12 |
| **Total canonical anchors** | **46-52** |

Within the extended budget of 65 max anchors (25-45 standard + 10 extra time + 10 shootout = 65).

### What Counts as a Raw Event

A raw event is a single harvest entry from a single source before deduplication. Estimated distribution:

| Source | Estimated Raw Events |
|---|---|
| FIFA Official Match Report | 25-30 |
| BBC Match Coverage | 40-50 |
| ESPN Match Timeline | 50-60 |
| Guardian Minute-by-Minute | 55-65 |
| **Total raw harvest entries** | **55-75** (after deduplication: 35-45 unique events) |
