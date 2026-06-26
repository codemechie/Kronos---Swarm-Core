# Historical Match Intelligence Pipeline — Architecture Decision Log

**Document version:** 1.0
**Date:** 2026-06-25
**Status:** Ratified

---

## Purpose

This document is the authoritative Architecture Decision Log for the Historical Match Intelligence Pipeline. It records all ratified architecture decisions that supersede or clarify previous specifications. It has the **highest precedence** in the Historical Match Intelligence Pipeline document hierarchy:

1. **match_story_architecture_log.md** ← you are here
2. `match_story_schema.md`
3. `anchor_rules.md`
4. `raw_event_harvest_template.md`
5. Match datasets
6. Timeline JSON
7. Runtime

Future document generation, validation, and conversion must resolve conflicts in this order. No dataset, anchor file, or downstream implementation may contradict an architecture decision without a superseding ADR in this document.

---

## ADR-001 — Deterministic Event ID Format

**ADR-ID:** ADR-001
**Title:** Deterministic Event ID Format
**Status:** Accepted
**Date:** 2026-06-25
**Owner:** Kronos Architecture
**Supersedes:** match_story_schema.md
**Affected Components:** Schema, Anchor Rules, Timeline Converter, Frontend, QA, Datasets

### Decision

Replace the original event ID convention with the following format:

```
{HOME}_{AWAY}_{YEAR}_{MINUTE}_{STOPPAGE}_{EVENT}
```

**Normal-time events** (no stoppage time):

```
{HOME}_{AWAY}_{YEAR}_{MINUTE}_{EVENT}
```

**Examples:**

| Event | event_id |
|---|---|
| Giroud yellow card, 90+5' | `ARG_FRA_2022_090_05_CARD` |
| Acuña yellow card, 90+8' | `ARG_FRA_2022_090_08_CARD` |
| Mbappé goal, 80' | `ARG_FRA_2022_080_GOAL` |
| Messi penalty award, 23' | `ARG_FRA_2022_023_PENALTY` |
| Fernández yellow card, 45+7' | `ARG_FRA_2022_045_07_CARD` |
| Martínez misconduct, 120+5' | `ARG_FRA_2022_120_05_CARD` |

**Penalty shootout events** (unchanged from schema):

```
{HOME}_{AWAY}_{YEAR}_PSO_{ROUND}_{EVENT}
```

Example: `ARG_FRA_2022_PSO_04_GOAL`

**Rules:**

- `MINUTE` must be zero-padded to 3 digits (e.g., `023`, `080`, `108`).
- `STOPPAGE` must be zero-padded to 2 digits when present (e.g., `07`, `05`, `08`).
- The underscore `_` is the canonical delimiter for all segments.
- Do **not** append `_1`, `_2` disambiguation suffixes. The stoppage field encodes the necessary distinction.

### Rationale

- The original schema convention `{MINUTE}_{EVENT}` with `_1`, `_2` disambiguation creates brittle IDs. Adding a new event at the same minute requires renumbering all subsequent `_N` suffixes.
- Encoding stoppage time directly in the ID produces a **deterministic** identifier — given minute + stoppage + event type, the ID is computable without consulting a registry.
- The underscore delimiter is consistent with the rest of the event ID: `090_05_CARD` is unambiguously minute 90, stoppage 5. Compare with `090_CARD_1` which carries no temporal information.
- Penalty shootout events use `PSO_{ROUND}` (unchanged) because shootout rounds have no minute value.

### Affected Documents

| Document | Impact |
|---|---|
| `match_story_schema.md` | Section `event_id` — replace format specification |
| `argentina_france_2022_source_part1.md` | Already uses this format for 4 IDs (compliant) |
| Future anchor documents | Must use `{MINUTE}_{STOPPAGE}_{EVENT}` for stoppage-time events |
| Timeline converter | Must parse `_` delimiter in event_id |

### Migration Guidance

1. Existing documents using `_1`, `_2` suffixes: replace with `{MINUTE}_{STOPPAGE}_{EVENT}`.
2. Verify all event IDs are unique after migration.
3. Update the schema's `event_id` field documentation to describe the new format.
4. Add parser support for the underscore delimiter in any downstream event_id parser.

### Implementation Status

- [x] Specification defined (this entry)
- [x] Adopted in `argentina_france_2022_source_part1.md` (stoppage-time cards)
- [ ] `match_story_schema.md` updated
- [ ] Timeline converter updated

---

## ADR-002 — `card_type` becomes canonical

**ADR-ID:** ADR-002
**Title:** `card_type` becomes canonical top-level field
**Status:** Accepted
**Date:** 2026-06-25
**Owner:** Kronos Architecture
**Supersedes:** match_story_schema.md, anchor_rules.md
**Affected Components:** Schema, Anchor Rules, All Anchor Documents, Timeline Converter, Frontend, QA

### Decision

Every CARD anchor **must** include a `card_type` field identifying the category of disciplinary sanction.

```
| **card_type** | {card_type} |
```

**Allowed values:**

| Value | Meaning |
|---|---|
| `YELLOW` | Standard caution. |
| `SECOND_YELLOW` | Second caution leading to dismissal. Produces a single CARD anchor per the anchor_rules rule. |
| `RED` | Direct red card (dismissal without prior caution). |

**Position in anchor table:**

The field must appear immediately after `event_type`, before `team`:

```
| **event_type** | CARD |
| **card_type** | YELLOW |
| **team** | ... |
```

**Conversion Contract update:**

`card_type` maps to `card_type` in the timeline object (direct copy). The previous schema's Conversion Contract omitted this field — it must now be included:

| Source Field | Target Field | Rule |
|---|---|---|
| `card_type` | `card_type` | Direct copy. `null` for non-CARD event types |

### Rationale

- Downstream consumers (frontend rendering, analytics, filter queries) need explicit card category data without parsing `narrative_notes`.
- The anchor_rules.md referenced `card_type` only inside `detail` strings within `source_references` — an opaque location unsuitable for machine consumption.
- Making `card_type` a top-level canonical field aligns with the principle of self-describing anchors: every categorical discriminator should be an explicit field, not embedded in prose.
- Supports frontend use cases: red card overlays, yellow card accumulation tracking, second-yellow dismissal animations.

### Affected Documents

| Document | Impact |
|---|---|
| `match_story_schema.md` | Add `card_type` field to Narrative Anchor Field Reference section; add row to Conversion Contract |
| `anchor_rules.md` | Update §CARD Creation Criteria to reference top-level `card_type` field instead of `detail` |
| All anchor documents | Must include `card_type` on every CARD anchor |
| Timeline converter | Must read `card_type` from source, write to target |

### Migration Guidance

1. Add `card_type` field definition to schema's Field Reference section (between `event_type` and `team` by logical grouping).
2. Add `card_type` → `card_type` row to the Conversion Contract table.
3. Update anchor_rules.md §CARD Creation Criteria: replace "`card_type` documented in `detail`" with "`card_type` populated as a top-level field."
4. Regenerate any existing CARD anchors that lack the field.
5. Update downstream parsers to expect the new field.

### Implementation Status

- [x] Specification defined (this entry)
- [x] Adopted in `argentina_france_2022_source_part1.md` (all 8 CARD anchors)
- [ ] `match_story_schema.md` updated
- [ ] `anchor_rules.md` updated
- [ ] Timeline converter updated

---

## ADR-003 — GOAL Importance Priority

**ADR-ID:** ADR-003
**Title:** GOAL Importance Priority — anchor_rules.md supersedes schema
**Status:** Accepted
**Date:** 2026-06-25
**Owner:** Kronos Architecture
**Supersedes:** match_story_schema.md (scoring table)
**Affected Components:** Schema, Anchor Rules, Validation, Datasets

### Decision

The `anchor_rules.md` document becomes the **canonical source** for GOAL importance assignments. Where the schema's deterministic scoring table and `anchor_rules.md` assign different values to the same scenario, `anchor_rules.md` prevails.

**Scoring table (authoritative):**

| Importance | Scenario | Source |
|---|---|---|
| 100 | Match-defining goal (single most defining moment) | Both agree |
| 95 | Winning goal | Both agree |
| 95 | Converted penalty | Both agree |
| 90 | Equalizer | Both agree |
| **85** | **Goal extending lead to 2+** | **anchor_rules.md** — supersedes schema's "major game-changing event" (90) |
| 80 | Routine goal in multi-goal blowout (3+ goal margin) | anchor_rules.md only |

### Rationale

- The schema's scoring table is a condensed reference. It groups "equalizer" and "major game-changing event" at 90, which conflates two distinct scenarios.
- `anchor_rules.md` provides granular entries: "Goal that extends lead to 2+ | 85" captures a specific, measurable scenario that the schema table lacks.
- The anchor_rules document was designed as the implementation handbook for extraction. Its importance guidelines reflect hands-on calibration from match analysis. The schema table was designed as a quick reference. When they diverge, the implementation handbook should prevail.
- This ADR resolves the ambiguity identified in validation report WARNING W3 (importance 90 vs 85 for Di María's 36' goal). The correct value per this ADR is **85**.

### Affected Documents

| Document | Impact |
|---|---|
| `match_story_schema.md` | Update deterministic scoring table GOAL row: add "Goal extending lead to 2+" = 85; remove or qualify "major game-changing event" = 90 to avoid overlap |
| `anchor_rules.md` | Remains authoritative as-is — no change needed |
| `argentina_france_2022_source_part1.md` | GOAL 36' (Di María) importance must change from **90 → 85** |
| Future anchor documents | Must reference anchor_rules.md for GOAL importance, not schema table alone |

### Migration Guidance

1. Update `argentina_france_2022_source_part1.md` GOAL 36' importance from 90 to 85.
2. Update schema scoring table to add explicit "Goal extending lead to 2+" = 85 row.
3. Add a note to the schema table: "For detailed GOAL importance, consult anchor_rules.md which takes precedence per ADR-003."

### Implementation Status

- [x] Specification defined (this entry)
- [ ] `argentina_france_2022_source_part1.md` updated (GOAL 36' → 85)
- [ ] `match_story_schema.md` updated
- [ ] Validation report updated to reflect resolved WARNING

---

## ADR-004 — Source Attribution Completeness

**ADR-ID:** ADR-004
**Title:** Source Attribution Completeness
**Status:** Accepted
**Date:** 2026-06-25
**Owner:** Kronos Architecture
**Supersedes:** match_story_schema.md (source_references validation)
**Affected Components:** Schema, Datasets, Validation, QA

### Decision

Every HIGH confidence anchor must explicitly document, for each of the four primary sources (FIFA, BBC, ESPN, Guardian), whether that source **reported** the event or was **verified as not reporting** it.

**Source reference entries:**

| Scenario | Representation |
|---|---|
| Source reports the event | `{ "source": "FIFA.com", "detail": "Match Report — 80'" }` |
| Source verified as not reporting | `{ "source": "ESPN FC", "detail": "Not reported" }` |
| Source not yet checked | Must not be omitted silently. Append `{ "source": "<source>", "detail": "Not yet verified" }` or omit with documented justification |

**Required source set for HIGH confidence anchors:**

1. `FIFA.com` (always present — authoritative)
2. `BBC Sport` (always present — primary secondary)
3. `ESPN FC` (must be either reported or verified not reported)
4. `The Guardian` (must be either reported or verified not reported)

### Rationale

- The validation report identified that CARD anchors list only FIFA + BBC, with no indication of whether ESPN/Guardian were checked and found absent, or simply never consulted.
- This ambiguity undermines the confidence system: a HIGH confidence anchor with incomplete attribution cannot be distinguished from one with thorough multi-source confirmation.
- Explicit "Not reported" entries serve as audit evidence that the source was checked. This prevents future analysts from re-checking absent sources unnecessarily.
- The approach mirrors the extraction plan's conflict resolution principle: document what you checked, not just what you found.

### Affected Documents

| Document | Impact |
|---|---|
| `match_story_schema.md` | Update `source_references` validation to document "Not reported" convention |
| `argentina_france_2022_source_part1.md` | All 8 CARD anchors need ESPN/Guardian verified (either add references or "Not reported" entries) |
| Future anchor documents | Must apply the four-source check for all HIGH confidence anchors |
| Validation checklist | Add "Not reported" entries as a PASS criterion |

### Migration Guidance

1. For each CARD anchor in `argentina_france_2022_source_part1.md`, check whether ESPN and The Guardian reported the card.
2. If reported: add `{ "source": "ESPN FC", "detail": "Match timeline — {minute}'" }` and `{ "source": "The Guardian", "detail": "Minute-by-minute report — {minute}'" }`.
3. If not reported: add `{ "source": "ESPN FC", "detail": "Not reported" }`.
4. Update the schema's `source_references` field documentation to describe the "Not reported" and "Not yet verified" conventions.

### Implementation Status

- [x] Specification defined (this entry)
- [ ] `argentina_france_2022_source_part1.md` CARD sources verified
- [ ] `match_story_schema.md` updated
- [ ] Validation checklist updated

---

## ADR-005 — QA Authority

**ADR-ID:** ADR-005
**Title:** QA Authority — Architecture Precedes Datasets
**Status:** Accepted
**Date:** 2026-06-25
**Owner:** Kronos Architecture
**Supersedes:** All specification documents
**Affected Components:** Schema, Anchor Rules, All Datasets, QA, Validation

### Decision

Quality Assurance findings that identify architectural improvements must update this architecture log **before** modifying any dataset, anchor file, or downstream implementation.

**Process:**

1. QA identifies a finding that has architectural implications (affects schema, rules, or generation conventions).
2. QA or architecture team drafts an ADR entry in this document.
3. Entry is ratified (approved).
4. References to outdated specifications are replaced by references to the ADR entry.
5. Datasets are updated to conform to the ratified ADR.
6. QA re-validates against the updated specification hierarchy.

**Invariant:**

> Datasets must never define architecture. Architecture defines datasets.

This means: if an anchor file contains a pattern that should become a standard, the pattern must first be codified in this architecture log and the schema. The dataset does not define the convention — the convention defines the dataset.

**Exceptions:**

- Emergency fixes (e.g., data corruption in an anchor file) may be applied directly to the dataset, but must be followed by an ADR entry within one business day.

### Rationale

- The validation process revealed that the original `argentina_france_2022_source_part1.md` contained patterns (custom event ID format, `card_type` field) that were applied to the dataset before being formalised in any specification. This created a gap between what the dataset required and what the schema documented.
- This architecture log formalises the pattern retroactively and establishes the rule going forward: **architecture first, data second.**
- Prevents specification drift where multiple documents evolve independently without a coordinating authority.

### Affected Documents

| Document | Impact |
|---|---|
| Every specification document | Must be updated through this ADR, not independently |
| Validation checklist item 8 (Cross-Annotation Consistency Check) | Add: "Does this finding require an ADR entry?" |
| Future QA workflows | Must include ADR check as step 0 |

### Migration Guidance

1. All future changes to schema or anchor_rules must be preceded by an ADR entry.
2. This document becomes the authoritative log of architectural evolution.
3. Version bumps to schema or anchor_rules should reference the ADR entries that drove the change.

### Implementation Status

- [x] Specification defined (this entry)
- [x] This document created as the architecture authority
- [ ] QA workflow updated to include ADR-first process
- [ ] Validation checklist updated

---

## Document Metadata

| Field | Value |
|---|---|
| **architecture_log_version** | `1.0` |
| **schema_version** | `2.1` (unmodified by this document) |
| **anchor_version** | `2.1` (unmodified by this document) |
| **ratified_by** | Architecture review (Phase 5.2 validation closeout) |
| **adr_count** | 5 (ADR-001 through ADR-005) |

---

## Change Log

| Date | Entry | Description |
|---|---|---|
| 2026-06-25 | ADR-001 | Deterministic Event ID Format — underscore delimiter with stoppage encoding |
| 2026-06-25 | ADR-002 | `card_type` becomes canonical top-level field for CARD anchors |
| 2026-06-25 | ADR-003 | GOAL importance priority — anchor_rules.md supersedes schema table |
| 2026-06-25 | ADR-004 | Source Attribution Completeness — "Not reported" must be explicit |
| 2026-06-25 | ADR-005 | QA Authority — architecture precedes datasets |

---

## Frozen Architecture Decisions

The following architecture is considered stable. Any future modification requires:

1. New ADR
2. Architecture review
3. Schema version increment
4. QA revalidation

**Frozen Items:**

- ✓ Event ID format (`{HOME}_{AWAY}_{YEAR}_{MINUTE}_{STOPPAGE}_{EVENT}` with underscore delimiters)
- ✓ `card_type` (canonical top-level field for CARD anchors)
- ✓ GOAL importance hierarchy (anchor_rules.md takes precedence over schema)
- ✓ Source attribution policy (four-source check with explicit "Not reported" entries)
- ✓ QA precedence hierarchy (architecture log > schema > anchor rules > datasets > timeline JSON > runtime)
- ✓ Architecture-first workflow (ADR before dataset modification)

---

## Document Authority

The Historical Match Intelligence Pipeline is governed by the following document hierarchy. Higher-level documents always override lower-level documents. Datasets may never redefine architecture.

```
match_story_architecture_log.md
        ↓
match_story_schema.md
        ↓
anchor_rules.md
        ↓
raw_event_harvest_template.md
        ↓
match datasets
        ↓
timeline JSON
        ↓
runtime
```

**Rules:**

1. A conflict between any two levels is resolved in favour of the higher-level document.
2. A lower-level document may propose a change, but the change takes effect only when ratified via an ADR at the architecture log level.
3. Datasets (anchor files) may never introduce conventions not first defined in a higher-level document. Any dataset-introduced convention must be ratified retroactively via ADR within one business day.
4. The runtime (code, converters, parsers) is the least authoritative layer. It must conform to all higher-level documents.

---

## Architecture Decision Record Template

The following template shall be reused for all future architecture changes. Each new ADR must be appended to this document and assigned the next sequential ADR-ID.

```markdown
## ADR-{NNN} — {Title}

**ADR-ID:** ADR-{NNN}
**Title:** {Descriptive title}
**Status:** {Proposed | Accepted | Deprecated | Superseded}
**Date:** {YYYY-MM-DD}
**Author:** {Name or Team}
**Affected Components:** {Schema, Anchor Rules, Timeline Converter, Frontend, QA, Datasets, ...}

### Problem

{Describe the problem or motivation for this decision. What prompted the change?}

### Decision

{Describe the architectural decision in detail. What is being changed? What is the new rule or convention?}

### Rationale

{Explain why this decision was made. What alternatives were considered? Why was this approach chosen?}

### Migration

{Describe how existing documents, datasets, or tools should be updated to conform to this ADR.}

### Validation

{Describe how compliance with this ADR will be verified. What tests or checks are needed?}

### Implementation Status

- [ ] Specification defined (this entry)
- [ ] {Affected document} updated
- [ ] {Affected document} updated
- [ ] Validation updated
- [ ] QA workflow updated
```

---

## Architecture Freeze

Beginning with **Phase 5.2B**, the Historical Match Intelligence Pipeline architecture is frozen.

Future work should prioritize:

- Dataset generation (Phase 5.2C onward)
- QA and validation
- Timeline conversion
- Runtime integration

Architecture changes should occur only when blockers are discovered during implementation. Any such change must follow the Frozen Architecture Decisions process: new ADR, architecture review, schema version increment, and QA revalidation.
