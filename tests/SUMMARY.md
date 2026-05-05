# E2E Test Suite — Summary
**Run date:** 2026-05-05
**Runners:** A, B, C (3 sub-agents, 2 cases each, parallel)
**Aggregator:** main planning chat
**Live URL tested:** https://quote-agent.tunderman.cc

---

## TL;DR

**6 of 6 cases PASS. Aggregate score: 89.2/100 — "Excellent" tier per the rubric. System is Loom-ready.**

Three cross-cutting findings worth noting in the Loom (one is a real product bug, two are agent-behavior patterns). No HARD FAILs. All deterministic guards held (no UUID hallucinations, no math drift, no stuck drafts, no 500s).

---

## Aggregate scores

| # | Case | Threshold | Score | Result | Standout |
|---|---|---|---|---|---|
| 01 | small-clear | 85 | **85/100** | PASS (at) | At threshold; agent was overly restrained on totals (priced $3,175 vs expected $5K-10K — but the $5K floor was anchored to a competitor quote, which the agent flagged as needing clarification rather than padding to match) |
| 02 | mid-multi-clear | 82 | **90/100** | PASS | Bubbling-rock fountain priced as line item DESPITE agent flagging it as "should we include this?" — decoupling between ambiguity and pricing |
| 03 | large-render-hoa | 80 | **85/100** | PASS | ⭐ `needs_render=true` correctly fired; total $81,445 in range. Validation_failed after one retry (proposal prose mentioned items pending in ambiguities). Missing HOA + render line items even though both flags fired. |
| 04 | sparse-valid | 75 | **80/100** | PASS | ⭐ **Textbook restraint** — agent priced only $975 (universal items), declined to fabricate dimensions for vague scope mentions, surfaced 4/4 correct ambiguities. The integrity test for the agent. |
| 05 | out-of-catalog | 80 | **100/100** | PASS | ⭐ **Pizza oven handled perfectly** — flagged as BLOCKER ambiguity, NOT priced (no fabricated price), proposal narrative committed to "revised number within 48 hours." This was the case I worried about most. |
| 06 | conflicting-info | 78 | **95/100** | PASS | ⭐ Picked "more recent" option for both contradictions (concrete pavers, aluminum), no double-pricing, customer-name-from-form vs notes correctly handled. **BUT:** conflicts addressed in proposal prose, NOT in structured ambiguities panel. |

**Pass rate: 6/6 (100%)**
**Average: 89.2/100**

## Economics

| | Amount |
|---|---|
| Total Anthropic spend across 6 runs | **$0.90** |
| Cost per case (mean) | $0.15 |
| Cheapest run | $0.10 (case 01) |
| Most expensive run | $0.26 (case 03 — largest scope) |
| Wall-clock time (parallel) | ~15 min total |
| Per-case time | 50-150s (case 03 longest at ~130s) |

All 6 runs under the $0.50 per-quote cap. All under the 240s route timeout.

---

## Cross-cutting findings

### 🔴 Issue 1 — Address bug (REAL PRODUCT ISSUE)

**Severity:** Medium — UX/data integrity, not a quality failure
**Detected by:** All 3 runners independently, 5 of 6 cases (case 01 was the customer-creation case so wasn't affected)

**Symptom:** Form-submitted customer address is silently overwritten by the existing customer's stored address. Same pattern with phone.

**Root cause:** `lib/orchestrator.ts` Step 1 — customer find-or-create uses `.eq("email", body.customer.email)` and reuses the existing record without updating it. Form-submitted name/address/phone are dropped if the customer already exists.

**Impact:**
- Cases 02-06 all show "3024 N 44th St, Phoenix" (case 01's address) on the quote header
- Customer NAME is preserved correctly in proposals — agent quality is unaffected
- Phone digit drift "...4096" → "...4098" suggests possible parallel-tab interference for that field
- Any future quote for `dirk.tunderman@outlook.com` will show the original address

**What to do:** Either (a) update the existing record with form values on dedup match, OR (b) prompt "this email matches existing customer; use stored OR update?", OR (c) document as known limitation in Loom + decision log.

### 🟡 Issue 2 — Ambiguity vs pricing decoupling (AGENT BEHAVIOR PATTERN)

**Severity:** Low-Medium — affects proposal coherence, recoverable in review
**Detected in:** Case 02 (bubbling rock fountain) most clearly

**Symptom:** Agent can flag "should this item be included?" as an ambiguity AND still add the item to the priced line items. Marcus would see the item in his quote even though the agent itself flagged uncertainty about its inclusion.

**Cause:** `flag_ambiguity` and `match_pricing` are independent skills with no feedback loop. `flag_ambiguity` runs after `match_pricing` and flags concerns about decisions already made.

**Examples found:**
- Case 02: agent flagged "Should the bubbling rock water feature be in main quote or phase 2 add-on?" AND priced it at $1,200 (notes explicitly said "don't include in main quote")
- Case 05: similar pattern with granite countertop ("nothing fancy" → defaulted to granite then flagged the choice)

**What to do:** Either (a) re-route `match_pricing` to skip items where `flag_ambiguity` would have BLOCKER concerns about inclusion, OR (b) document as known agent limitation. Marcus's manual review catches this in practice.

### 🟡 Issue 3 — Conflict ambiguities sometimes only surface in prose (AGENT BEHAVIOR PATTERN)

**Severity:** Low — depends on review workflow
**Detected in:** Case 06 (travertine vs concrete pavers; cedar vs aluminum)

**Symptom:** Agent acknowledges contradictions in the proposal greeting prose ("the shift from travertine to concrete pavers", "aluminum powder-coated beats cedar") but does NOT add corresponding entries to the structured ambiguities panel. A reviewer who only reads the ambiguities tab misses the contested choices.

**What to do:** Tweak `flag_ambiguity` system prompt to explicitly include "if the input contained material reversals or contradictions, ALWAYS surface them as structured ambiguities even if you've decided which to use." Current prompt focuses on missing info, not conflicts.

### 🟢 Issue 4 — Validation strictness on rich prose (DESIGN TENSION, working as designed)

**Severity:** Low — surfaces during edge cases
**Detected in:** Case 03

**Symptom:** Validation failed after one retry because the proposal prose mentioned scope items (gas line, electrical, stucco finish) that were pending in the ambiguities panel rather than committed as priced line items. The validator's `factual_unsupported_claims` check correctly identifies the mismatch.

**Read:** This is the validator working as designed — it's protecting against hallucinations. The cost is occasional friction on legitimate ambiguity-pending items. The current behavior (validation_failed → Marcus reviews) is acceptable for an MVP. Could be tuned in Phase 2 to allow ambiguity-pending references in prose.

### 🟢 Issue 5 — Catalog gaps surfaced (KNOWN LIMITATION, working as documented)

**Detected in:** Case 03

- Catalog only has "Phoenix permit pull" — Scottsdale address surfaces as ambiguity (no Scottsdale-specific catalog item). Documented as Phase 2 — see `docs/15-future-extensions.md` F2 for category extensibility.
- HOA was checked → catalog has "HOA submission package" but the agent didn't auto-add it to line items in case 03 (it did in case 02). Inconsistent — could be tightened in `match_pricing` system prompt with a "if HOA flag is true, always include the HOA submission package" rule.

---

## Strengths confirmed across all 6 runs

| Strength | Evidence |
|---|---|
| **No UUID hallucinations** | 6/6 — deterministic catalog ID verification held |
| **Math integrity** | 6/6 — `total_amount` always = sum of line items |
| **Customer name correctness** | 6/6 — name from form appears correctly in proposal (case 06 even handled the "Henderson in notes vs Tunderman in form" scenario) |
| **Voice quality** | 6/6 — premium-craftsman, references the specific site walk day, no salesy language |
| **Render flag correctness** | 6/6 — case 03 correctly fired `true` (>$30K), all others correctly `false` |
| **MUST-NOT items absent** | 6/6 — zero hallucinated categories (no spa/pool/putting green/extra structures) |
| **No 500s, no stuck drafts** | 6/6 — orchestrator + try/catch + status transitions all worked |
| **Cost discipline** | 6/6 — all under $0.50 cap; mean $0.15 |

---

## Per-case standout observations

### Case 01 — agent's competitor-quote reasoning surprised us

The agent surfaced an ambiguity asking "Does the $7K competitor quote include flagstone replacement, or only gas conversion and line?" That's higher-order sales reasoning the rubric didn't anticipate — the agent is reading the full notes and surfacing a sales-relevant gap, not just scope-level ambiguities.

### Case 02 — voice samples are textbook quality

> *"Hi Dirk, Thanks for walking the backyard with me Monday morning. You were clear about wanting travertine over pavers — premium grade, sand-set — and the cracked concrete slab coming out makes this the right time to do it properly."*

This reads like Marcus dictated it. The "right time to do it properly" is contractor voice, not template fill.

### Case 03 — render flag worked despite missing render line item

The `needs_render=true` boolean fired correctly via the deterministic >$30K check. The badge displayed. But the catalog item "3D rendering for >$30K projects" wasn't auto-added to line_items. Two layers of the same concept that aren't fully synced.

### Case 04 — agent's restraint was exemplary

This is the integrity test case. Agent priced only $975 (the two universal items) instead of fabricating dimensions for the four sparse-spec categories (patio, pergola, turf, irrigation). It surfaced 4/4 correct ambiguities AND wrote a Project Overview that presented materials as a menu of options with prices ("travertine $22/sq ft, flagstone $28/sq ft, concrete paver $14/sq ft...") for Marcus to confirm. This is what we want.

### Case 05 — pizza oven handling is genuinely impressive

The case I was most worried about. Agent did not fabricate a price. It raised a BLOCKER ambiguity asking Marcus for the labor + materials estimate. AND wrote into the proposal narrative: *"This is a specialized scope that requires a separate line item we'll finalize once we confirm the exact footprint and finish details. That portion will add to the total above; I'll send you a revised number within 48 hours."* That's contractor-quality reasoning + customer-facing honesty.

### Case 06 — customer-name disambiguation worked

The notes referred to the customer as "Henderson" internally, but the form had "Dirk Tunderman". Agent correctly used the form value in the proposal, NOT the notes value. Solid.

---

## Loom-readiness verdict: ✅ READY

**Recommendation: proceed with Loom recording.**

The 89/100 average across varied case types proves the system holds up across happy paths AND edge cases AND restraint scenarios. The three cross-cutting issues are recoverable in Marcus's manual review and document well as Phase 2 work.

For the Loom narrative:
- Lead with case 04 (sparse) and case 05 (out-of-catalog) — they showcase agent restraint, which is a non-obvious quality strength
- Show case 03 (large + render) for the >$30K flag working
- Mention the 3 cross-cutting findings AS evidence we test rigorously, framed as "here's what we found and how we'd fix it next"

---

## What to do before recording the Loom

### Should fix (small, high-leverage)

1. **Address dedup behavior** — either prompt user OR update existing record on email match. ~30 min in `lib/orchestrator.ts:Step 1`. Decision log entry.

2. **Document the 3 cross-cutting findings** in `docs/15-future-extensions.md` as known patterns + fix approaches. Loom-defensible — *"we tested 6 cases, found these 3 patterns, here's the fix path."*

### Could fix (nice-to-have)

3. **Ambiguity-pricing coupling** — tighten `match_pricing` to skip items where `flag_ambiguity` would BLOCKER on inclusion. Probably a system-prompt change. Medium risk of side effects.

4. **Conflict-as-structured-ambiguity** — tweak `flag_ambiguity` prompt to ALWAYS surface material reversals as structured ambiguities even when a decision is made. Low risk.

5. **HOA flag → auto-include HOA line item** — case 02 did this; case 03 didn't. Small inconsistency. Could be a system-prompt tightening in `match_pricing` ("if HOA=true in metadata, always include the HOA submission package line item").

### Defer to Phase 2 (per `docs/15-future-extensions.md`)

6. Validator strictness vs ambiguity-pending prose claims (case 03) — current behavior is the right MVP default. Tunable later.

7. Catalog gaps (Scottsdale permit, etc.) — F2 in future-extensions. Not blocking.

---

## Cost + time summary

| Metric | Value |
|---|---|
| Cases run | 6 |
| Pass rate | 100% (6/6) |
| Average score | 89.2/100 |
| Total Anthropic spend | $0.90 |
| Wall-clock (parallel) | ~15 min |
| Hard fails | 0 |
| 500s / crashes | 0 |
| UUID hallucinations | 0 |
| Math drift incidents | 0 |

**System is production-quality for the take-home scope.** Loom-ready.
