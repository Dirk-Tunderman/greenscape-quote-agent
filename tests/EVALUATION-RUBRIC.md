# Evaluation Rubric

Shared scoring criteria across all 6 test cases. Each case has its own pass thresholds and emphasis, but everyone uses this rubric.

---

## Core dimensions (every case scores against these)

### A. Status correctness — 15 points

| Outcome | Points |
|---|---|
| Status matches expected (`draft_ready`) on first try | 15 |
| Status matches expected after exactly 1 corrective retry | 10 |
| Status is `validation_failed` when case expected `draft_ready` | 0 |
| Status is `validation_failed` AND case expected it | 15 |

### B. Total amount in expected range — 15 points

Each case specifies a `$X – $Y` range.
- Within range: **15**
- Within ±15% of either bound: **10**
- Within ±30% of either bound: **5**
- Outside ±30%: **0**

### C. Line item count appropriate — 10 points

Each case specifies an expected count range.
- Within range: **10**
- ±2 of range: **5**
- Beyond ±2: **0**

### D. Ambiguity surfacing — 10 points

Each case specifies expected ambiguity count + key topics.
- Count within range AND at least one topic correctly identified: **10**
- Count off but topics correctly identified: **5**
- Either: ambiguities not raised when they should be, OR ambiguities invented for clear inputs: **0**

### E. Render flag (`needs_render`) — 5 points

- `needs_render` matches expected boolean (true if total >$30K, false otherwise): **5**
- Mismatched: **0**

### F. Required scope items present — 20 points

Each case lists scope items that MUST be present. Score:
- All present: **20**
- ≥80% present: **15**
- ≥60% present: **10**
- <60%: **0**

### G. No hallucinated items — 15 points

Penalize line items the agent invented that weren't in the notes. The case lists explicit "MUST NOT include" items.
- Zero hallucinations: **15**
- 1 minor hallucination (small item, low $): **10**
- 2+ hallucinations OR 1 major: **0**

### H. Voice & polish — 5 points

Per `docs/06-assumptions.md` Section 4 voice spec:
- Premium-craftsman tone, references the site walk specifically: **5**
- Generic/template-y but not salesy: **3**
- Salesy ("amazing", "stunning", "perfect") OR generic stock greeting: **0**

### I. Cost + time within budget — 5 points

- Cost ≤ $0.30 AND time ≤ 180s: **5**
- Cost ≤ $0.50 AND time ≤ 240s: **3**
- Either over the cap (D14 / route timeout): **0**

---

## Total: 100 points per case

**Pass threshold:** 80/100 by default. Cases override if they're testing a stricter or looser dimension.

## Aggregate scoring across the 6 cases

- **Excellent**: ≥85 average — Loom-ready, system holds up
- **Good**: 75-84 average — Loom-ready with caveats; flag known weak spots in Loom
- **Concerning**: 60-74 — fix issues before Loom; surface in decision log
- **Bad**: <60 — agent has fundamental quality issues; do not record Loom yet

---

## How to capture observations

The result file (template in `tests/SUB-AGENT-INSTRUCTIONS.md`) requires per-dimension actual vs expected, plus a free-text "what went wrong / what surprised me" section. **Be specific.** Don't write "ambiguities looked OK" — write "agent surfaced 2 ambiguities (pergola finish, irrigation zone count); both relevant; expected was 1-2, so within range."

## Things that DON'T count against scoring (but should be noted)

- PDF font fallback to Helvetica/Times (known issue per `docs/11-current-state.md`)
- Specific category labels (e.g., "outdoor_lighting" vs "Outdoor Lighting" — the agent normalizes)
- Minor formatting differences in proposal markdown — focus on substance

## Things that DO count beyond the rubric (auto-fail)

If the test exposes any of these, mark the case as **HARD FAIL** regardless of score:
- Hallucinated UUIDs that pass through to a quote (catalog ID verification failed)
- Customer name appearing wrong in proposal (mismatched from input)
- Proposal total ≠ sum of line item totals (deterministic validator should have caught this)
- Quote stuck in `drafting` status (orchestrator failed to commit; ghost row)
- Crash / 500 from the API
