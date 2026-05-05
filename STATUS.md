# STATUS

**Single coordination dashboard for the multi-chat build.** Every chat reads this at start. Chat A (backend orchestrator) is primary writer. Chat B / Chat C update only their own sections.

---

## Last updated

`2026-05-05` · Chat A (active)
Next update: end of Phase 1

---

## Current overall phase

**Phase 0 → Phase 1 transition.** Chat B has scaffolded Next.js + types + design tokens + mock catalog. Chat A now owns: backend deps, Supabase migration + seed, agent skill chain, API routes, PDF, email.

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

### Chat A (Backend Orchestrator) — **active**
- **Owns:** Supabase schema + seed, agent skill chain, orchestrator, API routes, PDF, Resend email, audit log + cost tracking, deploy script, final review
- **Currently doing:** wiring backend deps + Supabase migration (Phase 1)
- **Last commit:** N/A (working uncommitted)
- **Blockers:** none
- **Waiting on:** none. Will need real `ANTHROPIC_API_KEY` in `.env.local` before first end-to-end agent run.

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
- **Currently doing:** committing
- **Blockers:** none
- **Waiting on:** Chat A's API routes — when ready, swap `data/store.ts` function bodies to `fetch()` against `/api/agent/draft`, `GET/PATCH /api/quotes`, `POST /api/quotes/[id]/send`. Pages don't change.

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
- **Last commit:** see git log (Chat C: server-side prep; Chat C: publish)
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

_(none — kickoff complete; B-001 resolved via Path B with `tunderman.cc`)_

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
