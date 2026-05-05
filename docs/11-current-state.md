# 11 — Current State (Snapshot · 2026-05-05)

This doc is the **source of truth for what the application actually does today**, as opposed to docs 00-10 which describe the plan + design + research.

If something here disagrees with 00-10, **this doc wins** — and 00-10 should be updated or annotated.

> **Update rule:** Refresh this doc only when behavior, surface area, or shape of the app changes. Not on every commit.

---

## TL;DR

- **Live URL:** https://quote-agent.tunderman.cc (Hetzner VPS, Caddy + LE cert + systemd)
- **Repo:** https://github.com/Dirk-Tunderman/greenscape-quote-agent (private)
- **Status:** End-to-end live. Frontend reads from real DB (no mocks), agent triggers from form submit, line items + sections + customer fields all editable inline, PDF download replaces the email send (re-runnable from any non-outcome state).
- **End-to-end verified:** Multiple agent runs in production across $3.5K–$59K range. Browser-driven flow confirmed: form → agent → edit line items / sections / customer → PDF download → re-edit → re-download.
- **Anthropic spend so far:** ~$1 across all dev + integration tests

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
                                              │      (full-list line items
                                              │       drop+insert; total
                                              │       recomputed server-side)
                                              │
                          PATCH /api/customers/[id]  ←  inline edits to
                                                         name/email/phone/address
                                              │
                                              ▼
Marcus generates PDF    →  POST /api/quotes/[id]/send
                                              │
                                              ▼
                          ┌──────────────────────────────────────┐
                          │ Render PDF (lib/pdf/template.tsx)    │
                          │ Upload to Supabase Storage           │
                          │ Return signed URL (no email send)    │
                          │ status → sent (= "PDF Ready",        │
                          │           re-runnable, not terminal) │
                          └──────────────────────────────────────┘
                                              │
                                              ▼
                          Marcus edits more  →  re-runs above as needed
                                              │
                                              ▼
                          Outcome (accepted / rejected / lost)
                          → readOnly = true (only state that locks editing)
```

---

## Live data model (`greenscape` schema in Supabase)

| Table | Rows today | Purpose |
|---|---|---|
| `customers` | 5 demo + N created | name + email + phone + address |
| `line_items` | 58 (56 fixed + 2 allowance) | priced catalog Marcus quotes against |
| `quotes` | 5+ live | one row per draft/sent proposal |
| `quote_line_items` | per-quote rows | priced items snapshotted onto a quote (`line_item_id` is **nullable** — manually-added custom rows have no catalog FK) |
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
2. `## {Customer Name} · {Address}` — H2 doubles as greeting container
3. `## Project Overview`
4. `## Detailed Scope & Pricing` (table with allowance items flagged) + `**Project Total: $X**`
5. `## Exclusions`
6. `## Timeline`
7. `## Warranty`
8. `## Terms & Next Steps` (per-quote payment schedule, default 30/30/30/10)
9. `## Signature`

(Cover-page metadata — proposal #, date — lives in the PDF template, not in the markdown.)

**Single-source pricing (D34).** The proposal_markdown column is a snapshot, not a source of truth. The on-screen editor (`app/quotes/[id]/ProposalEditor.tsx`) re-derives section 4 (Detailed Scope & Pricing) from the live `line_items` and section 8's payment-schedule block from `total × payment_schedule` at render time AND at save time. Marcus edits items in the line-items panel; the proposal's pricing surfaces follow automatically. Other sections (Greeting, Project Overview, Exclusions, Timeline, Warranty, the rest of Terms, Signature) stay freely editable text. The PDF (`lib/pdf/template.tsx`) renders from `line_items` + `payment_schedule` directly, so it is the same source of truth.

---

## API surface (live)

All routes run on Node.js (`runtime = "nodejs"`). All consume/return JSON.

| Method | Path | Purpose | maxDuration |
|---|---|---|---|
| POST | `/api/agent/draft` | run orchestrator → return draft_id + status + cost | 240s |
| GET | `/api/quotes` | list `QuoteSummary[]` with optional `?status=` filter | 30s default |
| GET | `/api/quotes/[id]` | full `QuoteDetail` (joins customer + line_items + artifacts + audit_log) | 30s default |
| PATCH | `/api/quotes/[id]` | edit line items (full-list drop+insert) / proposal_markdown / outcome / status — auto-recomputes total | 30s default |
| POST | `/api/quotes/[id]/send` | render PDF → upload to Storage → return signed URL. **No email send.** Re-runnable from `draft_ready`/`validation_failed`/`sent`. | 60s |
| PATCH | `/api/customers/[id]` | edit any subset of `{name, email, phone, address}` for the customer record | 30s default |
| GET | `/api/line-items` | catalog read (ordered by category, unit_price) | 30s default |

**Request/response shapes** are the TS types in `lib/types.ts` — that file is the API contract.

`data/store.ts` is the single seam between frontend (server components, server actions) and these routes. Server-side fetch uses a loopback URL (`http://127.0.0.1:${PORT}`) to reach the API in the same Node.js process.

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
- ❌ Customer-facing email send on approval (Phase 2 — `lib/email.ts` Resend wrapper retained, no live route invokes it; D32)
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
- **Line item edits → proposal sections** sync after revalidate, not instantly. The ProposalEditor's section 4 + section 8 payment block re-derive when the page receives fresh props (post-save revalidatePath). During the optimistic UI window (~200–500ms after editing a line item) the proposal still shows the previous values. Acceptable for the demo; lifting state into a shared client wrapper would make sync instant.
- **Manual line items use temp IDs locally** — `tmp_*` prefixed IDs in client state; the store strips non-UUID IDs before PATCH so the server treats them as fresh inserts. Server-assigned UUIDs come back on the next read.

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
| Why is editing not locked when a PDF is generated? | `docs/09-decision-log.md` D33 |
| Why don't we email the customer ourselves? | `docs/09-decision-log.md` D32 |
| Why is the proposal's "Detailed Scope & Pricing" section auto-derived? | `docs/09-decision-log.md` D34 |
| How does the proposal template (PDF) look? | `lib/pdf/template.tsx` |
| Frontend pages | `app/quotes/`, `app/admin/`, `components/` |
| Frontend ↔ API wire-up | `data/store.ts` (the seam — every page/action goes through here) |
| Inline-edit patterns | `app/quotes/[id]/LineItemsTable.tsx` (line items), `app/quotes/[id]/CustomerCard.tsx` (customer fields), `app/quotes/[id]/ProposalEditor.tsx` (proposal sections) |
| Hetzner systemd / Caddy | not in repo — `/etc/systemd/system/greenscape-quote-agent.service` and `/etc/caddy/` on Server 1 |
| Server cleanup script | `scripts/teardown.sh` |
| Deploy script | `scripts/deploy.sh` |

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

## Coordination conventions (post-v2)

The original 3-chat split (A backend / B frontend / C deploy) ran during the initial build. After the v2 wire-up the boundary is informal — touch what you need to touch — but the originating ownership is preserved in commit history if you need to trace why a specific piece looks the way it does.

- **STATUS.md** is the live coordination dashboard — read at start of session.
- **`docs/09-decision-log.md`** records *why*. Don't undo entries without explicit user OK.
- **This doc (`11-current-state.md`)** is *what is* — the WHAT, not the WHY. Refresh on behavior or surface-area change, not on every commit.
- **`LEARNING.md`** at repo root captures non-obvious gotchas worth keeping for future sessions.
