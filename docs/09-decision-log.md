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
