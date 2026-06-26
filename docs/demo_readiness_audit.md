# Kronos Demo Readiness Audit

**Date:** 2026-06-24
**Auditor:** Hackathon judge simulation
**Overall Score:** 7/10

---

## 1. Executive Summary

Kronos is structurally complete with a clear 5-page narrative arc (Landing → Command Center → Swarm Intelligence → Debate Transcript → Granite Intelligence Center). The mission-control aesthetic is consistent and attractive. However, a first-time judge will encounter several friction points:

- The **Debate Transcript** is misnamed — it shows only the current minute, not a scrollable history
- A **debug panel** is visible on the War Room page
- **Key data repeats across 3+ pages** with no differentiation (validation metrics, fracture index, granite status each appear in War Room, Debate Transcript, and Granite Intelligence)
- **No initial guidance** when the SSE stream isn't connected — every page just says "Awaiting..."
- The **IBM/Granite story is unclear** because Granite AI is blocked (403); the demo runs in mock mode without explaining what Granite would do differently

---

## 2. Priority-Ranked Issue List

### CRITICAL

| # | Page | Issue |
|---|------|-------|
| 1 | War Room | **`KronosDebugPanel` is visible to end-users.** Leftover dev tool showing raw minute/fracture/chaos/history count. Unacceptable for demo. |
| 2 | Debate Transcript | **Shows only the current minute.** A "transcript" implies a historical record. A judge scrolling through sees a single minute with 5 agents + validation + granite + coach — it looks like the War Room in a different layout, not a transcript. The page is effectively a duplicate of the Granite Intelligence decision trace in less useful form. |
| 3 | All pages | **No SSE connection feedback.** When the backend isn't running, every page displays passive "Awaiting..." text with no indication that the system is attempting to connect, retrying, or how to start the stream. A judge opening the app cold sees 5 empty pages. |

### HIGH

| # | Page | Issue |
|---|------|-------|
| 4 | All pages | **Duplicate data across pages.** Fracture index appears in: War Room (header + SwarmPanel + FractureTimeline + LeadCoachVerdict + ValidationCenter), Swarm Intelligence (metric card + DEBATE stage), Debate Transcript (header), Granite Intelligence (overview + DEBATE stage) — **appears 9+ times** across the platform. Same pattern for chaos, confidence, agreement, contradictions. The pages don't have differentiated value. |
| 5 | Granite Intelligence | **Escalation Overview "UNAVAILABLE" status has no graceful messaging.** The escalation card says `"Unavailable"` while the GRANITE REVIEW stage below has the careful three-line degradation message. Inconsistent framing within the same page. |
| 6 | All pages | **"Awaiting..." is the only empty state.** No CTA, no explanation, no visual indicator of connectivity. A judge needs to know: "Start the SSE server on port 3000" — that's not communicated anywhere in the UI. |
| 7 | Granite Intelligence | **`CONFIDENCE` escalation card no longer shows a threshold description** since the `confidenceLabel` replacement. It shows `HIGH CONFIDENCE` or similar, but loses the previous "Adequate"/"Low confidence" description that helped interpret the number against thresholds. |
| 8 | LeadCoachVerdictPanel | **Fragile string check for Granite unavailability.** Line 108: `granite_review.review_summary.toLowerCase().includes("unavailable")` — this is a brittle heuristic that couples frontend display logic to backend prose content. The `skipped` flag already exists and is used elsewhere. |

### MEDIUM

| # | Page | Issue |
|---|------|-------|
| 9 | Debate Transcript | **`TranscriptSection` always says "MINUTE N"** but only ever renders a single minute block. The vertical timeline spine implies scrolling history, but there's only one section. |
| 10 | War Room | **Too much information on one page.** 9 components stacked vertically. ValidationCenter + GraniteTerminal + FractureTimeline are all full-width blocks that force heavy scrolling. The page lacks a clear visual hierarchy or summary. |
| 11 | Granite Intelligence | **"ESCALATION STATUS" card shows `UNAVAILABLE` in gray text** — looks like a system failure. The graceful degradation three-line message is only in the GRANITE REVIEW stage below, so the overview card contradicts the detailed view. |
| 12 | Granite Intelligence | **The 6-stage Decision Trace is tall and forces scrolling** — all 6 stages plus arrows plus data grids. Combine with Escalation Overview above and it's ~2500px of content before the page bottom. No collapsible sections or sticky headers. |
| 13 | All pages | **`score_away ?? 0` renders "0" when no score data exists.** If the backend hasn't sent score data, the UI shows "2 – 0" which looks like a real scoreline rather than "—". Same issue exists in any page displaying scores. |
| 14 | AgentIntelligenceCard | **Duplicated `parseProvider` logic.** Both `AgentIntelligenceCard` and `DebateTranscript` extract the provider from verdict text using similar but slightly different logic. This logic should be shared. |
| 15 | All pages | **No keyboard navigation.** The nav links work, but there's no way to move between pages via keyboard shortcuts. For a demo scenario where a judge is driving, this is a minor but noticeable gap. |
| 16 | Landing | **No page order indicator.** The 4 cards are in a 2x2 grid with no numbering, arrow, or suggested reading order. A judge may click randomly rather than following the narrative arc. |

### LOW

| # | Page | Issue |
|---|------|-------|
| 17 | Granite Intelligence | **Confidence classification uses `text-[9px]` in VALIDATE/GRANITE stages but `text-[10px]` in the overview card.** Minor sizing inconsistency. |
| 18 | Landing | **No favicon or page title.** The browser tab just shows the Vite default title. |
| 19 | All pages | **No timestamp on events.** The `KronosEvent` has a `timestamp` field, but no page renders it. A judge can't tell when events occurred relative to each other. |

---

## 3. IBM Story Assessment

| Question | Verdict |
|----------|---------|
| Can a judge clearly see Granite usage? | **Partially.** "GRANITE REVIEW TERMINAL" and "IBM GRANITE REVIEW LAYER" labels exist on War Room. Granite Intelligence Center has a dedicated page. But Granite AI inference is blocked (403) — the demo runs in mock mode without ever explaining that Granite is an IBM watsonx.ai model that would provide deeper analysis if available. |
| Can a judge see the validation workflow? | **Yes.** The pipeline is visible in the Granite Intelligence Center Decision Trace: VALIDATE stage shows heuristic validation with flags and evidence. The "SWARM VALIDATION LAYER" badge appears in ValidationCenter. |
| Can a judge see explainability? | **Yes on Granite Intelligence, weak elsewhere.** The Decision Trace is the best explainability page. However, explanation is limited because the mock provider generates template-based text rather than real reasoning. |
| Can a judge see decision provenance? | **Yes on Granite Intelligence.** The 6-stage trace from OBSERVE → RECOMMENDATION is clear. But the Debate Transcript page partially undermines this by showing the same data in a different format, creating confusion about which page is the "source of truth." |

**Bottom line**: The Granite Intelligence Center carries the entire IBM story. War Room shows Granite exists but doesn't explain it. The other pages don't reference IBM or Granite at all.

---

## 4. Platform Narrative Assessment

| Question | Page | How well does it answer? |
|----------|------|--------------------------|
| What happened? | War Room | **Good** — telemetry, events, swarm metrics in one view. But overwhelming with 9 components. |
| What do the agents think? | Swarm Intelligence | **Good** — 5 agent cards with risk levels and rationale. Clear and focused. |
| How did they reach that conclusion? | Debate Transcript | **Weak** — only shows the current minute. Doesn't function as a historical transcript. Actually less informative than the Granite Intelligence decision trace. |
| Why should we trust the result? | Granite Intelligence | **Strong** — the 6-stage decision trace is the best page. But the escalation overview cards could be better integrated with the trace. |

**Narrative gap**: The Debate Transcript page is the weakest link in the narrative chain. It doesn't fulfill its implied promise of a scrollable chronological record. A judge landing on it sees essentially the same data as War Room/Granite Intelligence but in a less useful timeline that only shows one minute.

---

## 5. Demo Readiness

### Best pages for screenshots
1. **Granite Intelligence Center** — Decision Trace with 6 colored pipeline stages
2. **War Room** — Full dashboard with chart, telemetry grid, event feed (hide debug panel first)
3. **Swarm Intelligence** — 5 agent cards with color-coded risk levels

### Best pages for demo recording
1. **Granite Intelligence Center** — Scroll down the Decision Trace to show the full provenance chain
2. **War Room** — Show real-time telemetry updates, event feed populating, fracture timeline growing
3. **Landing** → **Granite Intelligence** — Follow the narrative arc in ~30 seconds

### Strongest judge wow moments
1. **Decision Trace** — The 6 colored pipeline stages with live data feel like a real AI audit system
2. **Fracture Timeline** — recharts line chart with event markers looks professional
3. **Agent color coding** — 5 agents with distinct colors and risk levels feels like a real swarm

### Weakest page in the platform
**Debate Transcript** — Misleading name, only shows current minute, duplicates data from other pages, doesn't fulfill its narrative promise. If I had to cut one page before demo, this would be it.

---

## 6. Top 5 Improvements Before Submission

| Rank | Change | Impact | Effort |
|------|--------|--------|--------|
| 1 | **Remove `KronosDebugPanel` from War Room** | Eliminates embarrassing dev artifact | 1 line |
| 2 | **Fix Debate Transcript to show multi-minute history** (or rename to "Current Debate" / "Agent Feed") | Fixes the biggest narrative/trust gap | Medium (or rename: 1 line) |
| 3 | **Add SSE connection status indicator** to CommandHeader (green dot when connected, red when disconnected, pulsing when connecting) | Solves the "empty app" problem for cold-start judges | Small |
| 4 | **Differentiate page content** — reduce data duplication so each page has a unique purpose. At minimum, remove validation/granite details from Debate Transcript and link to Granite Intelligence instead | Clarifies the platform narrative | Medium |
| 5 | **Fix `score_away ?? 0` → `score_away ?? "—"`** everywhere | Prevents misleading score display when no data | 2 lines per occurrence |

The first fix is a 1-line change with outsized impact. Items 2 and 3 are the most important for demo credibility.
