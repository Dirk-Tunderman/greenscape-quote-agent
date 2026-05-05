# STATUS

**Single coordination dashboard for the multi-chat build.** Every chat reads this at start. Chat A (backend orchestrator) is primary writer. Chat B / Chat C update only their own sections.

---

## Last updated

`2026-05-05` · planning chat — payment schedule reverted to 50/50 (matches assignment line 71 · D37); POST /api/line-items live for runtime catalog adds (D38); future-extensions doc added (`docs/15-future-extensions.md`)
Next update: pre-Loom code-review pass (if desired) → submission

---

## Current overall phase

**v2 UX iteration complete.** Public URL `https://quote-agent.tunderman.cc` is the demo-ready product. Marcus retains full control after the agent runs — every surface that can be wrong (line items, customer fields, proposal sections, PDF) is editable, re-runnable, or auto-derived from a single source of truth. See `docs/09-decision-log.md` D31–D36 for the post-deploy decisions and `LEARNING.md` for the gotchas.

**Live list (5 quotes):**
- Linda Whitaker — $26,107 · finalized · 0.154 cost
- Bret Anderson — $3,505 · draft_ready · 0.122 cost
- Maria Lopez — $13,395 · draft_ready · 0.129 cost
- David Chen — $59,000 · finalized (>30K render flag) · 0.228 cost
- Hannah Patel — $15,955 · accepted · 0.122 cost

Backend deployed and live. Real agent runs against real DB + Anthropic. Resend code retained but no live route invokes it (Phase 2 candidate).

**Integration tests passed end-to-end:**
1. **Patel (local)** — patio + irrigation refresh, $15,955, 7 line items, 81s, $0.12 cost, 3 ambiguities surfaced (1 blocker, 2 warns), retry-on-validate-fail loop fired once + passed, PDF generated + Storage uploaded + Resend email sent → status `sent`.
2. **Chen (production)** — full backyard overhaul, **$59,000** (>$30K → `needs_render: true` ✅), 16 line items, 160s, $0.23 cost, 3 ambiguities (gas trench length, Scottsdale-vs-Phoenix permit, kitchen unit composition), PDF generated + sent.

**Cost guardrails confirmed:** both runs well under $0.50 per-quote cap. Total Anthropic spend across all dev + 2 integration runs ≈ $0.50.

ROC license + insurance fields stripped from generation flow per user instruction (columns kept on `quotes` for forward compat). 8-section proposal template (Cover/Greeting/Project Overview/Scope+Pricing/Exclusions/Timeline/Warranty/Terms/Signature). Aligned with research D26-D30 minus ROC/insurance.

**Post-review change (2026-05-05):** Payment schedule reverted to **50/50** (matches onboarding line 71). 30/30/30/10 was a research-derived default that silently overrode Marcus's stated practice — see D37. Migration `20260505_004_revert_payment_schedule.sql` updated the column DEFAULT; existing quotes unchanged.

**Post-review feature (2026-05-05):** Catalog is now full CRUD from `/admin/line-items` — Add, Edit, Remove. POST / PATCH / DELETE on `/api/line-items/[id]`. Soft-delete preserves quote history via snapshot fields. Categories are stored as text (D39) so new ones can be created from the form's combobox; `match_pricing.getCategories()` fetches them at run time so the agent picks them up on the next quote with zero code change. Verified live: added "outdoor_lighting" + LED bollard, PATCHed price 185→195, DELETEd → 59 active items remain. Decisions D38 (POST), D39 (enum→text + UI add), D40 (PATCH+DELETE).

**Post-review hardening (2026-05-05):** Three-layer input-quality gating shipped (D41). (1) Form: `raw_notes` min 30 chars — free defense for empty submissions. (2) Skill 0 `check_input_relevance` (Haiku, ~$0.001) gates wrong-content-type before any quote is created — rejects mom conversations, recipes, lorem ipsum at the API layer with a 400 + reason_code. (3) `extract_scope` now returns a `__no_scope` exit variant (sparse-but-relevant backstop) → orchestrator marks quote validation_failed + throws InputRejectedError with diagnostic message. `validate_output` also gained an empty-priced-items deterministic check. Verified live: 3 test cases (personal_conversation, lorem_ipsum_or_test, too_sparse) all rejected with appropriate messages, total cost $0.008 across all three. The `data/store.ts` api helper now surfaces clean JSON `error` field from 4xx responses for the form's `formError` display.

**Future extensions registry:** `docs/15-future-extensions.md` captures everything deliberately deferred from MVP (UI for line-item add, voice/Deepgram, photos, GHL push, Stripe, DocuSign, 3D render workflow for >$30K, HOA package gen, crew availability, real Anthropic key, real catalog/template/few-shot swap-in for Day 1). Sequenced by horizon (Phase 2 / 3 / 4-real-engagement).

---

## ⚡ HEADS-UP for Chat A and Chat B (industry research integrated 2026-05-05)

`docs/10-industry-research.md` was just written and integrated. **Schema and proposal template changed** before you commit your migrations / few-shot examples. Read decision log entries D26-D30. Specifically:

- **`greenscape.line_items`** has a new `item_type` enum (`fixed | allowance | custom`). Default `fixed`. Update your migration + seed accordingly. (`docs/03-architecture.md` updated.)
- **`greenscape.quotes`** has 3 new columns: `payment_schedule jsonb` (default 30/30/30/10), `roc_license_number text`, `insurance_carrier text`. (`docs/03-architecture.md` updated.)
- **Proposal template is now 9 sections, not 7.** Added Exclusions (#5), Warranty (#7), License Block (#9). `generate_proposal` skill spec updated in `docs/04-agent-skills.md` — required-section count is now 9, plus new validation rules (ROC # must appear, payment_schedule pcts sum to 100). Few-shot historical proposals (Chat A's task #2) should reflect 9 sections.
- **Voice spec** reinforced: greeting must reference site walk by date + 1-2 specific observations; material descriptions stay at category/grade level (no SKU lock-in).
- **Chat B mock catalog (`lib/mocks/catalog.ts`)** should add `item_type` field to align with new schema. Most existing items = `fixed`. Add 1-2 `allowance` examples (e.g., "Lighting allowance: $1,200").

**One client-engagement-grade finding (not architectural):** AZ TPT residential exemption ≤$100K per unit covers most of Marcus's $8K-$120K range — flag at Day 1 of real engagement, potential money on the table. (`docs/09-decision-log.md` D29.)

Phase progression (from `docs/05-build-plan.md`):
- [x] Pre-build planning + strategy + setup docs
- [x] Phase 0 — Setup (Next.js 15 scaffold + TS + Tailwind + types + design tokens — done by Chat B; backend deps + Supabase wiring in progress by Chat A)
- [ ] Phase 1 — Data foundation (schema migration + seed catalog)
- [ ] Phase 2 — Agent core (5 skills + orchestrator)
- [ ] Phase 3 — UI: input
- [ ] Phase 4 — UI: review/edit/approve
- [ ] Phase 5 — PDF + email
- [ ] Phase 6 — UI: list + outcomes
- [ ] Phase 7 — Guardrails + cost tracking
- [ ] Phase 8 — Polish + brand
- [ ] Phase 9 — Test + buffer
- [ ] Phase 10 — Loom + submit

---

## Per-chat status

### Chat A (Backend Orchestrator) — **Phases 0–7 done; awaiting user one-shots**
- **Owns:** Supabase schema + seed, agent skill chain, orchestrator, API routes, PDF, Resend email, audit log + cost tracking, deploy script, final review
- **Done (uncommitted, all in working tree):**
  - `supabase/migrations/20260505_001_greenscape_schema.sql` — schema + RLS + triggers + indexes
  - `supabase/migrations/20260505_002_seed_pricing_catalog.sql` — ~50 fixed items + 2 allowance items + 5 demo customers
  - `supabase/migrations/20260505_003_research_updates.sql` — `item_type` enum, `payment_schedule`, `roc_license_number`, `insurance_carrier`
  - `lib/db/supabase.ts` — service-role client pinned to `greenscape` schema
  - `lib/anthropic.ts` — wrapper, MODELS map (Sonnet 4.5, Haiku 4.5), cost tracking, JSON parser
  - `lib/audit.ts` — `AuditContext` accumulator → batched insert into `audit_log` at end of run
  - `lib/skills/extract_scope.ts` — Sonnet, zod-validated, 2 few-shot examples, 1 corrective retry on parse fail
  - `lib/skills/match_pricing.ts` — Sonnet w/ tool use, `lookup_line_items` tool against `line_items` (ILIKE → fallback to category), zod-validated, hallucinated-id verification
  - `lib/skills/flag_ambiguity.ts` — Haiku, max 5 ambiguities
  - `lib/skills/generate_proposal.ts` — Sonnet, 9 required sections, payment schedule + ROC + insurance, 2 few-shot examples
  - `lib/skills/validate_output.ts` — deterministic 13-check regex pass (incl. ROC + payment-schedule sum) + Haiku voice/claims pass
  - `lib/orchestrator.ts` — chain w/ retry-on-validate-fail, $0.50 cap, persists artifacts + audit + line items
  - `app/api/agent/draft/route.ts` — POST orchestrator entry
  - `app/api/quotes/route.ts` — GET list with status filter
  - `app/api/quotes/[id]/route.ts` — GET detail (joins customer + line items + artifacts + audit log) + PATCH (edits with auto-recalc)
  - `app/api/quotes/[id]/send/route.ts` — POST: render PDF → upload to Supabase Storage → email via Resend → mark sent
  - `app/api/line-items/route.ts` — GET catalog (for `/admin/line-items`)
  - `lib/pdf/template.tsx` — 9-section branded PDF template (Cormorant + Inter, brand colors, Exclusions + Warranty + License Block)
  - `lib/pdf/render.ts` — renderToBuffer wrapper
  - `lib/email.ts` — Resend send function with PDF attachment
  - `data/historical-proposals.json` — 3 voice examples (7-section legacy; system prompt overrides to 9-section)
  - `scripts/deploy.sh` — local + remote modes; rsync standalone build to `/opt/greenscape-quote-agent`; `systemctl restart greenscape-quote-agent`
  - `next.config.js` — `output: "standalone"`
  - `.env.example` — extended with `GREENSCAPE_ROC_LICENSE`, `GREENSCAPE_INSURANCE`
  - Extended `lib/types.ts` with `LineItemType`, `PaymentScheduleItem`, `DEFAULT_PAYMENT_SCHEDULE`, plus 4 new fields on `LineItem` and `Quote` (additive — Chat B's existing usage stays compatible)
- **Build:** `npm run build` green; all 5 API routes + 4 pages + 1 not-found registered
- **Currently doing:** awaiting user one-shots (B-002 below) so we can run a live integration test, then dispatch final code-review subagent
- **Last commit:** N/A (working uncommitted; user controls the commit gate)
- **Blockers:** B-002 below (Anthropic key + Resend key + apply migration to live DB)
- **Waiting on:** user permission for one-shot Supabase migration apply + populated `.env.local`

### Chat B (Frontend Builder) — **all 4 pages shipped (mock-backed)**
- **Owns:** all Next.js pages + components per `docs/08-design-system.md`
- **Done:**
  - Next.js 15 scaffold, Tailwind v3 with brand tokens, Cormorant Garamond + Inter loaded, tabular-num utility class
  - `lib/types.ts` (full shared API contract — Chat A also editing/extending this), `lib/utils.ts` (formatters, cn helper)
  - Mock fixtures (now in `data/mocks/`, not `lib/mocks/`): catalog (~58 items, includes 1 allowance + 1 custom per D26 heads-up), 5 customers, 5 quotes covering draft_ready / sent / accepted / lost / validation_failed states. Mock proposals updated to 9-section template per D29.
  - Data adapter `data/store.ts` with in-memory mutable state (read + mutate paths) — swappable for `fetch()` calls when Chat A's API routes land. **No `app/api/` routes built — Chat A's territory left untouched.**
  - **Pages:** `/quotes` (list + filters + status stats), `/quotes/new` (form w/ server action + zod validation), `/quotes/[id]` (review/edit/approve — sticky bottom approve bar, scope panel, ambiguity callout, validation panel, inline-edit line items w/ optimistic UI + recompute, markdown proposal preview/edit tabs, audit log modal, outcome tracker), `/admin/line-items` (read-only catalog grouped by category)
  - **Server actions** for mutations: `createDraftAction`, `updateLineItemsAction`, `updateProposalAction`, `approveAndSendAction`, `setOutcomeAction` — no `/api/` conflicts
  - **Components:** `Brand`, `Nav` (with cumulative cost display), `PageHeader`, `Card`/`CardHeader`/`CardBody`, `Button` (4 variants × 3 sizes), `Field`/`Input`/`Textarea`/`Select`, `StatusBadge` (8 statuses, color + dot + label), `Modal` (Esc + backdrop close), `EmptyState`
  - Verified via Chrome at 1440px and 375px — no console errors on any page; >$30K render flag visible; validation_failed state disables Approve correctly
- **Documentation pass (2026-05-05 PM):** wrote `docs/13-frontend-internals.md` (deep-dive: page-by-page anatomy, components catalog, data flow, design-system adherence, edge cases, swap-to-real-API recipe, where-to-look-when troubleshooting matrix). Added top-of-file JSDoc headers to `data/store.ts`, `data/mocks/catalog.ts`, `data/mocks/quotes.ts`, `app/quotes/[id]/page.tsx`, `app/quotes/[id]/LineItemsTable.tsx`, `app/quotes/[id]/actions.ts`, `app/quotes/new/actions.ts`, `app/quotes/new/NewQuoteForm.tsx`, `components/StatusBadge.tsx`, `components/Modal.tsx` — explaining patterns/contracts/seams.
- **Currently doing:** done — frontend complete, mock-backed, fully documented, ready for handoff or for Chat A's API to be wired in
- **Blockers:** none
- **Waiting on:** Chat A's API routes — when ready, swap `data/store.ts` function bodies to `fetch()` against `/api/agent/draft`, `GET/PATCH /api/quotes`, `POST /api/quotes/[id]/send`. Pages don't change. **Recipe in `docs/13-frontend-internals.md` § "Wiring to backend".**

### Chat C (Hetzner Deployment) — **DONE · public URL live**
- **Owns:** server-side prep on `157.90.124.14` (Caddy site block, systemd unit, port assignment)
- **Public URL:** **https://quote-agent.tunderman.cc** (HTTPS via Caddy auto-LE; cert valid until 2026-08-03; DNS A `quote-agent.tunderman.cc → 157.90.124.14`, DNS-only)
- **Done:**
  - Snapshotted server state pre-change: `/tmp/services-before.txt`, `/tmp/ports-before.txt`, `/tmp/Caddyfile.before` (+ `/tmp/Caddyfile.before-greenscape` taken right before the Caddy edit)
  - Created `/opt/greenscape-quote-agent` (root-owned, matches SchilderGroei convention)
  - Created `/etc/systemd/system/greenscape-quote-agent.service` (User=root, ExecStart=`/usr/bin/node server.js`, PORT=3100, HOSTNAME=127.0.0.1, optional EnvFile, Restart=on-failure) — `daemon-reload`-ed but NOT enabled (Chat A enables on first deploy if desired)
  - Built minimal Next.js 14 standalone hello-world, deployed to `/opt/greenscape-quote-agent`, verified loopback **HTTP 200, 4231 bytes**
  - **Added Cloudflare DNS** A record `quote-agent.tunderman.cc → 157.90.124.14` (DNS-only / gray cloud — required for Caddy LE challenge)
  - **Added Caddy site block** in `/etc/caddy/Caddyfile` (between markers `# >>> greenscape-quote-agent (TEMPORARY ...)` and `# <<< greenscape-quote-agent <<<` — teardown.sh removes by these markers); `caddy validate` clean; `systemctl reload caddy` (zero-downtime, not restart)
  - **External live test:** `curl https://quote-agent.tunderman.cc` → HTTP 200, 4231 bytes, valid LE cert (issuer E7), 0.20s
  - Stopped hello-world service after verify (Chat A's code will replace)
  - Final verification gate: all 6 SchilderGroei + lead-website services + Caddy `active`; service-list diff vs pre-change snapshot **identical**; Caddy validate clean
  - Wrote `scripts/teardown.sh` (idempotent, confirmation-gated cleanup of DNS/Caddy/service/dir for end of demo window)
  - **Wrote `docs/12-deployment.md`** — canonical deployment reference (request path, file layout, DNS, Caddy block, systemd unit, deploy procedure, env expectations, verification gate, troubleshooting matrix, isolation rules, teardown, maintenance notes). Tightened inline comments in `scripts/teardown.sh`. Updated README's Deploy URL + docs index.
- **Last commit:** see git log (Chat C: docs/12-deployment + inline comments)
- **Blockers:** none
- **Waiting on:** Chat A to deploy code into `/opt/greenscape-quote-agent` and `systemctl restart greenscape-quote-agent`

---

## Key URLs

| Resource | URL |
|---|---|
| GitHub repo | https://github.com/Dirk-Tunderman/greenscape-quote-agent (private) |
| Supabase project | https://oixhegfptjdcfbwngktq.supabase.co (shared instance, `greenscape` schema) |
| Hetzner Server 1 | `157.90.124.14` (SSH: `ssh -i ~/.ssh/id_ed25519 root@157.90.124.14`) |
| Deploy URL | **https://quote-agent.tunderman.cc** — live with hello-world, valid LE cert; reverts to 502 until Chat A starts the service with real code |

---

## Open decisions to confirm at kickoff

1. **Anthropic API key:** new dedicated key (preferred per credentials.md project-scoping rule) OR temporarily reuse SchilderGroei's (~$1-3 total cost). Confirm with user.
2. ~~**Public URL format**~~ — **RESOLVED 2026-05-05.** Path B chosen with `tunderman.cc` (instead of `tunderman.io`). DNS record added manually via Cloudflare dashboard. Public URL: `https://quote-agent.tunderman.cc`.
3. **Chat orchestration:** confirm A/B/C are running in parallel.

---

## Recent completions (most recent first)

| Date | Chat | Item |
|---|---|---|
| 2026-05-05 | Chat A v2 | **Documentation refresh.** Decision log D31–D36 added covering post-wire-up UX shifts. `docs/11-current-state.md` updated for live API surface, single-source pricing pattern, customer endpoint, status enum semantics. `LEARNING.md` populated (use-server gotcha, parse/recombine pattern, single-source pricing rule, drop+insert save model, schema-vs-label trade-off). |
| 2026-05-05 | Chat A v2 | **Per-row category selector** on every line item. Inline dropdown chip under the description; changing the value moves the row to that category's group section and updates the per-category subtotal. The 9-value `ItemCategory` enum is fully exposed. |
| 2026-05-05 | Chat A v2 | **Single-source pricing in proposal + editable customer card.** ProposalEditor's section 4 (Detailed Scope & Pricing) auto-derives from live `line_items` + total; section 8 payment-schedule block auto-derives from total × `payment_schedule`. Customer card (name, email, phone, address) inline-editable via new `PATCH /api/customers/[id]` endpoint. |
| 2026-05-05 | Chat A v2 | **PDF generation no longer terminal + manual line items.** `/send` route is re-runnable from `sent`; `readOnly` flips only on outcome states. LineItemsTable refactored to full-list save model with per-row delete (×) button, "+ Add line item" button, inline description + unit + category editors. `lib/types.ts` `QuoteLineItem.line_item_id` relaxed to `string \| null` to support custom (no-catalog-FK) rows. Status badge "Finalized" → "PDF Ready"; banner copy + Approve button label adapted. |
| 2026-05-05 | Chat A v2 | **Server-side exception fix on /quotes/new submit.** Next.js 15 strictly enforces `"use server"` files to export only async functions; `EMPTY_FORM_STATE` const moved to a sibling `form-state.ts` module. Latent pre-v2 bug exposed by first browser form submission. |
| 2026-05-05 | Chat A v2 | **Wire-up complete.** `data/store.ts` calls real `/api/*` endpoints (mocks removed from live path). `/quotes` list shows DB rows; `/quotes/new` triggers the real agent; line-item + section edits persist; "Approve & download PDF" replaces email send (Resend deferred to Phase 2). Section-by-section editable proposal (parse on read, recombine on save). Budget signal field deleted. DB cleaned (3 validation_failed rows removed); 2 new real seeds added (Anderson $3.5K, Whitaker $26K) + Patel marked accepted to vary list states. Section-edit + finalize → PDF download verified end-to-end. |
| 2026-05-05 | Chat B | Documentation pass — wrote `docs/13-frontend-internals.md` (deep-dive frontend ref) + JSDoc headers on 10 key files. Frontend complete: 4 pages live on mocks, swap recipe documented, ready for API wire-in. |
| 2026-05-05 | Chat A | **END-TO-END LIVE.** 2 integration tests on PROD passed (Patel $15,955 patio+irrigation, Chen $59,000 full backyard with `needs_render:true`). Real Anthropic Sonnet 4.5 + Haiku 4.5 chains, real Supabase DB + Storage, real Resend email send w/ branded PDF attached. Validate-on-fail retry loop verified. Total dev+test Anthropic spend ≈ $0.50. |
| 2026-05-05 | Chat A | Aligned code with research D26-D30: migration 003 (item_type / payment_schedule / ROC / insurance), 9-section template w/ Exclusions + Warranty + License Block, ROC + payment-schedule-sum validators; build green; **ROC/insurance later stripped per user (kept columns for forward compat)** |
| 2026-05-05 | Chat A | Backend Phases 0–7: schema + seed SQL · 5 skills + orchestrator (Sonnet 4.5 + Haiku 4.5) · 5 API routes · branded react-pdf · Resend send · audit log + $0.50 cap · `scripts/deploy.sh` |
| 2026-05-05 | Chat C | **PUBLIC URL LIVE: https://quote-agent.tunderman.cc** — DNS A record added (Cloudflare, DNS-only), Caddy site block added + reloaded zero-downtime, valid LE cert issued, HTTPS 200 verified externally. SchilderGroei + lead-websites unaffected (services + ports + diff verified identical to pre-change snapshot). |
| 2026-05-05 | Chat C | Wrote `scripts/teardown.sh` (idempotent, confirmation-gated cleanup for end of demo) |
| 2026-05-05 | Chat C | Discovered + documented publishing blocker: Hetzner Cloud Firewall blocks ports 1024+ externally; Cloudflare API token currently invalid |
| 2026-05-05 | Chat C | Hello-world Next.js 14 standalone build verified loopback-reachable at `http://localhost:3100` (HTTP 200, 4231 bytes); service stopped post-verify |
| 2026-05-05 | Chat C | Created `/etc/systemd/system/greenscape-quote-agent.service` (loopback bind, root user, optional .env, Restart=on-failure); daemon-reloaded; not enabled |
| 2026-05-05 | Chat C | Created `/opt/greenscape-quote-agent` on Server 1 + snapshotted services, ports, Caddyfile (in `/tmp/*-before.*`) |
| 2026-05-05 | Chat B | Shipped all 4 pages (`/quotes`, `/quotes/new`, `/quotes/[id]`, `/admin/line-items`) with mock-backed data adapter, server actions, full component library, design system per `docs/08-design-system.md`. 9-section proposal mock + allowance/custom catalog items aligned to D26-D30. No `app/api/` files — adapter is the swap point for Chat A's real API. |
| 2026-05-05 | Chat A | Onboarded; STATUS sync; began Phase 1 (Supabase migration + backend deps) |
| 2026-05-05 | Chat B | Scaffolded Next.js 15 + TS + Tailwind w/ brand tokens; wrote `lib/types.ts` (API contract), `data/mocks/catalog.ts` (~58 items), `lib/utils.ts`, `.env.example` skeleton |
| 2026-05-05 | planning | ⚡ Industry research integrated → schema + 9-section template (D26-D30); see HEADS-UP above |
| 2026-05-05 | planning | `docs/10-industry-research.md` written (research sub-agent, 1466 words, 15 questions answered with primary sources) |
| 2026-05-05 | planning | Initial commit pushed: strategy.md + docs/00-09 + STATUS.md + prompts/ |
| 2026-05-05 | planning | Decision log created (`docs/09-decision-log.md`) |
| 2026-05-05 | planning | Design system created (`docs/08-design-system.md`) |
| 2026-05-05 | planning | Repo set to private on GitHub |
| 2026-05-05 | planning | Strategy doc + 6 project setup docs + assumptions registry complete |
| 2026-05-05 | planning | GitHub repo created: greenscape-quote-agent |

---

## Active blockers

~~### B-002 · Three one-shot user actions~~ → RESOLVED 2026-05-05 (migration applied, .env populated locally + on Hetzner, schema exposed via SQL editor, full integration test passed)

### B-002 (historical) · Three one-shot user actions to unlock end-to-end test

The full Chat A backend is coded, typechecked, and production-built green. Three short user actions (≤5 minutes total) unblock the integration test and the first real deploy:

**1. Apply Supabase migration** (3 SQL files in `supabase/migrations/`, in order):
   - `20260505_001_greenscape_schema.sql` — schema, types, RLS, indexes, triggers
   - `20260505_002_seed_pricing_catalog.sql` — ~50 fixed catalog items + 2 allowance items + 5 demo customers
   - `20260505_003_research_updates.sql` — `item_type` enum, `payment_schedule`, `roc_license_number`, `insurance_carrier`

   Either OK the next Supabase MCP `apply_migration` calls (Chat A will trigger), or apply via Supabase dashboard SQL editor / CLI.

**2. Populate `.env.local`** at project root with at minimum:
   - `ANTHROPIC_API_KEY` — new dedicated key (preferred per credentials.md), or temp-reuse SchilderGroei's (~$1-3 dev+demo cost)
   - `RESEND_API_KEY` — for email send
   - `RESEND_FROM_EMAIL` — verified-domain sender
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Optional: `GREENSCAPE_ROC_LICENSE`, `GREENSCAPE_INSURANCE`

**3. Populate `/opt/greenscape-quote-agent/.env`** on Server 1 with the same vars (Chat C's systemd unit reads this file via `EnvironmentFile=`).

Once these land, Chat A runs the integration test (3 happy-path quotes + edge cases) and dispatches the final code-review subagent.

### Resolved

#### ~~B-001 · External publishing~~ → RESOLVED 2026-05-05

User added Cloudflare DNS record `quote-agent.tunderman.cc → 157.90.124.14` (DNS-only) manually via dashboard. Chat C added Caddy site block, validated, reloaded. External HTTPS GET verified 200 with valid LE cert. Public URL: **https://quote-agent.tunderman.cc**.

**Chat A deploy command (now unblocked):**

```
ssh -i ~/.ssh/id_ed25519 root@157.90.124.14 \
  'cd /opt/greenscape-quote-agent && \
   git pull && npm ci && npm run build && \
   systemctl restart greenscape-quote-agent'
```

(Or a tarball/rsync flow — Chat A's call. Service looks for `.env` at `/opt/greenscape-quote-agent/.env` if present.)

---

## How to use this file

**Reading:** Every chat reads STATUS.md at start of session. `git pull` first. Look at "Current overall phase" + your own "Per-chat status" + "Open decisions" + "Recent completions".

**Writing (Chat A — primary):**
- Update "Last updated" timestamp + chat name on every change
- Update "Current overall phase" when transitioning between phases
- Append to "Recent completions" (top of list, most recent first; keep last 20 entries)
- Update "Per-chat status" for Chat A's section and any cross-cutting status
- Add to "Active blockers" when blocked
- Update "Key URLs" when new URLs come online

**Writing (Chat B — frontend):**
- ONLY update Chat B's row in "Per-chat status"
- Append commits to "Recent completions" with `Chat B` tag
- Add to "Active blockers" if blocked on something Chat A or C owns

**Writing (Chat C — deploy):**
- ONLY update Chat C's row in "Per-chat status"
- Update "Deploy URL" in Key URLs when port is assigned
- Append milestone events to "Recent completions" with `Chat C` tag

**Conflict avoidance:** Each chat owns specific lines. If conflict on commit, the rule is: Chat A's section wins for "current phase" + "blockers"; each chat owns its row in "Per-chat status".
