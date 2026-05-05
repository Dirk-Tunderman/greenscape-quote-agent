# 05 — Build Plan (24h MVP)

## Time budget

Approximately **16-18 hours of actual build time**, with buffer. Strategy/planning already complete.

| Block | Time | Phase |
|---|---|---|
| Setup | 1.0h | Phase 0 |
| Data + seed | 2.0h | Phase 1 |
| Agent core | 4.0h | Phase 2 |
| UI: input | 1.5h | Phase 3 |
| UI: review | 2.5h | Phase 4 |
| PDF + email | 1.5h | Phase 5 |
| UI: list + outcomes | 1.0h | Phase 6 |
| Guardrails + cost tracking | 1.0h | Phase 7 |
| Polish + brand | 1.0h | Phase 8 |
| Test + buffer | 2.0h | Phase 9 |
| Loom + submit | 0.5h | Phase 10 |
| **Total** | **18.0h** | |

---

## Sequenced tasks

### Phase 0 — Setup (1h)

| # | Task | DoD |
|---|---|---|
| 1 | Init repo, push to GitHub with `.gitignore` + `README.md` skeleton | Repo exists, public or invite-shared |
| 2 | Init Next.js 15 (App Router) + TypeScript + Tailwind | `npm run dev` works |
| 3 | Create Supabase project, copy connection details | `.env.local` populated |
| 4 | Deploy to Hetzner Server 1: clone repo to `/opt/greenscape-quote-agent`, build Next.js standalone, register systemd service, expose via Caddy on a free port → verify public URL | Live URL reachable; default Next.js page renders |
| 5 | Create `.env.example` with all expected vars (no real values) | File committed |
| 6 | Install Anthropic SDK, Resend SDK, zod, @supabase/supabase-js | `package.json` updated |

### Phase 1 — Data foundation (2h)

| # | Task | DoD |
|---|---|---|
| 7 | Define DB schema migrations (all 6 tables from architecture doc) | SQL files committed in `supabase/migrations/` |
| 8 | Apply migrations to Supabase | Tables visible in Supabase dashboard |
| 9 | Seed `line_items`: ~80 items across 8 categories with realistic Phoenix-market prices | `npm run seed` populates DB |
| 10 | Seed 3 historical proposals as JSON for few-shot prompts | `data/historical-proposals.json` committed |
| 11 | Seed 5 sample customers for demo | DB has demo customers |
| 12 | Add Supabase RLS policies (basic, single-tenant) | Policies enabled |

### Phase 2 — Agent core (4h)

| # | Task | DoD |
|---|---|---|
| 13 | Create `lib/anthropic.ts` wrapper with cost tracking + retry logic | Returns response + cost metadata |
| 14 | Implement `lib/skills/extract_scope.ts` with zod schema validation | Tested with synthetic notes input |
| 15 | Implement `lib/skills/match_pricing.ts` with tool use against `line_items` | Tested; returns valid IDs only |
| 16 | Implement `lib/skills/flag_ambiguity.ts` (Haiku) | Tested |
| 17 | Implement `lib/skills/generate_proposal.ts` with style guide loaded | Tested; produces valid markdown |
| 18 | Implement `lib/skills/validate_output.ts` (deterministic + LLM) | Catches injected hallucinations in test |
| 19 | Implement `lib/orchestrator.ts`: chain + retry on validate fail | End-to-end run produces draft + artifacts |
| 20 | Wire `app/api/agent/draft/route.ts` endpoint | POST returns draft_id; artifacts in DB |

### Phase 3 — UI: input (1.5h)

| # | Task | DoD |
|---|---|---|
| 21 | `/quotes/new` page layout (Tailwind, simple) | Renders |
| 22 | Customer info form + project metadata + notes textarea | Form submits |
| 23 | POST → orchestrator → redirect to `/quotes/[id]` | Round-trip works |
| 24 | Loading state during agent run (spinner + skeleton) | UX feels responsive |

### Phase 4 — UI: review/edit/approve (2.5h)

| # | Task | DoD |
|---|---|---|
| 25 | `/quotes/[id]` page layout | Renders quote data |
| 26 | Display: customer info, scope items, ambiguities, line items table, draft markdown, totals | All sections visible |
| 27 | Inline edit for line items (qty, price) with auto-recalc | Edits save to DB |
| 28 | Inline edit for proposal markdown | Edits save |
| 29 | Render-needs flag (>$30K) prominently | Visible badge |
| 30 | Approve button → triggers send flow | Button works |

### Phase 5 — PDF + email (1.5h)

| # | Task | DoD |
|---|---|---|
| 31 | PDF template (HTML/CSS, branded — colors, logo placeholder, typography) | Renders correctly |
| 32 | PDF generation library (`react-pdf`; fallback `puppeteer`) | Generates valid PDF from quote data |
| 33 | Resend integration: API key, send function | Test send works to dev inbox |
| 34 | `/api/quotes/[id]/send` endpoint: generate PDF → upload to Supabase Storage → email customer | Customer receives email + PDF |

### Phase 6 — UI: list + outcomes (1h)

| # | Task | DoD |
|---|---|---|
| 35 | `/quotes` page: table of all quotes with status, customer, total, dates | Renders, sortable |
| 36 | Status filter (drafting / draft_ready / sent / accepted / rejected / lost) | Filter works |
| 37 | Outcome update flow (mark accepted/rejected/lost with notes) | Updates persist |

### Phase 7 — Guardrails + cost tracking (1h)

| # | Task | DoD |
|---|---|---|
| 38 | Cost budget enforcement in orchestrator ($0.50 cap; warning) | Surfaces in UI |
| 39 | Validation error UI in draft review (when validation_failed status) | Shows issues + suggested fix |
| 40 | Empty/sparse note handling — prompt user to add more | UX message |
| 41 | Cost display in `/quotes/[id]` (per quote) | Visible |
| 42 | Cumulative cost on `/quotes` (sum across all) | Visible |

### Phase 8 — Polish + brand (1h)

| # | Task | DoD |
|---|---|---|
| 43 | Brand template polish: Greenscape colors (greens, earth tones), logo placeholder, typography | PDF looks premium |
| 44 | Quote list table styling | Looks like a real product |
| 45 | Audit log link on quote page (modal showing skill calls + costs) | Click reveals audit trail |
| 46 | Optional: AI-generated cover banner image (Imagen/DALL-E) — only if all above done | Bonus |

### Phase 9 — Test + buffer (2h)

| # | Task | DoD |
|---|---|---|
| 47 | Run full happy-path flow 3x with different scope inputs | All 3 succeed |
| 48 | Edge case: sparse notes → ambiguities surface, no garbage proposal | Behaves correctly |
| 49 | Edge case: $50K project → render flag visible | Visible |
| 50 | Edge case: validator catches injected hallucinated line item | Caught |
| 51 | Bug fixes from above | All fixed |
| 52 | Final demo run-through, top to bottom | Clean run |

### Phase 10 — Loom + submission (0.5h)

| # | Task | DoD |
|---|---|---|
| 53 | Record 5-min Loom: top 3 agents from strategy, P0 demo, architecture decisions, what's next with another week | Recorded ≤5 min |
| 54 | Final commit + push to GitHub | All green |
| 55 | Update README with: project overview, deploy URL, env setup, run instructions | README complete |
| 56 | Submit per brief: GitHub link, deployed URL, Loom link, strategy doc link | Email sent |

---

## Definition of done — MVP

- [ ] Public URL live on Hetzner and reachable
- [ ] Can create new quote from notes (happy path)
- [ ] Agent generates draft with all components (scope, line items, ambiguities, proposal markdown, total)
- [ ] Marcus can edit any field
- [ ] Marcus can approve a quote
- [ ] PDF generates with branded template
- [ ] Email sent to customer with PDF attached
- [ ] Quote appears in history with correct status
- [ ] All skill calls logged in `audit_log` with cost metadata
- [ ] Cost per quote visible in admin
- [ ] `README.md` complete (overview, setup, run, deploy)
- [ ] `.env.example` complete (all vars documented)
- [ ] GitHub commit history is real (not one mega-commit) — commit at each phase boundary minimum

---

## Risk callouts

| Risk | Mitigation |
|---|---|
| **Synthetic line items lack realism** → demo loses credibility | Spend the full Phase 1 budget on realistic Phoenix-market data |
| **PDF generation fiddly** → blocked at Phase 5 | Have `puppeteer` fallback ready; if both fail in 30 min, ship as HTML preview + downloadable PDF on demand later |
| **Long-running Anthropic chains** on Hetzner | Run agent calls server-side in API routes with explicit timeouts (30s per skill); systemd persistent process avoids cold-start issues |
| **Cost overruns during dev/testing** | Hard-code per-call cost cap in dev; alert if cumulative > $5 in dev session |
| **Scope creep** (voice input, GHL integration, Stripe) | DO NOT BUILD — Phase 2 only. Document in Loom as roadmap. |
| **Validator too strict** → blocks good drafts | Tune severity levels; downgrade format-only issues to `warn` not `error` |
| **24h time pressure** → quality slips | Sequential phases; commit at end of each phase as a safety net |
| **Resend deliverability** → email lands in spam | Use Resend's verified domain feature; SPF/DKIM not required for take-home |

---

## What we're NOT doing (and noting in Loom)

These belong in Phase 2 / 3 and we'll explicitly call out in the Loom that we deliberately scoped them out:

- Voice memo input + transcription (Phase 2 — Deepgram API integration; matches existing Tunderman stack)
- GHL push on approval (Phase 2 — needs OAuth setup + GHL contact mapping)
- Stripe deposit invoice generation (Phase 2 — triggered post-approval)
- DocuSign integration (Phase 2 — already exists in GHL native flow)
- Photo upload + vision LLM (Phase 3)
- Continuous fine-tuning loop on accepted quotes (Phase 3)
- Customer-facing portal (Phase 3)

This signals to L&S that we know what production-readiness looks like and made deliberate scope decisions for the 24h window.
