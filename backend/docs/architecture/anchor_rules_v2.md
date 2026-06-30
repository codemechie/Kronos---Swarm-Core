# Anchor Rules — Analyst Handbook (Version 2)

Deterministic extraction rules for converting raw match evidence into narrative anchors for the Historical Match Intelligence Pipeline.

Two different analysts following these rules must produce nearly identical anchor sets for the same match.

---

## General Principles

1. **One anchor per observable event.** A single real-world action may produce multiple anchors only where explicitly specified (e.g., PENALTY + GOAL).
2. **No inference.** Anchors describe what happened, not why it mattered.
3. **Source-gated creation.** Every anchor must trace to at least one source reference. Inferred anchors (MOMENTUM_SHIFT, PRESSURE_SURGE) require objective signal thresholds, not subjective judgment.
4. **Density budget.** Target 25–45 anchors per match. Prioritise decisive events over routine ones.

---

## Event Type Rules

---

### GOAL

#### Definition

The ball fully crosses the goal line between the goalposts and beneath the crossbar, awarded by the referee. Includes own goals, penalty conversions, extra-time goals, and shootout goals.

#### Trigger Conditions

- Referee signals goal.
- FIFA or equivalent official source confirms.

#### Creation Criteria

- **Must** generate an anchor for every goal.
- **Must** generate a separate GOAL anchor for a converted penalty (paired with the PENALTY anchor).
- **Must** generate a GOAL anchor for own goals. The `team` field records the team credited with the goal (the opposing side). The `player` field records the player who scored (the player who touched the ball last).
- **Must** generate a GOAL anchor for shootout penalties that are converted. `match_period` = PENALTY_SHOOTOUT, `score_after_event` remains at full-time score, `shootout_score` increments.
- **Must** generate a GOAL anchor for extra-time goals. `match_period` = EXTRA_TIME_1 or EXTRA_TIME_2.

#### Non-Creation Criteria

- Do not create if the goal is disallowed after VAR review. If a GOAL anchor was created before the VAR decision, create a separate VAR_DECISION anchor that nullifies it.
- Do not create for penalty misses or saves (no goal scored).

#### Special Handling

- **Own goal**: `player` = player who touched the ball last. `team` = the opposing side that benefits. `importance` = 90 (equalizer or major) or 95 (match-winning). Narrative notes must state: *"{Player} turns the ball into {team}'s net."*
- **Penalty goal**: Always paired with a PENALTY anchor. The PENALTY anchor carries `score_after_event` pre-kick. The GOAL anchor carries `score_after_event` post-kick.
- **Shootout goal**: `score_after_event` locked at full-time score. `shootout_score` advances. `importance` = 95 (each converted shootout penalty is a discrete decisive event).

#### Importance Guidelines

| Scenario | Importance |
|---|---|
| Match-winning goal (decides the result) | 100 |
| Converted penalty that changes the scoreline | 95 |
| Open-play match-winning goal | 95 |
| Equalizer | 90 |
| Goal that extends lead to 2+ | 85 |
| Extra-time goal (any) | 90–95 |
| Shootout conversion | 95 |
| Own goal (match-winning) | 95 |
| Own goal (equalizer) | 90 |
| Routine goal in a multi-goal blowout (3+ goal margin) | 80 |

#### Examples

- *GOAL — Messi penalty conversion, 23', 1-0. Importance 95.*
- *GOAL — Mbappé volley, 81', 2-2. Importance 90 (equalizer).*
- *GOAL — Messi extra-time tap-in, 108', 3-2. Importance 95.*

#### Counterexamples

- Disallowed goal (offside, foul in buildup). Do not create.
- Goal in abandoned match. Do not create.

---

### PENALTY

#### Definition

A penalty kick is awarded by the referee following a foul inside the penalty area or a handball offence. The anchor captures the award itself, independent of the outcome.

#### Trigger Conditions

- Referee points to the penalty spot.
- Official match report states "penalty awarded."

#### Creation Criteria

- **Must** generate a PENALTY anchor whenever a penalty is awarded, regardless of whether it is converted, saved, or missed.
- **Must** be paired with a GOAL anchor when the penalty is converted.
- **Must** stand alone when the penalty is saved or missed.
- `score_after_event` records the score BEFORE the kick. For a converted penalty, the paired GOAL anchor carries the post-kick score.
- `player` records the taker. `team` records the attacking side.

#### Non-Creation Criteria

- Do not create for indirect free kicks inside the area (these are not penalties).
- Do not create for penalty shootout awards alone — shootout penalties are created per the Penalty Event Generation Rule with `match_period` = PENALTY_SHOOTOUT. The award and conversion are the same action in a shootout context.

#### Importance Guidelines

| Scenario | Importance |
|---|---|
| Penalty awarded (later converted) | 70 |
| Penalty saved (no goal) | 90 |
| Penalty missed (no goal) | 90 |

#### Examples

- *PENALTY — Messi to take, 23', pre-kick score 0-0. Importance 70 (converted later).*
- *PENALTY — Saved by Martinez, 90+8', pre-kick score 3-3. Importance 90.*

#### Counterexamples

- Foul outside the area. Do not create.
- Free kick. Do not create.
- Shootout penalty award (conversion and award are captured as paired GOAL + PENALTY with `match_period` = PENALTY_SHOOTOUT).

---

### CARD

#### Definition

A disciplinary sanction issued by the referee. Three categories: yellow card (caution), second yellow card (caution leading to dismissal), direct red card (dismissal without prior caution).

#### Trigger Conditions

- Referee displays a card.
- Official match report lists the player and offence.

#### Creation Criteria

- **Must** generate an anchor for every card shown during regulation, extra time, and after the final whistle (post-match cards are recorded at minute 120).
- **Must** record `player` as the carded player. `team` as the player's team.
- **Must** include a top-level `card_type` field on every CARD anchor per ADR-002. Allowed values: `YELLOW`, `SECOND_YELLOW`, `RED`. The field appears immediately after `event_type` in the anchor table.
- Second yellow cards produce a single CARD anchor with `event_type` = CARD and `card_type` = `SECOND_YELLOW`. The `narrative_notes` must state the player was shown a second yellow and dismissed.
- Direct red cards produce a CARD anchor with `importance` = 85.

#### Non-Creation Criteria

- Do not create for cards shown to coaching staff or substituted players on the bench unless the match report lists them as a notable event (use `Notes` in the harvest template to flag). When created, `player` = staff member name, `team` = their team, `importance` = 30.
- Do not create multiple anchors for the same card (yellow that becomes a second yellow — one anchor only).

#### Importance Guidelines

| Scenario | Importance |
|---|---|
| Direct red card | 85 |
| Second yellow card (dismissal) | 75 |
| Yellow card — tactical foul, time-wasting | 40 |
| Yellow card — reckless challenge, injury risk | 50 |
| Yellow card — dissent, unsporting behaviour | 30 |
| Post-match card | 20 |

#### Examples

- *CARD — Direct red, challenge that denies clear goalscoring opportunity. Importance 85. card_type = RED.*
- *CARD — Second yellow, tactical foul after earlier caution. Importance 75. card_type = SECOND_YELLOW.*
- *CARD — Yellow, time-wasting at goal kick. Importance 40. card_type = YELLOW.*

#### Counterexamples

- Verbal warning without a card. Do not create.
- Card to a coach/substitute unless deemed notable by the match report. Do not create.

---

### SUBSTITUTION

#### Definition

A player is replaced by another player from the same team during a stoppage in play.

#### Trigger Conditions

- The substitution board is raised.
- Official match report confirms the substitution.

#### Creation Criteria

**Do not create an anchor for every substitution.** Create only when at least one of the following conditions is met:

1. **Tactical significance**: The substitution changes formation, introduces an attacking player when trailing, or introduces a defensive player when protecting a lead.
2. **Injury significance**: The substitution is forced by an injury visibly affecting play.
3. **Formation significance**: The substitution involves a goalkeeper outfield swap, a third goalkeeper, or a concussion substitute.
4. **Major player significance**: The player introduced or removed is a team captain, star player, or has direct narrative impact (e.g., a player returning from long-term injury).

#### Non-Creation Criteria

- Do not create for routine substitutions in neutral game states (e.g., like-for-like replacement in a settled match, 75th-minute fresh-legs substitution with score level).
- Do not create for substitutions during stoppage time that are purely time-wasting unless the match report flags them as notable.
- Do not create for goalkeeper substitutions unless condition 1 or 3 is met.

#### Importance Guidelines

| Scenario | Importance |
|---|---|
| Substitution of an injured star player | 70 |
| Tactical substitution that directly leads to a goal | 60 |
| Formation-changing substitution | 55 |
| Attacking substitution when trailing | 50 |
| Defensive substitution when leading | 50 |
| Major player introduction (captain, returning star) | 50 |
| Concussion substitute | 50 |
| Injury substitution (non-star player) | 40 |
| Routine like-for-like | Do not create |
| Time-wasting substitution in stoppage time | Do not create |

#### Examples

- *SUBSTITUTION — Attacking player introduced when trailing 1-0, 60'. Importance 50.*
- *SUBSTITUTION — Captain removed due to injury, 40'. Importance 70.*

#### Counterexamples

- *75th minute, score 2-0, midfielder replaces midfielder. Do not create.*
- *88th minute, defensive substitution protecting a one-goal lead. Create (tactical significance).*

---

### MOMENTUM_SHIFT

#### Definition

A measurable change in match control where one team establishes sustained territorial, attacking, or psychological dominance that observably alters the flow of the match.

**This is the highest-risk subjective category.** To eliminate subjectivity, creation requires at least TWO independent signals from the list below.

#### Trigger Conditions

MOMENTUM_SHIFT is candidate when two or more of the following signals occur within a 10-minute window:

| Signal | Measurement |
|---|---|
| Goal | A goal is scored by one side (automatic momentum signal) |
| Repeated chances | 3+ shots or clear chances within 8 minutes by the same team |
| Territorial dominance | 65%+ possession over 10 continuous minutes |
| Goalkeeper intervention | 2+ saves by the same goalkeeper within 8 minutes |
| Corner sequence | 4+ corners in 8 minutes by the same team |
| Foul sequence | 4+ fouls committed by one team in 8 minutes (defensive pressure / being pinned back) |
| Card sequence | 2+ cards shown to one team within 10 minutes (discipline breakdown) |
| Opposition substitution defensive change | Team makes a defensive substitution while defending a lead |

#### Creation Criteria

- **Must** have at least two independent signals from the table above.
- `team` = the team that has gained momentum.
- `player` = optional. Include if a single player is central to the shift (scoring a goal, making key saves).
- `importance` = 80 for major shifts (goal-scoring sequences, red card). 30 for minor shifts (sustained pressure without a goal).
- MUST NOT be created solely because of subjective impressions: *"Team X looks more dangerous."*

#### Non-Creation Criteria

- Do not create for routine momentum exchanges in an evenly matched game (possession oscillates 50-55% without chances).
- Do not create for momentum that follows a goal unless at least one additional independent signal is present alongside the goal itself.
- Do not create if the only signal is crowd noise or commentator observation without measurable match data.
- Do not create if the momentum shift is redundant with another anchor at the same minute (e.g., a GOAL anchor already captures the moment). Only create MOMENTUM_SHIFT alongside a GOAL if a second independent signal is present.

#### Importance Guidelines

| Scenario | Importance |
|---|---|
| Goal + 2 additional signals within 10 minutes | 80 |
| Goal + 1 additional signal | 70 |
| Red card + territorial shift | 80 |
| Sustained pressure (3+ chances, no goal) | 30 |
| Repeated saves by goalkeeper | 30 |

#### Examples

- *MOMENTUM_SHIFT — France, 80'. Goal (signal 1) + 5 corners in 8 minutes (signal 2) + 3 shots on target (signal 3). Importance 80.*
- *MOMENTUM_SHIFT — Argentina, 60'. 68% possession over 10 minutes (signal 1) + 4 shots (signal 2). No goal. Importance 30.*

#### Counterexamples

- *"The crowd is getting behind the home side." Not measurable. Do not create.*
- *A single shot on target after a long period of no action. Only one signal. Do not create.*

---

### PRESSURE_SURGE

#### Definition

A period of sustained attacking pressure by one team, measured by objective event density over a short time window. Distinct from MOMENTUM_SHIFT — a surge is a discrete burst (5-8 minutes), not a sustained phase shift.

#### Trigger Conditions

PRESSURE_SURGE is candidate when at least three of the following occur within a 5-minute window:

| Signal | Threshold |
|---|---|
| Shots | 2+ shots by the same team |
| Corners | 2+ corners won by the same team |
| Saves | 1+ save by the opposing goalkeeper |
| Touches in opposition box | 5+ touches in the opposition penalty area |
| Fouls suffered | 2+ fouls won in attacking positions |
| Offsides | 2+ offside calls against the attacking team (pushing high line) |
| Blocked shots | 1+ shot blocked by a defender |

#### Creation Criteria

- **Must** have at least three signals from the table above within a 5-minute window.
- `team` = the attacking team.
- `importance` = 70 for a surge that includes a shot on target or a save. 30 for a surge that produces no shot on target.

#### Non-Creation Criteria

- Do not create for isolated attacks that do not meet the density threshold.
- Do not create for surges that produce a goal — the GOAL anchor is sufficient. Exception: if the pressure surge preceded the goal by 3+ minutes and the goal is the culmination, create both anchors and link them via `narrative_notes`.
- Do not create during the first 15 minutes of any period (teams are settling). Exception: if 5+ signals are met, override this rule.

#### Importance Guidelines

| Scenario | Importance |
|---|---|
| Surge with shot on target or save | 70 |
| Surge with no shot on target | 30 |

#### Examples

- *PRESSURE_SURGE — France, 75-80'. 3 corners, 2 shots, 1 save in 5 minutes. Importance 70.*
- *PRESSURE_SURGE — Argentina, 10-15'. 2 fouls won, 2 corners, 5 box touches. No shot on target. Importance 30.*

#### Counterexamples

- *A single shot from distance. Does not meet density threshold. Do not create.*
- *Two corners in separate attacks 8 minutes apart. Outside the 5-minute window. Do not create.*

---

### PHASE_CHANGE

#### Definition

A structural transition in match state that resets or recontextualises the playing conditions.

#### Trigger Conditions

PHASE_CHANGE is candidate when the match transitions between any of the following states:

| Transition | Applicable |
|---|---|
| First half → Second half | Always |
| Second half → Extra time | When match enters extra time |
| Extra time 1 → Extra time 2 | When applicable |
| Extra time → Penalty shootout | When applicable |
| Scoreline state 1-0+ becomes level | A two-goal lead is erased |
| Scoreline state level becomes 2-0+ | A two-goal lead is established |
| Weather-induced pause | Official weather stoppage |
| Major injury stoppage (3+ minutes) | Play stopped for treatment |
| VAR review (2+ minutes) | Extended review that disrupts flow |

#### Creation Criteria

- **Must** create for half-time and full-time transitions.
- **Must** create for extra-time and shootout transitions.
- `team` = null (phase transitions are neutral).
- `player` = null.
- `importance` = 60 for tactical transitions. 30 for scoreline transitions.

#### Non-Creation Criteria

- Do not create for every goal — scoreline state transitions require a two-goal change (0-0 → 2-0, or 2-0 → 2-2). A single goal does not constitute a phase change.
- Do not create for routine stoppages (goal kick, throw-in, substitution).
- Do not create for weather delays under 10 minutes unless they visibly affect pitch conditions.

#### Importance Guidelines

| Scenario | Importance |
|---|---|
| Half-time / Full-time whistle | 60 |
| Extra time begins | 60 |
| Shootout begins | 60 |
| Two-goal lead erased | 50 |
| Two-goal lead established | 50 |
| Major injury stoppage | 30 |
| Extended VAR review | 30 |
| Weather stoppage | 20 |

#### Examples

- *PHASE_CHANGE — Half-time, 45'. Importance 60.*
- *PHASE_CHANGE — Two-goal lead erased, 80' (2-2 after 2-0). Importance 50.*

#### Counterexamples

- *A single goal making it 1-0. Do not create (not a phase change).*
- *Routine substitution. Do not create.*

---

### Future Types — INJURY, VAR_DECISION, CROWD_SURGE

These types are recognised but not yet assigned deterministic extraction rules. When encountered during harvesting:

- Use the Candidate Event Types checklist in the harvest template to tag the raw source text.
- Assign a placeholder importance of 30.
- Flag the entry for review during anchor creation.
- Do not convert to a narrative anchor until extraction rules are finalised.

---

## Confidence Assignment Rules

Confidence is assigned per anchor, not per source. A single anchor may draw on multiple sources.

### HIGH

Applies when ALL of the following are true:
- Event is confirmed by FIFA or equivalent official source.
- At least one additional independent source confirms the event without contradiction.
- Minute, period, team, and player are unambiguous.
- Event type is GOAL, PENALTY, CARD, or SUBSTITUTION meeting creation criteria.

### MEDIUM

Applies when ANY of the following are true:
- Event is confirmed by a single reputable source (BBC, ESPN, Guardian, L'Équipe).
- Multiple sources agree on the event but disagree on precise timing (different minute by 1-2).
- Event type is MOMENTUM_SHIFT, PRESSURE_SURGE, or PHASE_CHANGE with at least two measurable signals.

### LOW

Applies when ANY of the following are true:
- Event is derived or inferred from secondary sources.
- Event type is MOMENTUM_SHIFT, PRESSURE_SURGE, or PHASE_CHANGE with exactly the minimum signal threshold and no FIFA-level confirmation.
- A single secondary source reports the event.
- Timing is ambiguous and must be estimated from context.

---

## Anchor Density Controls

### Budget

Target **25–45** narrative anchors per standard 90-minute match. Add up to 10 for extra time. Add 10 for a penalty shootout. Maximum: **65 anchors**.

### Per-Category Caps

| Category | Maximum per match |
|---|---|
| GOAL | No cap (each goal is mandatory) |
| PENALTY | No cap (each award is mandatory) |
| CARD | 10 (yellow cards are capped; red cards are not) |
| SUBSTITUTION | 6 (only tactically/injury-significant subs) |
| MOMENTUM_SHIFT | 6 |
| PRESSURE_SURGE | 8 |
| PHASE_CHANGE | 8 |
| Future types | 4 combined |

### Preventing Duplicates

- **Same minute, same type, same team, same player**: Discard the second occurrence. Merge `source_references`.
- **Same minute, different type**: Allow if both types meet independent creation criteria (e.g., GOAL + PENALTY for a converted penalty).
- **Consecutive minutes, same type, same team**: Allow only if separated by 3+ minutes or if a counter-event (goal for the other side, card, substitution) intervenes.

### Preventing Trivial Anchors

- Do not create MOMENTUM_SHIFT or PRESSURE_SURGE during the first 15 minutes of any period (teams settle).
- Do not create SUBSTITUTION for like-for-like changes in neutral game states.
- Do not create PHASE_CHANGE for single-goal scoreline changes.

---

## Conflict Resolution Rules

### When Multiple Event Types Could Apply

| Scenario | Produce |
|---|---|
| Penalty awarded and converted | PENALTY + GOAL. Do NOT additionally create MOMENTUM_SHIFT unless a second independent signal is present (see MOMENTUM_SHIFT criteria). |
| Penalty awarded and saved | PENALTY only. |
| Offside goal disallowed | VAR_DECISION (future type — flag for review). No GOAL. |
| Goal + red card in same play | GOAL + CARD (two anchors). |
| Goal scored directly from a corner | GOAL only. Do not add PRESSURE_SURGE unless the surge criteria are independently met before the goal. |
| Own goal | GOAL only. Do not create an additional MOMENTUM_SHIFT for the scoring team unless a second independent signal is present. |
| Substitution + tactical formation change | SUBSTITUTION only. Do not create PHASE_CHANGE unless a structural match-state transition also occurs. |
| Player receives second yellow + red | CARD (one anchor). `card_type` = `SECOND_YELLOW`. `narrative_notes` states: *"{Player} shown a second yellow card and dismissed."* |
| Goalkeeper saves penalty + momentum shifts | PENALTY (saved). MOMENTUM_SHIFT only if a second independent signal appears in the following 10 minutes. |

### Precedence Table

When there is any ambiguity about which event type to use:

| Priority | Type | Reason |
|---|---|---|
| 1 (highest) | GOAL | Scoreline change is unconditionally the most important event |
| 2 | PENALTY | Set-piece award with direct score implication |
| 3 | CARD | Disciplinary action with numerical impact |
| 4 | SUBSTITUTION | Personnel change with tactical impact |
| 5 | PHASE_CHANGE | Structural match-state transition |
| 6 | PRESSURE_SURGE | Measurable attacking density |
| 7 | MOMENTUM_SHIFT | Inferred match control change |
| 8 (lowest) | Future types | Not yet fully specified |

Lower-priority types are suppressed when a higher-priority type covers the same moment unless their creation criteria are independently satisfied.

### Cross-Annotation Consistency Check

Before finalising an anchor set, run this checklist:

1. Count all anchors. Is the total between 25 and 45 (or within extended budget)?
2. Are there any duplicate minutes with the same type, team, and player?
3. Does every GOAL and PENALTY anchor have at least one HIGH or MEDIUM confidence source?
4. Does every MOMENTUM_SHIFT anchor have at least two documented signals?
5. Does every PRESSURE_SURGE anchor have at least three documented signals within a 5-minute window?
6. Are all converted penalties paired as PENALTY + GOAL?
7. Are all saved/missed penalties standalone PENALTY anchors?
8. Is every card differentiated as yellow (40), second-yellow dismissal (75), or direct red (85) with the corresponding `card_type` field?
9. Are substitutions filtered to tactically/injury-significant ones only?
10. Is `stoppage_time` populated for any event beyond the regulation minute?
11. Does every HIGH confidence CARD anchor have `card_type` populated as a top-level field?

---

## Summary Reference Table

| Event Type | Mandatory? | Min Signals | Max per Match | Default Importance |
|---|---|---|---|---|
| GOAL | Yes | N/A | No cap | 90-100 |
| PENALTY | Yes (if awarded) | N/A | No cap | 70 (awarded), 90 (saved/missed) |
| CARD | Yes (if shown) | N/A | 10 | 30-85 |
| SUBSTITUTION | Conditional | 1 criterion | 6 | 40-70 |
| MOMENTUM_SHIFT | Conditional | 2 signals | 6 | 30-80 |
| PRESSURE_SURGE | Conditional | 3 signals in 5 min | 8 | 30-70 |
| PHASE_CHANGE | Conditional | N/A | 8 | 20-60 |

---

## Version History

| Version | Changes |
|---|---|
| 1 | Initial anchor rules. |
| 2 | Updated CARD creation criteria per ADR-002: `card_type` is now a top-level field (not inside `detail`). Added cross-annotation check for `card_type` presence on HIGH confidence CARD anchors. Terminology updated to Historical Match Intelligence Pipeline. |
