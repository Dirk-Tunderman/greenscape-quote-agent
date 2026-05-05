# Chat A v2 — Wire-up + Scope Tightening

**Copy-paste this entire prompt into Chat A's session in `~/Desktop/projects/test-project-LS/`. Chat A's prior context was compacted, so this re-onboards from scratch.**

---

You are Chat A — backend orchestrator for the Greenscape Quote Agent (L&S take-home). Your prior session was compacted. The build is live but a critical disconnect was just discovered. This prompt re-onboards you and locks in the next iteration's scope.

## STEP 0 — Re-onboard (mandatory before any code changes)

```bash
cd ~/Desktop/projects/test-project-LS
git pull
```

Read in this order:

1. **`STATUS.md`** — current state across all chats
2. **`CLAUDE.md`** — project priming (was added after your compaction)
3. **`docs/11-current-state.md`** — what the application actually does today (canonical WHAT)
4. **`docs/09-decision-log.md`** — every key decision + reasoning. Pay attention to D26-D30 (research integrations) and D11 (Hetzner over Vercel).
5. **`docs/06-assumptions.md`** — assumption registry, esp. Section 3 (proposal template structure)
6. **This file** — the iteration plan

Spot-check the live state:

```bash
# What's actually in the DB right now?
curl -s https://quote-agent.tunderman.cc/api/quotes | head -120
# Compare to what the UI shows at https://quote-agent.tunderman.cc/quotes
# Spoiler: they don't match. The UI is rendering mocks.
```

## STEP 1 — The critical finding

**The frontend is not actually wired to the backend.** Chat B's `data/store.ts` reads from `data/mocks/quotes.ts` and mutates an in-memory store. The API endpoints are listed as TODO comments but never called.

Concretely:
- `app/quotes/page.tsx` → `data/store.ts:listQuotes()` → reads from `data/mocks/quotes.ts` (5 fake quotes: Henderson, Whitfield, Ortega, Subramanian, Bowen)
- `app/quotes/new/actions.ts:draftAction` → `data/store.ts:createDraft()` → adds row to in-memory mock state. **Does NOT trigger the real agent.**
- `app/quotes/[id]/page.tsx` → `data/store.ts:getQuote()` → reads from in-memory mocks
- "Approve and send" button → `data/store.ts:sendQuote()` → mutates mock state. **No real PDF, no real email.**

Meanwhile the API + agent + DB all work — verified by 2 successful integration tests via curl (Patel $15,955, Chen $59,000). The whole user-facing surface is a façade over a working backend.

This is exactly the brief's failure mode (line 113): *"Shipping something that demos but breaks if you click outside the happy path."*

## STEP 2 — Locked scope decisions (from this session)

The user reviewed the demo and tightened the scope. Write down what's IN and what's OUT, because future-you will be tempted to scope-creep.

### IN scope (this iteration)

- **Wire `data/store.ts` to the real API.** Every function in there gets a `fetch()` to the matching endpoint. Mocks deleted entirely.
- **Rip out email send.** The "Approve and send" button becomes "Approve & download PDF". Resend code can stay in the repo (working code, no harm) but it's no longer the primary action. The PDF download triggers, the customer-facing email step is removed from the user flow.
- **Section-by-section editable proposal.** Currently the proposal draft is a single markdown blob with Preview/Edit-markdown tabs. Marcus is a contractor, not a markdown user. Each of the 8 proposal sections (Greeting, Project overview, Detailed scope & pricing, Exclusions, Timeline, Warranty, Terms & Next steps, Signature) should be its own editable field. This is the "human-in-the-loop control" the user emphasized — Marcus must be able to modify each section independently before exporting.
- **Clean DB list view.** Delete the 3 `validation_failed` quote rows (Patel attempt 1, Chen attempts 1 & 2 — they're build-process artifacts, not real Marcus data). Keep the 3 successful ones (Patel sent, Chen sent, Lopez draft_ready). Optionally generate 2-3 more via real agent runs to round out the list (use the seed customers in DB).
- **Remove the "Budget signal — informational only — not used in agent reasoning" field** from the new-quote form. It's worse than not collecting it. Either delete the field or actually pipe it into the agent as an ambiguity signal (if scope total >> stated budget, flag). User leaned: just delete for now.

### OUT of scope (DO NOT BUILD)

- ❌ DocuSign integration (Marcus does this manually post-export)
- ❌ Stripe deposit invoice generation (Marcus does this manually)
- ❌ Welcome packet automation (Jenna does this)
- ❌ HOA timeline impact on the proposal timeline section (deferred)
- ❌ Crew availability check from Jobber (deferred)
- ❌ Customer-facing email workflow (removed entirely; PDF is downloaded by Marcus)
- ❌ GHL CRM push on approval (deferred to Phase 2)
- ❌ Voice memo capture / Deepgram (Phase 2)
- ❌ Photo upload (Phase 3)
- ❌ Multi-tenant auth (single-tenant MVP)
- ❌ Word/.docx export (PDF is sufficient)

## STEP 3 — Task list (priority order)

Use the `superpowers:subagent-driven-development` pattern: dispatch implementer sub-agent → spec reviewer → code quality reviewer → mark complete → next task. Each task is self-contained.

### Task A1 — Wire `data/store.ts` to the real API ⭐ CORE BLOCKER

**Scope:** Replace every function in `data/store.ts` that currently reads/writes the mock in-memory store with a real `fetch()` call against the matching API endpoint. The endpoint contracts are documented in `docs/11-current-state.md` "API surface" and the TypeScript types are already in `lib/types.ts`.

Mapping:
- `listQuotes(filters?)` → `GET /api/quotes?status=...`
- `getQuote(id)` → `GET /api/quotes/[id]`
- `createDraft(input)` → `POST /api/agent/draft` (this triggers the real agent; takes 60-160s — UI must show loading state)
- `patchQuote(id, partial)` → `PATCH /api/quotes/[id]`
- `sendQuote(id)` → **delete this function** (replaced by direct PDF download)
- `setOutcome(id, status, notes)` → `PATCH /api/quotes/[id]` with status + outcome_notes
- New: `downloadPdf(id)` → `POST /api/quotes/[id]/send` BUT modify the endpoint to: render PDF → upload to Storage → return signed URL. Skip the Resend send step.

Delete `data/mocks/quotes.ts` (or empty it). Delete `data/mocks/catalog.ts` if frontend uses it for anything live (verify). Keep the file structure for reference but no live code path should hit mocks.

**Verification:**
- Open `https://quote-agent.tunderman.cc/quotes` — table shows DB rows (Patel, Chen, Lopez, etc.), not Henderson/Whitfield/Ortega/Subramanian/Bowen
- Click into any quote — full data renders from DB (scope, line items, ambiguities, audit log)
- New quote form actually triggers agent (verify via `audit_log` row appearing)
- Curl + UI agree on quote count and IDs

### Task A2 — Strip email send, rename "Send" to "Download PDF"

**Scope:**
- Rename `POST /api/quotes/[id]/send` → `POST /api/quotes/[id]/finalize` (or keep the URL, change behavior). Behavior: render PDF → upload to Supabase Storage → return public/signed URL. Skip Resend entirely.
- In the UI, the "Approve and send" button (top + bottom of `/quotes/[id]`) becomes "Approve & download PDF". Click → calls finalize endpoint → triggers browser download of returned URL.
- Update status enum semantics: `sent` becomes `finalized` (PDF generated, ready for Marcus to do whatever). Migration: rename the existing enum value or add new one + mark old as deprecated.
- Resend code in `lib/email.ts` stays in repo (working code, sunk cost) but no live route invokes it. Add a code comment explaining it's deferred for Phase 2.

**Verification:**
- Click "Approve & download PDF" → PDF downloads to browser
- Audit log shows the finalize call
- Status transitions cleanly (`draft_ready` → `finalizing` → `finalized`)
- No Resend API call attempted

### Task A3 — Section-by-section editable proposal

**Scope:** This is the "Marcus needs control" piece the user emphasized.

Currently the `proposal_markdown` field is one big markdown blob with Preview/Edit-markdown tabs. Replace with section-level editable fields:

Approach (pick the simplest that ships):

**Option 1 (recommended): parse on read, recombine on save.** Keep `proposal_markdown` as the storage. On render, split by `## ` H2 headers into sections. Each section gets its own editable text area in the UI. On save, recombine into one markdown string and PATCH back.

**Option 2: schema change.** Add a `proposal_sections jsonb` column to `quotes` storing `{greeting, overview, exclusions, timeline, warranty, terms, signature}` as separate fields. More structured but migrations cost time.

Go with **Option 1.**

UI: a collapsible accordion or tabs, one per section. Default state: all sections expanded with their generated content as editable textareas. "Save" button on each section saves immediately (optimistic UI + recompute total if line items change). The line items table (which is already inline-editable) stays as the "Detailed scope & pricing" section.

**Verification:**
- Edit any section, save, refresh page — edit persists
- Edit the line items table (existing flow) — total recomputes correctly
- PDF download reflects all edits across sections
- The 8 sections are: Greeting, Project Overview, Detailed Scope & Pricing (the existing line items table), Exclusions, Timeline, Warranty, Terms & Next Steps, Signature

### Task A4 — Clean the DB list view

**Scope:** Three sub-steps:

```sql
-- Delete the 3 validation_failed quote rows (build-process artifacts)
DELETE FROM greenscape.quotes WHERE status = 'validation_failed';
-- Their related quote_artifacts and audit_log rows will cascade delete
```

Then optionally seed 2-3 additional realistic quotes by hitting the live agent:

```bash
curl -s -X POST https://quote-agent.tunderman.cc/api/agent/draft -H 'Content-Type: application/json' -d '{
  "customer": {"name":"...", "email":"...", "phone":"...", "address":"... Phoenix AZ ..."},
  "project_type": "...",
  "raw_notes": "...",
  "hoa": false
}'
```

Generate 2-3 with varied profile (one ~$10K, one ~$30K with `needs_render`, one ~$50K). Cost: ~$0.30-0.60 total.

**Verification:**
- `/quotes` list shows 5-8 real quotes, mix of statuses (`draft_ready`, `finalized`, `accepted`, `rejected`)
- No `validation_failed` rows visible
- Each quote opens cleanly with full agent run data

### Task A5 — Remove "Budget signal" field

**Scope:** Delete the budget signal dropdown from `app/quotes/new/NewQuoteForm.tsx`. Remove from the form schema in `actions.ts`. Update the `DraftRequestBody` type if it included it. Don't touch DB — no migration needed (it was UI-only).

**Verification:**
- Form no longer shows the field
- Form submission still works
- No TypeScript errors

### Task A6 — Final verification end-to-end

After A1-A5, run the full UI flow once:

1. Open `https://quote-agent.tunderman.cc/quotes/new`
2. Paste realistic notes (~150 words covering 3-4 categories)
3. Click "Draft proposal"
4. Wait 60-160s for agent to complete (UI loading state)
5. Land on `/quotes/[id]`
6. Verify: scope items, line items, ambiguities, draft proposal sections all rendered
7. Edit one line item quantity → total recomputes
8. Edit the Greeting section → save → refresh → persists
9. Click "Approve & download PDF"
10. PDF downloads, opens in viewer, all edits reflected
11. Back to `/quotes` — new quote appears in list with `finalized` status

Verify in DB:
```sql
SELECT id, status, total_amount, total_cost_usd FROM greenscape.quotes ORDER BY created_at DESC LIMIT 5;
SELECT skill_name, model, cost_usd, success FROM greenscape.audit_log WHERE quote_id = (SELECT id FROM greenscape.quotes ORDER BY created_at DESC LIMIT 1);
```

Both should show the new quote and its complete audit trail.

## STEP 4 — Verification before claiming done

Per `superpowers:verification-before-completion` skill (read it):

- ❌ Don't claim "wire-up done" without showing the UI rendering DB rows
- ❌ Don't claim "PDF download works" without actually downloading and opening one
- ❌ Don't claim "section editing works" without saving an edit and reloading
- ❌ Don't claim "demo-ready" without running the full end-to-end happy path
- ✅ Provide concrete proof: curl output, screenshot reference, DB query result

## STEP 5 — Coordination

- **Update `STATUS.md`** at start (mark Chat A v2 active) and after each major task
- **Commit per task** with clear messages: `Chat A v2: wire data/store to real API`, etc.
- **`STATUS.md` HEADS-UP block** can be removed after this iteration (the research integration is done)
- **Tell user when stuck** — esp. if the section-editing UX needs a design decision

## STEP 6 — What was already done (so you don't redo it)

- Strategy + 13 docs + decision log + research + design system + assumptions registry — all complete and current
- CLAUDE.md + LEARNING.md created
- Repo is private on GitHub: `Dirk-Tunderman/greenscape-quote-agent`
- Hetzner deploy live at https://quote-agent.tunderman.cc with Caddy + Let's Encrypt + systemd
- Supabase `greenscape` schema with 6 tables, RLS, triggers, 58 line items, 5 customers seeded
- Agent skill chain (5 skills + orchestrator) verified end-to-end via 2 integration tests
- React-pdf branded template (8 sections, fonts fall back to Helvetica/Times — known issue)
- Anthropic key currently SchilderGroei's (temp reuse; swap on teardown)
- Total Anthropic spend so far: ~$0.50

## STEP 7 — User preferences (from CLAUDE.md auto-loaded)

- Terse, direct communication. No fluff.
- Auto mode is on. Prefer action over planning. Reasonable defaults > clarifying questions.
- Risky/destructive ops require confirmation (DB deletes are OK here — they're documented in this prompt).
- Honest about trade-offs. Push back when reasoning is weak.

## What "done" looks like for this iteration

- [ ] `data/store.ts` calls real API endpoints (no mock state)
- [ ] `data/mocks/quotes.ts` deleted (or emptied with comment "deprecated")
- [ ] UI list view shows DB quotes (Patel, Chen, Lopez, plus any new ones), not Henderson/Whitfield/etc.
- [ ] New quote form actually triggers the real agent (audit_log row appears per call)
- [ ] "Approve and send" button replaced with "Approve & download PDF"
- [ ] `lib/email.ts` Resend code remains but no live route invokes it (commented as deferred)
- [ ] Proposal sections individually editable (8 sections, accordion or tabs)
- [ ] Edits persist in DB and reflect in downloaded PDF
- [ ] Budget signal field removed from new-quote form
- [ ] DB has no `validation_failed` artifact rows in the list view
- [ ] Full end-to-end happy path verified: notes → agent → edit → download
- [ ] STATUS.md updated to reflect Chat A v2 completion
- [ ] All commits pushed to `main`

After done: dispatch the final code-review subagent, then we move to Loom recording + L&S submission.

---

**Begin with STEP 0. The wire-up (Task A1) is the single most important thing — it transforms the demo from a façade over a working backend into an actual working product.**
