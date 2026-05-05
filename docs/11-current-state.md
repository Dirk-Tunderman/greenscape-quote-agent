# 11 — Current State (Snapshot · 2026-05-05)

This doc is the **source of truth for what the application actually does today**, as opposed to docs 00-10 which describe the plan + design + research.

If something here disagrees with 00-10, **this doc wins** — and 00-10 should be updated or annotated.

> **Update rule:** Refresh this doc only when behavior, surface area, or shape of the app changes. Not on every commit.

---

## TL;DR

- **Live URL:** https://quote-agent.tunderman.cc (Hetzner VPS, Caddy + LE cert + systemd)
- **Repo:** https://github.com/Dirk-Tunderman/greenscape-quote-agent (private)
- **Status:** Backend (Chat A) complete · Frontend (Chat B) 4 pages live · Deploy (Chat C) live with valid cert
- **End-to-end verified:** 2 integration tests passed in production (Patel $15,955 patio+irrigation, Chen $59,000 full backyard with `needs_render: true`)
- **Anthropic spend so far:** ~$0.50 across all dev + integration tests

---

## What it does end-to-end

```
Marcus pastes notes  →  /quotes/new  →  POST /api/agent/draft
                                              │
                                              ▼
                          ┌──────────────────────────────────────┐
                          │ Orchestrator (lib/orchestrator.ts)   │
                          │                                      │
                          │  customer find-or-create             │
                          │  insert quote (status=drafting)      │
                          │  ┌─ extract_scope    (Sonnet 4.5)    │
                          │  ├─ match_pricing   (Sonnet, tools)  │
                          │  ├─ flag_ambiguity  (Haiku 4.5)      │
                          │  ├─ generate_proposal (Sonnet)       │
                          │  ├─ validate_output (Haiku +         │
                          │  │   deterministic regex)            │
                          │  └─ retry_once_on_validate_fail      │
                          │                                      │
                          │  persist artifacts +                 │
                          │  quote_line_items + audit_log        │
                          │  status → draft_ready                │
                          └──────────────────────────────────────┘
                                              │
                                              ▼
Marcus reviews + edits  →  /quotes/[id]  →  PATCH /api/quotes/[id]
                                              │
                                              ▼
Marcus approves         →  POST /api/quotes/[id]/send
                                              │
                                              ▼
                          ┌──────────────────────────────────────┐
                          │ Render PDF (lib/pdf/template.tsx)    │
                          │ Upload to Supabase Storage           │
                          │ Email customer via Resend            │
                          │ status → sent                        │
                          └──────────────────────────────────────┘
```

---

## Live data model (`greenscape` schema in Supabase)

| Table | Rows today | Purpose |
|---|---|---|
| `customers` | 5 demo + N created | name + email + phone + address |
| `line_items` | 58 (56 fixed + 2 allowance) | priced catalog Marcus quotes against |
| `quotes` | 2 from integration tests | one row per draft/sent proposal |
| `quote_line_items` | per-quote rows | priced items snapshotted onto a quote |
| `quote_artifacts` | per-quote rows | scope, ambiguities, validation_result, priced_items as jsonb |
| `audit_log` | one row per LLM call | model + tokens + cost + duration + success |

Triggers:
- `quotes.updated_at` auto-updates on row UPDATE
- `quotes.needs_render` auto-set to `true` when `total_amount > 30000` (D11 — Carlos render flag)

RLS: enabled on all 6 tables with `anon`-deny policies. The Next.js API routes use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.

PostgREST: `greenscape` is now in the exposed-schemas list (added via SQL editor — see `B-002` in STATUS.md history).

Forward-compat columns on `quotes` (kept for future engagement, not enforced today): `payment_schedule jsonb`, `roc_license_number text`, `insurance_carrier text`. ROC + insurance were stripped from the generation flow per user instruction (Greenscape Pro is a fictional client for this take-home).

---

## Agent skill chain (live config)

| # | Skill | Model | Temp | Max tok | Cost ≈ | Job |
|---|---|---|---|---|---|---|
| 1 | `extract_scope` | claude-sonnet-4-5-20250929 | 0.2 | 2000 | $0.012 | freeform notes → structured ScopeItem[] (zod-validated) |
| 2 | `match_pricing` | claude-sonnet-4-5-20250929 | 0.1 | 4000 | $0.040 | scope items → priced QuoteLineItem[] (tool use against `line_items`) |
| 3 | `flag_ambiguity` | claude-haiku-4-5-20251001 | 0.3 | 800 | $0.003 | what does Marcus need to clarify? (max 5) |
| 4 | `generate_proposal` | claude-sonnet-4-5-20250929 | 0.5 | 3500 | $0.030 | 8-section proposal markdown in Marcus's voice |
| 5 | `validate_output` | claude-haiku-4-5-20251001 | 0.0 | 800 | $0.003 | 13 deterministic checks + LLM voice/claims pass |

Per-quote total ~$0.09–0.23 measured · cap is $0.50 (enforced before retry) · `audit_log` records every call.

The chain is **deterministic + sequential** with **one corrective re-prompt** of `generate_proposal` if `validate_output` fails. Per-call SDK timeout: 60s. Route timeout: 240s.

### What each skill outputs

- **extract_scope:** `ScopeItem[]` — `{category, description, dimensions?, material_notes?, certainty, needs_clarification?}` with strict zod validation
- **match_pricing:** `{priced_items: QuoteLineItem[], custom_item_requests}` — uses `lookup_line_items` tool (multi-turn). Catalog IDs verified against DB after the fact (rejects hallucinated UUIDs)
- **flag_ambiguity:** `Ambiguity[]` — `{scope_item_index, question, why_it_matters, severity}` capped at 5
- **generate_proposal:** raw markdown string with 8 H2 sections; total math + structure validated downstream
- **validate_output:** `{pass: boolean, issues: ValidationIssue[]}` — fails only on `severity=error` issues; warns are surfaced but don't block

### Proposal structure (8 sections)

1. `# Proposal`
2. `## {Customer Name} · {Address}`
3. Greeting paragraph (must reference site walk by date + 1-2 specific observations)
4. `## Project Overview`
5. `## Detailed Scope & Pricing` (table with allowance items flagged) + `**Project Total: $X**`
6. `## Exclusions`
7. `## Timeline`
8. `## Warranty`
9. `## Terms & Next Steps` (per-quote payment schedule, default 30/30/30/10)
10. `## Signature`

(Cover-page metadata — proposal #, date — lives in the PDF template, not in the markdown.)

---

## API surface (live)

All routes run on Node.js (`runtime = "nodejs"`). All consume/return JSON.

| Method | Path | Owns | Purpose | maxDuration |
|---|---|---|---|---|
| POST | `/api/agent/draft` | Chat A | run orchestrator → return draft_id + status + cost | 240s |
| GET | `/api/quotes` | Chat A | list `QuoteSummary[]` with optional `?status=` filter | 30s default |
| GET | `/api/quotes/[id]` | Chat A | full `QuoteDetail` (joins customer + line_items + artifacts + audit_log) | 30s default |
| PATCH | `/api/quotes/[id]` | Chat A | edit line items / proposal / outcome / status (auto-recompute total) | 30s default |
| POST | `/api/quotes/[id]/send` | Chat A | render PDF → upload to Storage → email via Resend → mark sent | 60s |
| GET | `/api/line-items` | Chat A | catalog read (ordered by category, unit_price) | 30s default |

**Request/response shapes** are the TS types in `lib/types.ts` — that file is the API contract.

The current frontend (`data/store.ts` per Chat B's commit) consumes these routes. Until the wire-up commit lands, Chat B reads from `data/mocks/` instead.

---

## Cost model (measured, not estimated)

From the production integration tests, real spend:

| Quote | Total | Items | Skill calls | Cost | Time |
|---|---|---|---|---|---|
| Patel — patio + irrigation | $15,955 | 7 | 8 (1 retry) | $0.12 | 81s |
| Chen — full backyard | $59,000 | 16 | 9 (1 retry) | $0.23 | 160s |

Drivers of higher cost: more scope items → more `match_pricing` tool calls; more line items → larger `generate_proposal` prompt.

Per-quote cap of $0.50 is enforced **before** the corrective retry — if you blow the cap mid-run, validation_failed is committed without a retry.

---

## Configuration

### `.env.local` / `/opt/greenscape-quote-agent/.env`

| Var | Required | Source |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | currently SchilderGroei's key (1-week temp reuse) |
| `SUPABASE_URL` | yes | shared instance |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | shared instance — bypasses RLS in API routes |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | same as above |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | shared anon key |
| `RESEND_API_KEY` | yes | shared `re_cfHypG2M_M12...` |
| `RESEND_FROM_EMAIL` | yes | `Greenscape Pro <quotes@notifications.tunderman.io>` |
| `NEXT_PUBLIC_APP_URL` | optional | informational |

`.env.example` is in the repo. `.env.local` and `/opt/.../​.env` are gitignored / never committed.

### Deploy

`scripts/deploy.sh` from a workstation with SSH access:
1. `npm ci` + `npm run build` locally
2. rsync `.next/standalone/` → `/opt/greenscape-quote-agent/` on Server 1 (with `--exclude=.env` so prod secrets survive)
3. rsync `.next/static/` and `public/`
4. `systemctl restart greenscape-quote-agent`
5. health-check on `http://127.0.0.1:3100`

The systemd unit lives at `/etc/systemd/system/greenscape-quote-agent.service` (Chat C). The Caddy site block (Chat C) terminates TLS on `quote-agent.tunderman.cc` and reverse-proxies to `127.0.0.1:3100`.

---

## What it does NOT do (intentional non-goals)

These were explicitly cut from the 24h MVP per `docs/00-project-brief.md`. Each maps to a Phase-2 swap path documented in `docs/06-assumptions.md`.

- ❌ Voice memo input + transcription (Phase 2 — Deepgram)
- ❌ GHL CRM push on approval (Phase 2 — needs GHL OAuth)
- ❌ Stripe deposit invoice generation (Phase 2)
- ❌ DocuSign signature flow (handled in GHL natively)
- ❌ Photo upload + vision LLM grading (Phase 3)
- ❌ Real Greenscape ROC license + insurance enforcement (fictional client; columns kept for forward-compat)
- ❌ Multi-tenant auth (single-tenant MVP)
- ❌ Customer portal (Phase 3)
- ❌ AI banner / cover image generation (bonus, deferred)

---

## What it does NOT do (limitations / known issues)

- **Inter / Cormorant fonts in PDF** — currently uses Helvetica + Times-Roman built into react-pdf. The Google Fonts CDN URL we initially registered returned 404. Day-1 swap once a local font asset pipeline lands.
- **Cost tracking is per skill call only** — there's no daily/monthly aggregate yet. Surface in admin UI is per-quote (`total_cost_usd`).
- **Validate-on-fail retry budget is 1** — if both attempts fail, status `validation_failed` and Marcus sees the issues in admin. Not a gradient.
- **Customer dedup is by email only** — `(name, email, address)` collisions go to the same row.
- **Match-pricing tool fallback** is full-category dump if fuzzy match returns 0 results — could be lossy on >10-item categories. None of our 8 categories has >10 items today.
- **PDF doesn't paginate complex tables** beautifully — long line-item tables can break across pages awkwardly.
- **Storage bucket is created on first send** — if `service_role` lacks `storage.create_bucket`, the first send fails. Currently works.

---

## Where to look for X

| Question | File / dir |
|---|---|
| What does the app do end-to-end? | This doc + `lib/orchestrator.ts` |
| API request/response shapes | `lib/types.ts` |
| What's in the catalog? | `supabase/migrations/20260505_002_seed_pricing_catalog.sql` |
| How does the LLM cost get tracked? | `lib/anthropic.ts` (`priceMessage`) + `lib/audit.ts` |
| Why are there exactly 5 skills (not 1, not 10)? | `docs/09-decision-log.md` D15 |
| Why use `greenscape` schema (not `public`)? | `docs/09-decision-log.md` D13 |
| How does the proposal template look? | `lib/pdf/template.tsx` |
| Frontend pages | `app/quotes/`, `app/admin/`, `components/` (Chat B owns) |
| Frontend mock data | `data/mocks/` (Chat B owns) |
| Frontend ↔ API wire-up | `data/store.ts` (Chat B owns) |
| Hetzner systemd / Caddy | not in repo — `/etc/systemd/system/greenscape-quote-agent.service` and `/etc/caddy/` on Server 1 (Chat C owns) |
| Server cleanup script | `scripts/teardown.sh` (Chat C owns) |
| Deploy script | `scripts/deploy.sh` (Chat A owns) |

---

## Run locally

```bash
git clone https://github.com/Dirk-Tunderman/greenscape-quote-agent
cd greenscape-quote-agent
npm install
cp .env.example .env.local   # populate
npm run dev                  # → http://localhost:3000
```

Dev server picks up `.env.local` automatically. Hot reload works for both pages and API routes.

To run integration tests against a clean DB:
1. Apply the 3 migrations under `supabase/migrations/` in order
2. Curl `POST /api/agent/draft` with a `DraftRequestBody` (see `lib/types.ts`)
3. Read back `GET /api/quotes/{id}` to inspect the orchestrator output

---

## Coordination conventions (across the 3 chats)

- **STATUS.md** is the live coordination dashboard — every chat reads at start of session, Chat A is primary writer
- **`docs/09-decision-log.md`** records *why* — don't undo decisions there without explicit user OK
- **This doc (`11-current-state.md`)** is what *is* — the WHAT, not the WHY
- **CLAUDE.md** (incoming, written by user) — durable instructions for future chats; not in scope for any one chat to write
- **Chat ownership** (commit boundaries):
  - Chat A: `lib/{anthropic,audit,db,skills,orchestrator,pdf,email}.ts`, `app/api/`, `supabase/`, `data/historical-proposals.json`, `scripts/deploy.sh`, root configs
  - Chat B: `app/quotes/`, `app/admin/`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/`, `data/{mocks,store}.ts`, `lib/types.ts` (shared but Chat B is primary)
  - Chat C: server-side at `/opt/`, `/etc/systemd/`, `/etc/caddy/`; `scripts/teardown.sh`
