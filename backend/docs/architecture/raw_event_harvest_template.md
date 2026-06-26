# Raw Event Harvest Template

Neutral evidence collection format for capturing source material before narrative anchors are created.

The template separates source evidence, candidate classification, and the final inclusion decision. It discourages interpretation at the point of harvest — the raw source text is preserved verbatim, and event classification happens as a separate step.

---

## Template

```markdown
---

Minute: {minute}

Match Period: {FIRST_HALF / SECOND_HALF / EXTRA_TIME_1 / EXTRA_TIME_2 / PENALTY_SHOOTOUT}

Source: {source name}

Source URL: {url}

Raw Source Text:

> {verbatim quote from source}

---

Candidate Event Types:

[ ] GOAL
[ ] PENALTY
[ ] CARD
[ ] SUBSTITUTION
[ ] MOMENTUM_SHIFT
[ ] PRESSURE_SURGE
[ ] PHASE_CHANGE
[ ] INJURY
[ ] VAR_DECISION
[ ] CROWD_SURGE

---

Candidate Players: {comma-separated list, or "None"}

---

Candidate Team: {team name, or "None"}

---

Potential Importance: {integer 0-100, see scoring table}

---

Keep In Canonical Timeline?

YES / NO

---

Reason: {justification for inclusion or exclusion}

---

Confidence:

HIGH
MEDIUM
LOW

---

Notes: {free-text observations, questions, cross-references to other sources}

---
```

---

## Template Usage Instructions

### When to harvest

Harvest when you encounter a source that describes match action matching one or more candidate event types. Each harvest entry captures a single moment in match time. If a single source paragraph describes multiple events (e.g., a goal and the preceding foul), create separate harvest entries.

### What to preserve

- **Raw Source Text**: Copy verbatim. Do not paraphrase, summarise, or edit. Use blockquote formatting. If the source contains non-relevant surrounding text, trim to the relevant passage and use `[...]` to indicate omissions.
- **Minute and Match Period**: Record as stated by the source. If the source reports only a minute (e.g., "67'"), record it. If the source is ambiguous, use the `Notes` field to flag the ambiguity.
- **Source and Source URL**: Identify the publisher and provide a direct link to the article, page, or timestamped broadcast note. For offline sources (printed match programmes, books), provide a document identifier and page number in place of URL.

### What to avoid

- Do not write narrative notes or commentary in the harvest entry.
- Do not merge multiple events into one entry.
- Do not infer player identities or timings not present in the source text.
- Do not make inclusion decisions before completing the candidate classification.

---

## Harvesting Workflow

### Step 1 — Collect

Gather all available source material for the match. Primary sources first: official FIFA match report, broadcast timeline, UEFA/CONMEBOL technical reports. Secondary sources: BBC, ESPN, Guardian live text, L'Équipe minute-by-minute. Each discrete action or observation from any source produces one harvest entry.

### Step 2 — Classify

For each harvest entry, check all candidate event types that could apply. A single event may fit multiple types (e.g., a goal from a penalty is both a PENALTY and a GOAL). The candidate classification step is unchecked — any applicable type may be flagged. Final assignment to specific event types happens during anchor creation.

### Step 3 — Score

Assign a potential importance value from the deterministic scoring table defined in the Historical Match Intelligence Pipeline Canonical Source Schema. This is a preliminary score and may be revised during anchor creation when all sources are cross-referenced.

### Step 4 — Decide

Mark Keep In Canonical Timeline as YES or NO with a supporting reason. Inclusion criteria:
- The event is observable, factual, and confirmed by at least one source.
- The event has narrative relevance (impacts score, momentum, phase, or discipline).
- The event is not redundant with an existing entry at the same minute.

Exclusion criteria:
- The source text is too vague to anchor to a specific minute.
- The event is a duplicate of an existing harvest entry from a higher-ranked source.
- The event is purely speculative or analytical (e.g., pundit commentary on what might happen).

### Step 5 — Assign Confidence

Apply the source confidence level based on the source rank and number of independent confirmations:
- `HIGH`: Source is FIFA (or equivalent official) plus at least one additional independent source.
- `MEDIUM`: Source is a single reputable outlet (BBC, ESPN, Guardian, L'Équipe).
- `LOW`: Source is secondary or the event is inferred from multiple indirect references.

---

## Deduplication Rules

When multiple harvest entries describe the same event, apply these rules:

1. **Exact match**: If two entries share the same minute, event type, team, and player, they describe the same event. Retain the entry with higher source precedence. Discard the lower-ranked entry after copying its source reference into the retained entry's `source_references`.

2. **Time ambiguity**: If entries differ by minute (e.g., one source reports "80'" and another "81'" for the same goal), retain the FIFA or official source minute. Add the conflicting source to `source_references` with a timestamp note.

3. **Partial overlap**: If two entries describe different aspects of the same event (e.g., one reports the foul, another reports the conversion), merge both into the PENALTY and GOAL anchor pair per the Penalty Event Generation Rule. Discard no data.

4. **Cross-period duplication**: A goal that occurs in stoppage time may be recorded differently across sources (e.g., "90'" vs "90+3'"). Retain the entry with the most precise timing. If no source specifies stoppage time, default to the last full minute of the period.

5. **Shootout penalties**: Each shootout round is a distinct event. Do not deduplicate across rounds. Within a single round, apply rules 1-3.

---

## Source Precedence Rules

When sources conflict, apply the following rank order. The highest-ranked source is authoritative for timing, participant, and description.

### Source Hierarchy

1. **FIFA** — Official match report, FIFA Technical Report, FIFA.com
2. **BBC Sport** — Live text commentary, match report
3. **ESPN** — Match report, play-by-play
4. **Guardian** — Minute-by-minute, match report
5. **Other** — All other sources (broadcast feeds, federation reports, statistical feeds)

### Conflict Resolution

- When two sources disagree, prefer the higher-ranked source.
- When two sources at the same rank disagree, prefer the source with more precise timing (specific minute over range, stoppage time specified over unspecified).
- When sources agree on timing but disagree on description (e.g., which player was involved), prefer the higher-ranked source. If ranks are equal, retain both descriptions in `narrative_notes` with attribution.
- Do not discard the lower-ranked source's information — retain it in `source_references` for traceability. The lower-ranked source becomes an additional attribution entry rather than the authoritative description.
- For `LOW` confidence events where no single source provides definitive confirmation, synthesise from all available sources and document the synthesis in `narrative_notes` and `source_references`.

### Attribution Retention

The final narrative anchor must include all sources consulted, not only the authoritative one. Each `source_references` entry preserves the original source name, the detail of what that source reported, and an optional timestamp. This ensures full traceability even when conflicts are resolved.
