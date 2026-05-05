# 09 — Decision Log

Every key decision made during the strategy + planning phase, with the **reasoning** behind it. Future chats should read this before changing any of these — they're not arbitrary choices.

Each entry: **Decision · Why · Considered alternatives · What would change the call.**

---

## Strategy decisions

### D1 · Quote Drafting Agent at #1 (not Reactivation)

**Why:** It's the only agent that attacks the actual business constraint (Marcus's bandwidth on quote drafting, 6-9 days, 35-40% qualified leads lost to speed). Auditor confirmed in the discovery call (transcript line 21): *"single highest-leverage intervention."* Compounds forever (Y2+ ~$1.5M+/yr). Even at conservative 20% recovery rate, ~$1M Y1.

**Considered:** Reactivation as #1 (had higher Y1 ROI per build dollar at ~35x vs Quote agent's 4-7x at full build).

**What flipped it back:** Phased build approach. Quote agent doesn't have to be a 6-month monolith — Phase 1 ships in 2 weeks (text input + scope extraction + draft + review/approve), comparable time-to-value to Reactivation. With phasing, Quote agent's Y1 ROI rises to 15-25x, and it dominates Y2+.

**Would change call if:** Marcus's actual recovery rate from speed is closer to 5-10% than 20% — then Reactivation's $784K Y1 dominates. We model 20% conservatively; refine post-launch.

### D2 · Reactivation at #2 (not Post-Sign Coordination)

**Why:** $784K is the largest single doc-anchored Y1 number (auditor math, transcript line 61). Doesn't consume Marcus. Ships in 2-3 weeks. Marcus's own validation of the channel: *"When it feels like Marcus is reaching out personally, people respond."* (line 59).

**Considered:** Post-Sign at #2 because of operational severity ($224-336K delayed revenue at any moment).

**Why Reactivation won:** Larger absolute dollar, faster ship, lower technical risk. Post-Sign benefits crew utilization (assumption-based) while Reactivation benefits are fully doc-anchored.

### D3 · Pre-Qualification at #3 (against the "absolute revenue ranking" logic)

**Why:** This was contested. Final position #3 driven by three weighted reasons:
1. **Speed of execution** — 1-5 day build, ships in week 1, fastest of any agent. Quick win = trust currency for the bigger #1-2 builds.
2. **Direct interdependency with #1** — structured intake data feeds the quote agent's scope extraction; brief explicitly rewards calling out interdependencies.
3. **Risk-adjusted leverage** — standalone $ small ($15-30K direct), but indirect capacity unlock from reclaimed Marcus hours = $75-150K/yr (1-2 extra site walks/wk × 70% close × $28K).

**Considered:** Pre-Qual at #5 (initially) or cut entirely. Promoted by the user with valid argument that absolute revenue isn't the only criterion — sequencing strategy and execution certainty matter for real consulting engagements.

**Why not higher (#2):** Would require ranking a $15-30K agent above a $784K agent. The ranking logic must remain coherent; promotion to #2 fails the math test even with the speed argument.

**Live walkthrough risk:** Reviewer may ask *"why is a $15-30K agent above a $170-330K Post-Sign agent?"* Answer: speed-to-value + #1 synergy + indirect capacity unlock. Be ready to own this trade-off.

### D4 · Post-Sign Coordination at #4 (demoted from earlier #3)

**Why:** Doc-anchored at $224-336K delayed revenue (auditor line 37). Surfaces a non-obvious pain Marcus didn't list (brief explicitly rewards this). Pushed to #4 only because Pre-Qual ships faster and compounds with #1.

### D5 · Crew Upsell at #5 (demoted from Marcus's stated #3)

**Why:** Real money ($104K/yr doc-anchored) but auditor explicitly flagged as *"candidate trap... order of magnitude smaller than the quote-cycle revenue at risk"* (line 89). Demoting it from Marcus's emotional ranking is exactly the kind of pushback the brief rewards.

### D6 · Marketing/Content cut entirely (was Marcus's stated #4)

**Why:** Marcus contradicted his own priority on the call (line 103): *"Quote. I cannot keep up with the leads I have."* Auditor flagged as solving a non-problem. Adding leads to a clogged funnel solves nothing.

### D7 · Customer Communication Agent considered but cut

**Why:** Auditor flagged as "high-signal, low-cost opportunity" and Marcus quantified the qualitative impact (referrals). But: no doc-anchored revenue figure. Cut from top 5 because the four agents above all have doc-anchored math. Strong Phase 2 add-on candidate once Post-Sign Coord is live (both touch project lifecycle data).

---

## Build decisions

### D8 · Phased build for Quote Agent (not monolithic)

**Why:** A traditional full quote-agent build takes 4-6 months. With phased delivery, Phase 1 (text input + scope extraction + priced draft + review/approve + email send) ships in 2 weeks at ~10% of mature cost. Revenue starts week 2, not month 4-6. Phasing changes the entire ROI calculation.

**Phases:**
- Phase 1 (week 2): Text input → AI scope → priced draft → Marcus reviews → PDF send. Captures 40-50% of full potential.
- Phase 2 (week 4): Fine-tuning on historical proposals, GHL integration, Carlos render trigger workflow. Captures 70-75%.
- Phase 3 (month 2-3): Voice memo capture, customer portal, full automation. Captures 85-90%.

This take-home builds the **Phase 1 MVP**.

### D9 · Synthetic data + replaceability architecture (not pretending to have client data)

**Why:** The client materials don't include the actual pricing spreadsheet, proposal template, or note format. Per brief: *"make defensible assumptions and document them."*

We built a synthetic ~80-item pricing catalog and a 7-section proposal template. Every assumption maps to a swappable component (see `docs/06-assumptions.md` Replaceability Map). Day 1 of real engagement = ingest Marcus's actual data + swap fixtures. No architecture change.

**Live walkthrough framing:** Convert "you don't have his real data" into "the architecture is built so his real data slots in on Day 1."

### D10 · Hetzner VPS over Vercel for hosting

**Why:** User has existing Hetzner infrastructure (SchilderGroei production server, mixed-use per credentials.md). Deploying to existing infra = no new vendor relationship for a 1-week temporary project. Caddy reverse proxy + systemd service is the convention.

**Trade-off:** More setup time than Vercel (~30-60 min infra prep vs Vercel's instant deploy). But uses existing knowledge stack and avoids Vercel free-tier limits on Anthropic call durations.

### D11 · Direct PDF (markdown editor → PDF) over Google Drive integration

**Why for MVP:** Direct PDF is ~1.5h to build vs ~4h for Google Drive (OAuth setup + Drive API + Doc creation + permission management + PDF export). OAuth setup at 2am on submission night is the kind of thing that breaks demos.

**Trade-off accepted:** Marcus has to learn our markdown editor instead of editing in Google Docs. Acceptable for MVP since the human-in-loop flow is preserved.

**Phase 2:** Add Google Drive integration (Doc → PDF) for true workflow alignment with Marcus's existing process (per onboarding line 53).

### D12 · Deepgram for audio (Phase 2) over OpenAI Whisper

**Why:** Matches existing Tunderman infrastructure (used in SchilderGroei + Lead System). Same API key pattern, same SDK conventions. No new vendor onboarding.

**Note:** Audio input is Phase 2, not built in this 24h MVP.

### D13 · Supabase shared instance with new `greenscape` schema (not new Supabase project)

**Why:** User has existing shared Supabase instance for SchilderGroei + Lead System. Per credentials.md: *"Same DB, separate tables/schemas."* Following the established convention.

**Schema isolation:** All our tables under `greenscape.*` schema. Zero impact on `public`, SchilderGroei, or Lead System tables. Easy clean removal: `DROP SCHEMA greenscape CASCADE;` when temporary deployment ends.

### D14 · Anthropic Claude Sonnet (generation) + Haiku (classification) split

**Why:** Cost-aware multi-model strategy is a brief bonus criterion. Sonnet for tasks where quality matters most (`extract_scope`, `match_pricing`, `generate_proposal`) — wrong output here propagates. Haiku for cheap classification (`flag_ambiguity`, `validate_output`) — these are pattern-matching tasks where Haiku is fine.

**Per-quote cost target:** ~$0.11-0.15 (well under the $0.50 budget cap).

### D15 · 5 focused agent skills (not 1 mega-prompt, not 10 micro-skills)

**Why:** Single mega-prompt = hard to debug, no per-step observability, lower quality on complex tasks. 10+ tiny skills = orchestration overhead exceeds benefit. 5-skill chain (`extract_scope` → `match_pricing` → `flag_ambiguity` → `generate_proposal` → `validate_output`) is the minimum viable agent that handles the actual job, with explicit guardrails at the only place hallucinations matter (output gate).

### D16 · Human-in-the-loop is non-negotiable

**Why:** Marcus said it directly (transcript line 129): *"I do not want a bunch of fancy tech I have to babysit. I want stuff that runs and I just look at it and approve things."* Approval flow built into the core, not optional. Brief explicitly rewards human-in-loop as a bonus criterion.

### D17 · Validator skill that gates output (not optional)

**Why:** Brief explicitly rewards "guardrails on AI output" as a bonus criterion. AND hallucinated line items would burn Marcus's trust immediately. Combined deterministic + LLM checks: every line item ID exists in catalog, totals match exactly, all required sections present, no hallucinated prices.

### D18 · Agent skills follow `superpowers` orchestration pattern (not arbitrary)

**Why:** L&S sells AI agents end-to-end. Building this way (orchestrator + focused skills + tool use + guardrails + audit log) demonstrates we know their stack philosophy. Pattern from `superpowers:subagent-driven-development` and `superpowers:dispatching-parallel-agents`.

---

## Documentation decisions

### D19 · Numbered docs (00-09) with flat structure (not nested)

**Why:** Numbering preserves obvious read order. Flat structure preserves cross-references without breakage. Grouping is achieved through:
- README.md visual grouping
- This decision log + the next-session plan

Future restructuring possible if scope grows. For now, flat + numbered + grouped-in-README is the right balance.

### D20 · Assumption registry as canonical source

**Why:** Assumptions are the most likely place we get blindsided in a live walkthrough. Centralizing them with explicit format (what docs say / what we assumed / why defensible / Day 1 swap path) creates one place to defend from. Cross-references from architecture, brief, and strategy docs all point here.

### D21 · Decision log captures WHY, not just WHAT

**Why:** Future chats see the WHAT (in code, in docs). They don't see the WHY (in conversation). This doc preserves the reasoning chain so a future agent doesn't accidentally undo a deliberate choice.

---

## Coordination decisions

### D22 · Multi-chat orchestration (Chat A backend, B frontend, C deploy)

**Why:** Independent work streams. Backend (data, agent, API) and frontend (pages, components) can develop in parallel against a shared API contract. Hetzner setup is fully independent.

**Why NOT all sub-agents in one chat:** Per `superpowers:subagent-driven-development` — sub-agents within a chat are sequential to avoid file conflicts. True parallelism comes from separate chats.

### D23 · STATUS.md as cross-chat coordination point

**Why:** No direct chat-to-chat communication. The user (or Chat A as orchestrator) updates STATUS.md after major milestones. Other chats `git pull` + read STATUS.md to know what's done.

### D24 · Each chat starts by reading every doc in order

**Why:** New chats have no conversation memory. Comprehensive onboarding via the docs is the only way to ensure decisions don't get reversed. Prompts explicitly enumerate read order.

### D25 · Git as source-of-truth for tracked progress

**Why:** Every commit is timestamped, attributable, and durable. Combined with STATUS.md (overview) and per-chat work (in their respective files), git history is the cross-chat coordination ledger.

---

## Research-corrected decisions (post `docs/10-industry-research.md`)

### D26 · Payment schedule changed from 50/25/25 to 30/30/30/10

**Why:** Industry research (Q2) found 50% deposit is on the aggressive end. Premium positioning shouldn't lead with the most aggressive cash term — Angi/Sweeten cap "normal" deposit at 25-33%. Modal residential design-build is 10-30% deposit, 60-80% in 2-4 milestone draws, 10-15% on completion.

**New default:** deposit / mobilization / midpoint / completion = 30/30/30/10. Schema-configurable per quote via `quotes.payment_schedule` jsonb.

**Considered:** Keeping 50/25/25 (matches what onboarding doc line 71 calls out as 50% deposit on signing).

**Why we changed:** The 50% in the doc refers to current Marcus practice, not industry premium positioning best practice. Marcus may want to update — or keep his existing schedule (the field is per-quote configurable). Default reflects what we'd recommend.

### D27 · Proposal template expanded from 7 sections to 9

**Why:** Research (Q4, Q5, Q7) identified three sections missing from our template that are residential design-build standard:
- **Exclusions** — explicit "what's NOT included" — kills the most common dispute pattern (Q4, high confidence)
- **Warranty** — separate trust-builder section, primary asset for premium positioning (Q5, high confidence)
- **License + Insurance Block** — AZ statute REQUIRES ROC license # on contracts (Q7, high confidence — primary regulatory source)

**Considered:** Keeping 7 sections (simpler template).

**Why we changed:** The ROC license requirement is statutory, not optional. The Exclusions section is industry-best-practice for dispute prevention. The Warranty section is a primary trust-builder — exactly what premium positioning needs to monetize.

### D28 · Added `item_type` enum to `line_items`: fixed / allowance / custom

**Why:** Research (Q6) distinguished allowances (known-unknowns shown to customer, e.g., "lighting fixtures: $1,200 allowance") from contingency (unknown-unknowns absorbed in margin). Our original schema had no allowance support.

**Allowance line items** are normal in residential design-build to handle pre-design items (lighting, custom plant selections, decorative finishes). They appear in the customer's proposal with the allowance amount; if actual exceeds allowance, change order is triggered.

**Schema change:** added `item_type` column on `greenscape.line_items` (default `fixed`). Backward-compatible.

### D29 · Confirmed AZ TPT residential exemption (potential value to flag to Marcus)

**Why:** Research (Q3) found that Arizona's July 2021 statute change *removed* the requirement to separately state TPT on prime-contracting receipts, AND there's a residential exemption from prime-contracting TPT for projects ≤$100K per unit.

This covers the bulk of Marcus's $8K-$120K project range. **This is potentially money on the table.** Either:
- Marcus already knows and bills accordingly (good)
- Marcus doesn't know and may be over-collecting / over-remitting tax (correctable)

**Recommendation:** flag this in a Day 1 onboarding conversation with Marcus. Not an architecture change, but a high-value finding for the actual client engagement.

### D30 · Voice spec reinforced: SKU-level material commitments deferred

**Why:** Research (Q13) — in design-build, major material/color commitments are deferred to a design-development phase post-walk. Site walk produces *direction* (e.g., "travertine over concrete"), not SKU-level commitment.

**Updated `generate_proposal` voice spec:** Material descriptions stay at category/grade level (e.g., "premium travertine pavers, French pattern"), not SKU-locked. Avoids the trap of the AI committing the customer to a specific product before design is finalized.

---

## v2 wire-up + UX iteration (2026-05-05, post-deploy)

These decisions came after the initial mock-backed deploy went live and the user exercised the actual end-to-end flow in a browser. They tighten the product around one principle: **Marcus retains full control after the agent runs**. The agent is right ~90% of the time; the UI must let him correct the other 10% without friction.

### D31 · Frontend wired to real API; mocks removed from live path

**Why:** Initial frontend (`data/store.ts`) read from in-memory mocks while Chat A's backend was being built. The two were verified independently (curl tests on the API; visual tests on the UI), but the user-facing surface was a façade — clicking through never hit the real agent. Exactly the brief's failure mode: *"Shipping something that demos but breaks if you click outside the happy path."*

**What we did:** every function in `data/store.ts` swapped from mock-state mutation to a real `fetch()` against the matching `/api/*` endpoint. Server-side fetch uses a loopback URL (`http://127.0.0.1:${PORT}`) so server actions and server components can both reach the API in the same Node.js process without DNS round-trips through Caddy.

**Considered:** Calling Supabase directly from server actions (skip the API hop). Rejected: the agent orchestrator + audit log + storage layering all live behind the API. Going around it would duplicate logic.

**Same commit:** the "budget signal" form field on `/quotes/new` was removed. It was UI-only and never piped into agent reasoning, so collecting it suggested a fidelity that didn't exist.

### D32 · Customer-facing email step removed; PDF download is the export

**Why:** The original `POST /api/quotes/[id]/send` rendered a branded PDF and emailed the customer via Resend in one step. After demo review, this conflated two things — *generating an artifact* (Marcus's tool) with *sending a customer-facing communication* (a sales action that should stay in Marcus's hands). Marcus is the one with the relationship; the system shouldn't auto-deliver to his customer.

**What we did:** `POST /send` still renders the PDF and uploads to Supabase Storage, but skips Resend entirely. The frontend opens the signed URL in a new tab so Marcus can review, download, forward, or attach to whatever channel he prefers. `lib/email.ts` is retained as dormant working code — the wire-up is one-line away when an outbound email step is wanted in Phase 2.

**Considered:** Removing the Resend code entirely. Rejected: the wrapper is solid, and keeping it preserves the option for future workflows (e.g., a "Send draft to internal team" step before customer delivery).

### D33 · PDF generation is non-terminal; only outcome states lock editing

**Why:** First version locked all editing the moment a PDF was generated (status moved to `sent` and `readOnly` flipped). The user surfaced the right objection: *"the agent will not get it 100%. So the user should always be able to have the control to modify things."* The whole point of human-in-the-loop is that PDF export is *iteration*, not commitment.

**What we did:** `readOnly` now flips only on outcome states (`accepted | rejected | lost`), which represent customer-side decisions that genuinely lock the deal. PDF generation is re-runnable from `sent`; the `/send` route guard blocks only `drafting`/`sending` (in-flight) and the three outcome states. The "Approve & download PDF" button relabels to "Re-generate PDF" on subsequent presses; the StatusBadge label moved from "Finalized" to "PDF Ready" to reflect non-terminal semantics.

**DB enum unchanged.** The `quote_status` enum still has `sent`; we only relabeled the UI. The DB stays a thin spec; semantic shifts live in the rendering layer where they're cheap to revisit.

### D34 · Section-by-section editable proposal with single-source pricing

**Why:** The proposal markdown started life as one big blob with two tabs (Preview / Edit-markdown). Marcus is a contractor, not a markdown user. Worse: the markdown contained a duplicate copy of the line items table and a duplicate copy of payment-schedule percentages — both pre-computed by the agent at generation time and *not* re-derived after Marcus edited line items. So the on-screen review showed a stale Project Total that disagreed with the live line items panel.

**What we did:**
- The markdown is parsed into sections by `## ` H2 headers; each section gets its own labeled, editable card. Storage stays as a single `proposal_markdown` column (no schema change), with parse-on-read / recombine-on-save semantics.
- **Section 3 ("Detailed Scope & Pricing")** is auto-derived. The card renders a non-editable preview generated from the current `line_items` + total at render time AND at save time. Marcus edits items in the line-items panel above; this section follows.
- **Section 7 ("Terms & Next Steps")** is split. The payment-schedule block at the top is auto-generated from current total × `payment_schedule` percentages. The rest of the section (other terms, closing paragraph) stays freely editable.
- All other sections are full-text editable as plain textareas.

**Considered:** Storing sections as a `jsonb` column with separate fields. Rejected: schema change, bigger blast radius, unclear ROI for a take-home — the parse/recombine pattern handles the same use case without migration.

**Single-source consequence:** the PDF (`lib/pdf/template.tsx`) was already rendering directly from `line_items` + `payment_schedule` (not parsing markdown). So the on-screen review now matches what the PDF will render. The `proposal_markdown` column is best understood as a denormalized snapshot updated by the editor — a viewing surface, not a source of truth.

### D35 · Manual line items + per-row category & unit selectors

**Why:** The agent emits a structured scope and prices it from the catalog, but two failure modes arise: (1) the agent misses something the customer mentioned ("custom decorative coping"), or (2) the agent's category assignment doesn't match Marcus's mental model (e.g., a fire-pit-adjacent item lands in Universal). Both need a human override path.

**What we did:**
- "+ Add line item" button below the table inserts an editable row (default: Universal / each / qty 1 / price 0). New rows wait for a non-empty description before they round-trip.
- Per-row delete (× button), inline-editable description, inline unit selector, inline category selector (small uppercase chip under the description). Existing inline qty + unit price editors retained.
- Save semantics changed to **full-list-replace**: every change (cell edit, add, delete, regroup) sends the entire items array to `PATCH /api/quotes/[id]`; backend drops + inserts and recomputes total. Removes diffing logic; the client only needs the current state.
- Custom rows have `line_item_id = NULL` (no catalog FK). `lib/types.ts` `QuoteLineItem.line_item_id` was relaxed from `string` to `string | null` to match. The orchestrator's catalog-id verification was tightened to filter null IDs (agent-emitted rows always have a catalog FK; manual rows are exempt by definition).

**Categories drive both the on-screen group sections and the PDF section ordering + per-category subtotals**, so forcing every manual add into Universal split logical groups across the proposal. The selector keeps the line items table coherent.

### D36 · Customer fields editable inline via dedicated PATCH endpoint

**Why:** The Customer card was read-only display. Marcus needs to fix typos in name, email, address, phone — without having to redo a whole quote. Same human-in-the-loop principle as line items.

**What we did:** New `PATCH /api/customers/[id]` route. New `CustomerCard` client component with click-to-edit fields (name, email, phone, address). Optimistic UI; server error reverts the field to last-committed.

**Considered:** Extending `PATCH /api/quotes/[id]` to accept customer fields. Rejected: the customer record is shared across quotes (a single Marcus customer can have multiple quotes over time), so editing customer fields belongs at the customer resource, not nested under one of their quotes.

### D37 · Payment schedule reverted to 50/50 (reversal of D26)

**Why:** User review caught that the 30/30/30/10 schedule (introduced in D26 from industry research) silently overrode Marcus's stated practice. The assignment is the ground truth for Marcus's actual workflow; research is contextual recommendation, not Marcus's lived practice.

**Source:** Onboarding line 71: *"Stripe deposit invoice sent (50%)."* That's the only payment data point in the docs.

**New default:** `[{milestone:"deposit",pct:50},{milestone:"completion",pct:50}]`. Two milestones. Matches the doc literally; the rest at completion is the simplest interpretation.

**Considered:** 50/40/10 (deposit / midpoint / retention) — more industry-typical structure but adds one more invented milestone. Rejected for "smaller change matches the assignment more cleanly."

**Schema unchanged** (D26's jsonb column survives). Migration `20260505_004_revert_payment_schedule.sql` updates only the column DEFAULT. Existing quotes are unaffected; new quotes get 50/50 unless overridden.

**Live walkthrough framing:** "We initially defaulted to research-recommended 30/30/30/10 for premium positioning, then reverted to 50/50 because Marcus's actual stated practice in the onboarding is the ground truth — we don't override the client's lived workflow with research recommendations without their input."

### D38 · Manual catalog additions via POST endpoint (line items, not categories)

**Why:** User wants to be able to add new line items to the catalog as edge cases come up — without a code change. Categories require an enum migration so they remain a code change for now (deferred to Phase 2 — see `docs/15-future-extensions.md`).

**What we shipped:**
- `POST /api/line-items` accepts `{category, name, description, unit, unit_price, item_type?}` and inserts into `greenscape.line_items`
- Newly inserted items become **immediately available to the agent** because `match_pricing` queries the live `line_items` table on every run (no cache, no skill prompt change needed)
- Categories constrained to the 9 existing enum values; UI form should expose this as a dropdown
- UI form on `/admin/line-items` is a Chat B follow-up task (see STATUS.md)

**Considered:** Allowing free-form categories (would require relaxing the enum to text or with a CHECK constraint). Rejected for MVP because:
1. Category drives both the on-screen group sections AND the PDF section ordering AND the `match_pricing` system prompt's hardcoded `CATEGORIES` array — adding a new category requires aligned code changes anyway
2. The 9 existing categories cover Marcus's documented work areas (line 18 of onboarding) — new categories would be edge cases

**Phase 2 path** for new categories: convert `line_item_category` enum → text with a registry table; update the agent's system prompt to read categories from the registry at runtime. Documented in `docs/15-future-extensions.md`. (Update: actually shipped — see D39.)

### D39 · Category column converted from enum to text; categories fetched at agent runtime

**Why:** User review caught that the catalog page was still read-only and that "any items or categories" should be addable. D38 shipped item-add via API; D39 ships the matching UI AND removes the enum constraint that blocked new categories.

**What we shipped:**
- Migration `20260505_005_category_enum_to_text.sql`: `ALTER TABLE greenscape.line_items ALTER COLUMN category TYPE text`; CHECK constraint enforces `length(trim(category)) >= 2`; old `greenscape.line_item_category` enum dropped.
- `lib/skills/match_pricing.ts`: at the start of every `matchPricing()` call, run `getCategories()` to fetch distinct active categories from the live DB. Build the system prompt's "AVAILABLE CATEGORIES" section AND the `lookup_line_items` tool's `enum` constraint dynamically. Net effect: a category added via UI at 10:00 is searchable by the agent at 10:01, no code/prompt change.
- `app/api/line-items` POST: accepts any string for `category`; snake_case-normalizes ("Outdoor Lighting" → "outdoor_lighting") so categories stay consistent with the seeded set and UI grouping behaves predictably.
- `app/admin/line-items/AddLineItemForm.tsx` (new client component): combobox with existing categories + "+ New category…" sentinel option that reveals a text input. Posts to `/api/line-items`, calls `router.refresh()` on success.
- `lib/types.ts`: `ItemCategory` is now `string` (with `SEEDED_CATEGORIES` documented as the original 9 for reference). The literal union was load-bearing only at compile time; runtime accepts any string.

**Considered:** Keeping the enum + a separate `categories` registry table. Rejected as over-engineered for the shipped surface: a single CHECK constraint + dynamic agent prompt is simpler and the UI already enforces non-empty + shape via normalization.

**Live verification (2026-05-05):** POSTed a new "outdoor lighting" category with a Path light bollard line item. Returned 201; `SELECT DISTINCT category FROM greenscape.line_items` confirms `outdoor_lighting` is present alongside the original 9. Next agent run will see it.

### D42 · Custom items are Marcus-internal only; never appear in customer proposal

**Why:** Test case 03 (full backyard rebuild) failed validation because the agent described scope items in proposal prose (gas line, electrical, stucco finish) that weren't priced — they were in `custom_item_requests` because the catalog didn't have entries for them. Validator correctly caught the contradiction (`factual_unsupported_claims` × 3). The user pushed back on my first proposed fix (a customer-facing "Items Requiring Custom Pricing" section) because: *"we can never put it on the proposal — we don't have the line items to calculate it. We can just notify the user that he has set it; he himself needs to add them."*

**The right design:** custom items are **internal-only**. The customer-facing proposal stays clean (only what's priced + what's excluded). Marcus sees the custom items in a dedicated UI card on the quote review page and decides per item: add as manual line item OR follow up separately OR ignore.

**What we shipped:**

1. **`lib/skills/generate_proposal.ts`** — STRICT system prompt rule: items in `custom_item_requests` MUST NOT appear anywhere in the proposal. Customer-facing proposal contains only priced items + explicit exclusions.

2. **`lib/skills/validate_output.ts`** — LLM check `custom_items_bleed`: if any custom item description appears as included anywhere in the proposal, flag as ERROR. Drops the deterministic-section-required check from the original (wrong) design.

3. **`lib/orchestrator.ts`** — passes `custom_item_requests` to `validate_output` (both the first-attempt and retry calls).

4. **`lib/types.ts`** — new `CustomItemRequest` interface; `QuoteDetail.artifacts` now includes `custom_item_requests: CustomItemRequest[]`.

5. **`app/api/quotes/[id]/route.ts`** — extracts `custom_item_requests` from the `priced_items` artifact (orchestrator persists it there as `matchResult`) and exposes via the API.

6. **`app/quotes/[id]/page.tsx`** — new "Needs your pricing" card, conditionally rendered when `custom_item_requests.length > 0`. Shows description + reason per item with a clear "follow up separately or add as manual line items" subtitle. Marcus uses the existing inline line-item add flow if he wants to convert.

**Live verification (re-run case 03 against production after deploy):**
- Status: `validation_failed` → **`draft_ready` first try** ✅
- Errors: 3 → **0** ✅
- Total integrity: $81,445 = sum of priced items ✅
- Custom items surfaced via API: 4 (bar seating, gas line, electrical, stucco upgrade)
- Bleed check: gas line + electrical now appear ONLY in Exclusions; stucco appears as legitimate "stone veneer (not stucco)" reference + Exclusions; no contradiction with Project Overview
- Validator now passes with 2 voice warnings (low priority — "premium" overuse, slightly generic closing)

**Behavior the agent settled on:** custom items get routed to Exclusions in the customer-facing proposal (managing expectations clearly: "you are NOT getting these, follow-up needed") AND surfaced to Marcus internally via the new UI card. The user accepted this dual-routing as the right contractor behavior — customer sees clear scope boundary, Marcus sees the action list.

**Considered:** stricter behavior where custom items don't appear in Exclusions either (truly invisible in proposal). Rejected because customers benefit from knowing what's NOT included to avoid surprise; silent omission would be worse contractor practice. Marcus can override by editing Exclusions if he wants to.

**Future Phase 2 enhancement** (`docs/15-future-extensions.md`): "Add as manual line item" button on the Needs-your-pricing card that pre-populates the line-item add form. Shipped MVP just lists the items; Marcus uses the existing inline add flow.

### D40 · Catalog edit + soft-delete via PATCH and DELETE per row

**Why:** D38 + D39 shipped Add. User requested the matching Edit + Remove so the catalog is full CRUD without a code change.

**What we shipped:**
- `PATCH /api/line-items/[id]`: partial update — name, description, category, unit, unit_price, item_type. Same zod schema + snake_case category normalization as POST.
- `DELETE /api/line-items/[id]`: soft delete via `UPDATE line_items SET active = false WHERE id = ?`. Returns `{ok: true}`.
- `EditableLineItemRow.tsx` (new client component): each catalog row has `Edit` + `Remove` buttons in a new Actions column. Edit toggles the row into a full-width form (name / category / unit / unit_price / item_type / description) with Save/Cancel. Remove triggers a `confirm()` then DELETE.
- Catalog page `/admin/line-items` table refactored to delegate row rendering to the new client component. Header gains an Actions column.

**Why soft delete (not hard):**
- `quote_line_items.line_item_id` FK references catalog rows.
- Snapshot fields (`line_item_name_snapshot`, `unit_price_snapshot`) on `quote_line_items` mean historical quotes remain coherent even when the source catalog row goes inactive.
- The catalog page query already filters `active = true`, so the row simply disappears from the list on next refresh.
- `match_pricing.lookupLineItems` also filters `active = true`, so the agent stops finding it on future runs.
- Hard delete would either break the FK or cascade-delete history.

**Live verification (2026-05-05):**
- PATCH on the previously-added LED bollard: changed `unit_price` 185 → 195 and updated description. Returned 200 with the updated row.
- DELETE on the same item: returned `{ok: true}`.
- `GET /api/line-items` post-delete: 59 active items (down from 60); `outdoor_lighting` category no longer in the active list (was the only item in it).

**The agent's view of these changes is automatic:** `match_pricing.getCategories()` runs on every quote and returns only categories with active items. PATCHed unit prices flow through `lookupLineItems` immediately. DELETEd items disappear from search results. No restart, no cache invalidation.

### D41 · Layered input-quality gating (Skill 0 + extract_scope no_scope exit + form min-length)

**Why:** Brief explicitly rewards "guardrails on AI output — what happens if the model returns garbage?" (line 64). User review extended this to **input** garbage too — what if Marcus pastes the wrong text (a recipe, mom conversation, lorem ipsum) by accident? Original system would produce either an empty proposal (best case) or a hallucinated one (worst case), wasting ~$0.10 in tokens either way.

**Three-layer defense, cheap to expensive (fail-fast economics):**

**Layer 1 — Form validation (free, instant):**
- `app/quotes/new/actions.ts` zod: `raw_notes` min 30 chars (was 20). Rejects "patio" or "hi mom" before any LLM token.

**Layer 2 — Pre-flight relevance check (Skill 0, ~$0.001):**
- `lib/skills/check_input_relevance.ts` (NEW): Haiku 4.5, T=0.0, max 250 tokens
- Returns `{is_relevant, confidence: high|medium|low, reason, detected_content}` where detected_content is one of: site_walk_notes, personal_conversation, recipe_or_instructions, unrelated_text, too_sparse, non_english, lorem_ipsum_or_test, other
- Runs at orchestrator Step 0 BEFORE customer find-or-create OR quote insert
- **Fail-closed only on `is_relevant=false AND confidence=high`** — borderline cases fall through to downstream defenses
- On rejection: throws `InputRejectedError` (new typed error) → API route returns 400 with the user-facing reason. NO quote row created. Audit row recorded with `quote_id=null` for diagnostic trail.

**Layer 3a — extract_scope `__no_scope` exit (~$0.005):**
- `lib/skills/extract_scope.ts` output schema is now a discriminated union — either `{scope_items: [...]}` OR `{__no_scope: true, __no_scope_reason: "..."}`
- System prompt instructs the model to use the no_scope exit when input passed pre-flight but contains nothing actually extractable (e.g., "I want to do something in my backyard")
- Orchestrator branches on `scopeResult.kind === "no_scope"` → persists scope artifact with the reason → marks quote `validation_failed` → throws `InputRejectedError` with quote-id-aware diagnostic message

**Layer 3b — validate_output empty-priced-items check:**
- `lib/skills/validate_output.ts` deterministic checks now include: if `priced_items.length === 0`, error severity. Catches the rare case where extract_scope returned items but match_pricing produced no priced rows (everything custom).

**API + UX:**
- `/api/agent/draft` catches `InputRejectedError` → returns 400 with `{error: <user message>, reason_code: <e.g., not_site_walk:personal_conversation>}`
- `data/store.ts` api helper now extracts the JSON `error` field from non-2xx responses → form's `formError` displays the clean message (no "API → 400: ..." noise)

**Live verification (2026-05-05):** Three test cases hit the live deploy:
- Mom conversation → Skill 0 reject (personal_conversation, high conf) → 400, $0.0011, no quote row
- "asdf test test test" → Skill 0 reject (lorem_ipsum_or_test, high conf) → 400, $0.0011, no quote row
- "I want to do something with my backyard" → Skill 0 said too_sparse but only medium confidence → passed through → extract_scope returned __no_scope → 400, $0.006 total, quote row marked validation_failed for diagnostic trail

**Loom-defensible framing:** *"What if the model returns garbage? validate_output catches it. What if the user submits garbage? Three layers — form validation rejects too-short input for free, a Haiku pre-flight check at $0.001 catches wrong-content-type, and extract_scope's __no_scope exit is the backstop for sparse-but-relevant inputs that fool the relevance check. Total defensive cost per submission: <$0.002 when the input is good; <$0.01 when caught."*

**What's still deferred** (audio path — Chat A/B in flight): pre-transcription duration/size checks, post-transcription length + gibberish detection. Both belong with the audio feature, captured in `docs/15-future-extensions.md` once shipped.
