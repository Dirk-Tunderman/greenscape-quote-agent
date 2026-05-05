# 13 — Frontend Internals (Chat B)

**Deep-dive reference for everything Chat B owns** — pages, components, data flow, edit patterns, edge cases, and maintenance notes. Read this when continuing UI work, debugging a page, or wiring the frontend to Chat A's real API.

**Companion docs:**
- `11-current-state.md` — cross-cutting application snapshot (start here for the big picture)
- `12-deployment.md` — Hetzner / Caddy / systemd / DNS reference (Chat C's domain)
- `08-design-system.md` — colors, typography, voice, component patterns (the spec this implements)

---

## Quick orientation

- **Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind v3 · Cormorant Garamond + Inter (Google Fonts) · zod · react-markdown · clsx
- **Pages:** 4 (`/quotes`, `/quotes/new`, `/quotes/[id]`, `/admin/line-items`) + `/` redirects to `/quotes`
- **Data path right now:** Server Components import from `data/store.ts`, which reads/mutates the in-memory mocks in `data/mocks/`. **No `fetch()` to `/api/` yet.**
- **Mutations:** server actions co-located with each page (`app/.../actions.ts`). Chat A's API routes exist but the frontend doesn't call them yet — see "Wiring to backend" below.
- **Verified:** all 4 pages render at 1440px and 375px with no console errors. Validation_failed correctly disables Approve. Inline edits + optimistic UI work.

---

## Pages

### `/quotes` — list view

**File:** `app/quotes/page.tsx` (Server Component) + `app/quotes/QuotesFilterBar.tsx` (Client)

**Renders:**
- 3 stat cards (quotes in view · total sent value · cumulative API cost)
- Filter bar: search (customer/email/project type/quote ID) + status select. Both update the URL query and re-fetch via Server Component.
- Sortable table (currently sorted by `created_at desc`) with: quote ID, customer name + email, project type, status badge, total, API cost, created date
- Inline render badge on rows where `total > $30K`
- Empty state with CTA when filter returns nothing

**What works:** filtering, search, status badges, render flag, empty state.
**Edge cases handled:** zero rows, filter clearing.
**Not yet:** real-time refresh after mutations elsewhere (relies on `revalidatePath`).

### `/quotes/new` — input form

**Files:** `app/quotes/new/page.tsx` · `NewQuoteForm.tsx` (Client) · `actions.ts` (server)

**Form fields:** Name (req) · Email (req, validated) · Phone · Address (req) · Project type (req, select) · Budget signal (informational) · Site walk notes (req, ≥20 chars) · HOA checkbox

**Flow:** submit → zod validates → on error, returns `{ fieldErrors, values }` and form re-renders inline errors with input preserved → on success, calls `store.createDraft()` → redirects to `/quotes/[new_id]`.

**What works:** all validation, error surfacing, pending state on submit button (`useFormStatus`).
**Not yet:** server action calls `data/store.createDraft()` (mock) which clones an existing seed quote with the new customer/notes attached. Real integration: swap to `POST /api/agent/draft` → returns `{ quote_id }` → redirect.

### `/quotes/[id]` — review · edit · approve

**Files:** `app/quotes/[id]/page.tsx` (Server) + 7 sub-components + `actions.ts`

**Composition (top to bottom):**
1. **Header:** breadcrumb → `PageHeader` with customer name, status badge, ApproveBar
2. **Sent banner** (when status = sent/accepted): "Sent to email on date · Download PDF"
3. **Customer card** + **Agent run card** (cost, skill calls, validation status, audit log link)
4. **ValidationPanel** (only when `validation.pass === false`)
5. **Extracted scope** card + **Ambiguities** card (side by side on desktop)
6. **Line items** card with grouped table + per-category subtotals + total + render flag
7. **Site walk notes** card (read-only, raw input)
8. **Proposal draft** card with tabbed Preview/Edit-markdown
9. **Outcome** card (only when status = sent/accepted/rejected/lost)
10. **Sticky-bottom approve bar** (only in editable states)

**Status-driven behaviour:**
- `readOnly = ["sent", "accepted", "rejected", "lost"].includes(status)` — single rule
- All editable surfaces (LineItemsTable, ProposalEditor, ApproveBar) disable when readOnly
- `validation_failed` shows ValidationPanel + Approve is disabled with a tooltip explaining why

**Inline-edit pattern** (LineItemsTable):
- Cells render as buttons → click → input replaces text → Enter or blur commits
- Optimistic local update FIRST → server action fires in transition → error shown if save fails (state stays optimistic so user can retry)
- `line_total` recomputes locally on every edit; server recomputes too (single source of truth lives server-side)

**Audit log modal:** click "View audit log" in Agent run card → modal with per-skill row (model, tokens in/out, duration, cost, OK/Failed). Headline metrics summarized at top.

### `/admin/line-items` — read-only catalog

**File:** `app/admin/line-items/page.tsx` (Server)

Table grouped by category with: name, description, unit, unit price (tabular). Currently shows 58 mock items. No edit/add (Phase 2).

---

## Components

`components/` — all UI primitives. Each is intentionally small and composable.

| File | Purpose |
|---|---|
| `Brand.tsx` | "GP" mark + Greenscape Pro wordmark, used in nav |
| `Nav.tsx` | Top bar — logo, nav links, cumulative API spend (right-aligned, tabular) |
| `PageHeader.tsx` | Eyebrow text + serif title + sandstone underline rule + optional description + actions slot |
| `Card.tsx` | `<Card>`, `<CardHeader>`, `<CardBody>` — the ubiquitous content container |
| `Button.tsx` | 4 variants (primary/secondary/ghost/destructive) × 3 sizes (sm/md/lg) |
| `Input.tsx` | `<Field>`, `<Input>`, `<Textarea>`, `<Select>` — form primitives with label + helper + error |
| `StatusBadge.tsx` | 8 status pills with semantic color + dot + text label (WCAG AA) |
| `Modal.tsx` | Esc + backdrop close, body scroll lock, aria-modal |
| `EmptyState.tsx` | Dashed-border card with title + description + action |

---

## Data flow

```
                         ┌─────────────────────┐
                         │ Server Components   │
                         │ (page.tsx files)    │
                         └────────┬────────────┘
                                  │ call exported async fns
                                  ▼
                         ┌─────────────────────┐
                         │ data/store.ts       │  ← THE SEAM
                         │ (data adapter)      │
                         └────────┬────────────┘
                                  │ today: in-memory
                                  ▼
                         ┌─────────────────────┐
                         │ data/mocks/         │
                         │ catalog.ts          │
                         │ quotes.ts           │
                         └─────────────────────┘

       ┌───────────────────────────────────────────┐
       │ Mutations (form submit, inline edit, etc) │
       └────────┬──────────────────────────────────┘
                ▼
       ┌─────────────────────┐
       │ Server actions      │  app/.../actions.ts
       │ (use server)        │  zod validate → store mutate → revalidatePath
       └────────┬────────────┘
                ▼
       data/store.ts (same adapter — read paths and mutations share it)
```

### `data/store.ts` exports (the contract)

| Function | Returns | Backend equivalent |
|---|---|---|
| `listQuotes({status, search})` | `QuoteSummary[]` | `GET /api/quotes?status=&search=` |
| `getQuote(id)` | `QuoteDetail \| null` | `GET /api/quotes/[id]` |
| `listLineItems()` | `LineItem[]` | `GET /api/line-items` |
| `cumulativeCost()` | `number` (USD) | derive from listQuotes() |
| `createDraft(body)` | `{ quote_id }` | `POST /api/agent/draft` |
| `patchQuote(id, patch)` | `QuoteDetail` | `PATCH /api/quotes/[id]` |
| `sendQuote(id)` | `{ pdf_url, sent_at }` | `POST /api/quotes/[id]/send` |
| `setOutcome(id, outcome, notes)` | `QuoteDetail` | `PATCH /api/quotes/[id]` (status + outcome_notes) |

### `lib/types.ts` — the shared contract

Owned jointly by Chat A + Chat B. Frontend uses every type. Backend uses these for API response shapes. **If you add or change a field, both sides must update together.**

Key types: `Quote`, `Customer`, `LineItem`, `QuoteLineItem`, `ScopeItem`, `Ambiguity`, `ValidationResult`, `AuditLogEntry`, `QuoteDetail`, `QuoteSummary`, `DraftRequestBody`.

---

## Wiring to backend (the swap)

Chat A's API routes are live (see `app/api/`). To activate real data:

1. Open `data/store.ts`
2. Replace each function body with `fetch()` to the corresponding endpoint (table above)
3. Keep the function signatures — pages don't change
4. Drop the `data/mocks/` imports + `STATE` block once all functions are swapped
5. Verify cumulative cost still aggregates (might need a `/api/quotes?include=cost_summary` or just sum on the client)

**Order of swap (lowest risk first):**
- `listLineItems()` — read-only, no mutations downstream
- `listQuotes()` — drives `/quotes` list page
- `getQuote(id)` — drives `/quotes/[id]` detail page
- `createDraft(body)` — first mutation, validates the agent integration end-to-end
- `patchQuote()`, `sendQuote()`, `setOutcome()` — last; lowest-blast-radius failure modes

After all swapped, delete `data/mocks/quotes.ts`. Keep `data/mocks/catalog.ts` as a fallback fixture for tests if useful.

---

## Design system adherence (`docs/08-design-system.md`)

| Spec | How it lands |
|---|---|
| Mojave Green primary, Sandstone secondary, Caliche White surface | `tailwind.config.ts` extends the palette; classes `bg-mojave-green`, `bg-caliche-white`, etc. |
| Cormorant Garamond headings, Inter body | Loaded via Google Fonts in `app/globals.css`; `font-serif` for headings, `font-sans` (default) for body |
| Tabular numerals on prices | `.tnum` utility in `globals.css`; applied on every `formatCurrency` cell |
| Status badges with color + text | `components/StatusBadge.tsx` with dot + label |
| Generous whitespace | `space-y-10` between sections, `p-6` card body, `px-6 md:px-8` page padding |
| No purple gradients, no rounded-everything, no exclamation-mark copy | Verified — design system fully respected |
| WCAG AA contrast | Saguaro Black on Caliche White = 18:1; Mojave Green on Caliche White = 9:1; semantic statuses = ≥4.5:1 |
| Quiet voice in copy | "4 line items in this proposal", "Sent to email", no "" |

---

## What works · what doesn't · what's deferred

### Works
- All 4 pages render and navigate
- Status filter + search on /quotes
- Form validation + error surfacing on /quotes/new
- Inline-edit line items with optimistic UI + recompute
- Markdown proposal preview + edit tabs
- Approve flow with confirmation modal
- Audit log modal with per-skill cost/duration/tokens
- Outcome panel after send
- Read-only mode on terminal statuses
- Mobile-responsive (verified at 375px)
- No console errors on any page
- 5 mock quotes covering every UI state for demo

### Doesn't yet
- Frontend doesn't call Chat A's real API — store.ts still reads mocks
- No streaming of agent progress during draft creation (just spinner + redirect)
- No optimistic preview while agent runs in background
- No real-time updates if backend mutates a quote (would need polling or websockets)

### Deferred (out of MVP scope)
- Voice memo upload + Deepgram transcription
- Photo upload + vision LLM
- Multi-user auth
- HOA package generator
- Mobile-first PWA
- Customer portal
- AI cover banner per project

---

## Edge cases handled

| Case | Where | Behaviour |
|---|---|---|
| No quotes yet | `/quotes` | EmptyState with "Create the first quote" CTA |
| Filter returns nothing | `/quotes` | EmptyState with "Try clearing the filter" hint |
| Quote ID doesn't exist | `/quotes/[id]/not-found.tsx` | Friendly not-found page with back link |
| Form validation fails | `/quotes/new` | Inline field errors, input preserved |
| Inline edit fails | `LineItemsTable` | Optimistic state stays, error chip shown, user can retry |
| Status = validation_failed | `/quotes/[id]` | ValidationPanel shown, Approve disabled with tooltip |
| Status = sent/accepted/rejected/lost | `/quotes/[id]` | All editing surfaces become read-only via single `readOnly` flag |
| Total > $30K | list + detail | Render-needs flag visible (terracotta accent) |
| Modal escape | `Modal` | Esc + backdrop click both close, body scroll locked |
| Empty scope/ambiguities | detail page | Italic "No ambiguities flagged" / "No scope items extracted" |

---

## Maintenance notes

- **Don't author `li_NNN` ids by hand.** Use `findItemByName()` so renames don't silently break references.
- **Adding a quote status:** add to `QuoteStatus` in `lib/types.ts`, then add a STYLES entry in `StatusBadge.tsx` (TS will fail until you do), then update the readOnly check in `app/quotes/[id]/page.tsx` if it's terminal.
- **Adding a server action:** colocate with the page in `actions.ts`, return `{ ok: true } | { ok: false, error }` discriminated union, call `revalidatePath` for any affected paths.
- **Adding a new page:** start in `app/.../page.tsx` as a Server Component, use Card/CardHeader/CardBody for layout consistency, add a NavItem in `components/Nav.tsx`.
- **Don't add `app/api/` routes from the frontend side.** That's Chat A's territory; coordinate via STATUS.md if a new endpoint is needed.
- **Tailwind class drift:** if you add a brand color, add it to `tailwind.config.ts` AND update `docs/08-design-system.md`.
- **Accessibility:** never rely on color alone — status badges include text labels, certainty chips include words, errors have role="alert".
- **Comments policy:** top-of-file headers explain WHY; inline comments only where the WHY is non-obvious. Don't comment what well-named identifiers already say.

---

## Where to look when

| Symptom | Likely place |
|---|---|
| "Cannot read property X" on a page | A `lib/types.ts` field changed underneath the mocks → add it to `data/mocks/quotes.ts` build |
| Status filter shows wrong rows | `data/store.ts::listQuotes` filter logic |
| Edit doesn't save | `app/quotes/[id]/actions.ts` + check Network tab for the server action POST |
| Numbers don't align in column | Missing `tnum` class — see `lib/utils.ts::formatCurrency` callsites |
| Status pill wrong color | `components/StatusBadge.tsx` STYLES map |
| Page renders but blank | Likely a `notFound()` early-return; check the URL matches a mock seed ID |
| Approve button disabled but should work | Status check in `ApproveBar.tsx` — `blocked = status !== "draft_ready"` |
