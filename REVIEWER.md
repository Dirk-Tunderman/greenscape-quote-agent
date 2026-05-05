# Reviewer Walkthrough

How to evaluate this submission. Should take you ~10 minutes for the live demo, plus reading time for whichever docs you want to dig into.

---

## 1. The deliverables (the four submission items)

| | Where | Time to read |
|---|---|---|
| **Strategy doc** (Part 1) | [`strategy.md`](./strategy.md) | ~5 min |
| **Live URL** (Part 2) | https://quote-agent.tunderman.cc | ~5 min hands-on |
| **GitHub repo** | this repo | browse `lib/` + `app/api/` for ~5 min |
| **Loom walkthrough** | submitted via email | ≤5 min |

---

## 2. The live app — what to try

Live at **https://quote-agent.tunderman.cc**. No login, single-tenant. Six pre-existing quotes are visible on the list view from the e2e test suite — feel free to click into them, edit, regenerate PDFs.

### Path A — see the agent chain run end-to-end (~3 min)

1. Click **"New quote"** (top right or list view button)
2. Fill the customer form. Use a different email than the existing test rows so you create a fresh customer record.
3. **Project title:** anything (e.g., "Backyard refresh")
4. **Site walk notes:** paste *one* of the test cases below — they're known-good inputs. Or write your own.
5. Submit. Agent runs in ~50–150s depending on scope size. Watch the loading state. You'll redirect to the quote detail page when it's done.
6. On the quote page: review the extracted scope, ambiguities, line items, and 8-section proposal draft. Edit any of them. Click **"Re-generate PDF"** to download the proposal.

### Test inputs you can paste

**Small / clear:**
```
Site walk: front yard turf swap. ~400 sq ft of grass to remove and haul, replace with 75oz pet-rated artificial turf. Customer wants drip irrigation for the perimeter planters — 2 zones plus a smart controller. Budget around $5K-10K.
```

**Mid / multi-category:**
```
Backyard refresh — 350 sq ft travertine paver patio (premium, French pattern), 12x12 cedar pergola with lighting package, 3 drip irrigation zones, smart controller. Customer mentioned a bubbling rock fountain near the seating area but said don't include in main quote — phase 2 add-on possibly. Caliche soil confirmed when I dug a test hole.
```

**Sparse but valid (tests agent restraint):**
```
Backyard. They want pavers, a pergola maybe, some grass but artificial. Need to grab dimensions on the next visit. Talked about a fire feature too. Budget vague — "premium but reasonable".
```

The "sparse" one is a stress test — the agent should price only what it knows confidently and surface ambiguities for the rest, not invent dimensions.

### Path B — verify human-in-the-loop control (~2 min)

On any existing quote (e.g., the $81,445 full-backyard rebuild):

1. Edit a line item's quantity or unit price inline. Save. Project total recalculates.
2. Add a line item via "+ Add line item". Set category, unit, quantity, price. Save.
3. Edit a customer field (name, email, address). Save. Persists to the customer record (shared across that customer's quotes).
4. Edit a proposal section (Project Overview, Exclusions, Timeline, etc.). Click "Save proposal".
5. Re-generate the PDF. Note that "Detailed Scope & Pricing" auto-derives from the live line items — single source of truth, no drift.

### Path C — verify guardrails (~1 min)

Try to break the agent:

1. Submit a recipe or random text via the new-quote form (`raw_notes` field). The pre-flight Haiku check (D41 Skill 0) should reject it with a clear error before any expensive LLM calls run.
2. Submit a 5-character note. Form validation rejects (`min 30 chars`).
3. Submit something extremely vague like *"I want to do something with my backyard"*. Pre-flight likely passes; `extract_scope` returns its `__no_scope` exit; you get a quote in `validation_failed` state with the reason logged in the audit trail.

### Path D — the catalog (~1 min)

Click **"Catalog"** in the top nav. 58 line items across 8 categories. Add a new item. Add a new category (try "Outdoor Lighting" — gets snake_cased to `outdoor_lighting`). The agent picks up new categories on the next quote — no code change, no restart.

---

## 3. The GitHub repo — where to look

If you have ~5 min to skim code:

| File | Why look |
|---|---|
| [`lib/orchestrator.ts`](./lib/orchestrator.ts) | The 5-skill chain wired up. ~370 lines. Sequential, with explicit retry budget + cost cap |
| [`lib/skills/`](./lib/skills/) | The 5 (well, 6 incl. pre-flight) skills. Each is a single file with system prompt + zod-validated output |
| [`lib/skills/match_pricing.ts`](./lib/skills/match_pricing.ts) | The most interesting skill — uses Anthropic tool-use multi-turn against the live catalog, then verifies returned IDs against the DB to reject hallucinated UUIDs |
| [`lib/skills/validate_output.ts`](./lib/skills/validate_output.ts) | The output gate — deterministic checks (line totals, structure) + LLM checks (factual claims, custom-item bleed) |
| [`app/api/agent/draft/route.ts`](./app/api/agent/draft/route.ts) | The single agent invocation endpoint |
| [`supabase/migrations/`](./supabase/migrations/) | 5 SQL files. `001_init_schema.sql` is the load-bearing one |

Commit history (`git log --oneline`): 42+ commits, no mega-commit. The largest single commit is the foundation scaffold (Next.js + deps + types). Subsequent commits are scoped to specific features.

---

## 4. The strategy doc — what to challenge

[`strategy.md`](./strategy.md) is opinionated by design. The brief specifically rewards:

- **Pushing back on the founder's stated priorities with evidence** — we cut his stated #4 (marketing) entirely and demote his stated #3 (crew coaching) to our #5, citing the auditor's exact "candidate trap" math
- **Identifying a non-obvious pain point** — Post-Sign Coordination is at our #4; Marcus didn't list it
- **Calling out interdependencies** — Pre-Qual at #3 is justified partly on its data-feeding interdependency with Quote Agent #1
- **Honest acknowledgment of trade-offs** — bottom of strategy doc lists the considered-but-cut agent (Customer Communication) with reasoning

**The contestable choice you should ask about:** why is Pre-Qualification at #3 ($15–30K direct revenue) above Post-Sign Coordination at #4 ($224–336K delayed revenue)? See [`docs/build-process/09-decision-log.md`](./docs/build-process/09-decision-log.md) D3 for our defense — three reasons in order of weight: speed-to-value (1–5 day build vs 4–6 weeks), explicit interdependency with #1, and indirect capacity unlock from reclaimed Marcus hours converting to extra site walks.

---

## 5. Test evidence

[`tests/`](./tests/):
- `SUMMARY.md` — aggregate (6/6 PASS, 89.2/100 average) + 3 cross-cutting findings
- `EVALUATION-RUBRIC.md` — the 100-point scoring rubric we held the agent to
- `cases/` — the 6 test inputs (small/clear, mid/multi, large/render-HOA, sparse, out-of-catalog, conflicting-info)
- `results/` — raw agent outputs for each run

The address-dedup bug found by all 3 test runners is documented in `docs/15-future-extensions.md` as F14b (deferred to Phase 2; doesn't affect proposal quality).

---

## 6. What's deliberately not built (the honest list)

From [`docs/11-current-state.md`](./docs/11-current-state.md) "What it does NOT do":

| Cut from MVP | Reason | Phase |
|---|---|---|
| Customer-facing email send on approval | Conflated artifact generation with sales action — Marcus owns the relationship; system shouldn't auto-send (D32) | 2 |
| GHL CRM push on approval | Needs OAuth setup + custom field mapping | 2 |
| Stripe deposit invoice generation | Marcus's existing Stripe flow handles this | 2 |
| DocuSign signature flow | GHL has this natively | — |
| Photo upload + vision LLM grading | Phase 3, not blocking core flow | 3 |
| Voice memo input | ✅ Actually shipped via Deepgram (D43) | — |
| Multi-tenant auth | Single-tenant by design (one Marcus) | — |
| Customer portal | Big build, not blocking core value prop | 3 |
| Real ROC license + insurance | Greenscape is fictional; columns kept for forward-compat | — |

For the full deferred-work roadmap with effort estimates, see [`docs/15-future-extensions.md`](./docs/15-future-extensions.md).

---

## 7. Where reasoning lives

If you're wondering *why* something looks the way it does, the answer is in [`docs/build-process/09-decision-log.md`](./docs/build-process/09-decision-log.md). 48 decisions across strategy, build, documentation, coordination, research-corrections, and post-deploy iteration. Each one has: decision, why, considered alternatives, what would change the call.

If you want a quick orientation: D1–D7 are the strategy ranking, D8–D18 are the core build, D26–D30 are the industry-research-driven changes (8-section template, allowance items, voice spec), D31–D48 are post-deploy iteration based on actual usage.

---

## 8. Known limitations (we got ahead of these)

From [`docs/11-current-state.md`](./docs/11-current-state.md):

- PDF uses Helvetica/Times instead of branded Inter/Cormorant (Google Fonts CDN URL 404'd; Day-1 swap once a font asset pipeline lands)
- Audio path lacks pre/post quality checks (typed-notes path has 3-layer gating; audio is single-layer)
- Customer dedup by email only — same-email re-use silently overwrites form-submitted address (documented as F14b, Phase 2 fix)
- Cost tracking is per-call, no daily/monthly aggregate
- Validate-on-fail retry budget is fixed at 1 (not graduated)

---

## 9. Tear it down when done

Temporary 1-week deploy. To wipe the Hetzner server cleanly: `scripts/teardown.sh` (idempotent, confirmation-gated).

---

If anything's broken or unclear during the demo, that's a real bug — please flag it. The brief specifically calls out "shipping something that demos but breaks if you click outside the happy path" as a fast way to lose points; we tested 6 cases and ran path A/B/C above repeatedly, but adversarial usage will surface things we missed.
