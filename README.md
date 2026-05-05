# Greenscape Quote Agent

L&S take-home submission. AI-powered quote drafting agent for **Greenscape Pro**, a fictional Phoenix-based hardscape & landscape design-build company.

---

## Live

| | |
|---|---|
| **Live URL** | https://quote-agent.tunderman.cc |
| **Strategy doc** | [`strategy.md`](./strategy.md) — Part 1 deliverable, 5 agents ranked |
| **Reviewer walkthrough** | [`REVIEWER.md`](./REVIEWER.md) — start here for the live demo |
| **Doc index** | [`docs/README.md`](./docs/README.md) |

---

## What it does

Marcus (Greenscape Pro founder) personally drafts every proposal — 6–9 days from site walk to sent. 35–40% of qualified leads are lost to faster competitors at the proposal stage. He is the sales-throughput bottleneck.

The agent removes him from the drafting loop:

1. Marcus pastes site walk notes — or drops an audio recording (transcribed via Deepgram Nova-3)
2. AI extracts structured scope, matches to a 58-item priced catalog
3. Drafts an 8-section proposal in Marcus's voice
4. Surfaces ambiguities Marcus needs to clarify
5. Marcus reviews + edits inline (line items, customer fields, every section)
6. Generates a branded PDF — re-runnable from any non-outcome state

**Target cycle:** <2 days from site walk to sent (vs 6–9 today).

---

## Hard requirements

| L&S brief requirement | Status |
|---|---|
| Deployed at a public URL | ✅ https://quote-agent.tunderman.cc — Hetzner VPS + Caddy + LE cert + systemd |
| GitHub repo with real commit history | ✅ 42+ commits over 7+ hours, no mega-commit |
| Persistent storage (real DB) | ✅ Supabase Postgres, `greenscape` schema, 6 tables, RLS, 5 migrations |
| Real LLM integration doing meaningful work | ✅ 5-skill chain — Sonnet 4.5 (gen) + Haiku 4.5 (classification), tool use, structured output |
| ≥1 external integration | ✅ Anthropic, Supabase Storage (signed URLs), Deepgram |
| Documented `.env.example` | ✅ At repo root |

**Plus the "strongly encouraged" criteria** (all met):
- Human-in-the-loop approval flow — Marcus reviews/edits everything, PDF generation is iteration not commitment
- Guardrails on AI output — `validate_output` skill (deterministic + LLM checks), one corrective retry, $0.50 per-quote cost cap, three-layer input gating against garbage submissions
- Cost considerations — Sonnet/Haiku split, audit log per call, **per-quote cost ~$0.09–0.26 measured** (cap $0.50)
- Simple frontend / admin view — 4 pages, branded design system, fully editable

---

## Stack

- **Frontend / API:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3
- **Database:** Supabase Postgres (`greenscape` schema, RLS, 6 tables) + Storage for PDFs
- **LLM:** Anthropic Claude — Sonnet 4.5 for generation, Haiku 4.5 for classification/validation
- **Audio:** Deepgram Nova-3 (`POST /api/transcribe` → notes textarea)
- **PDF:** `react-pdf` (HTML/CSS template → PDF buffer → Supabase Storage)
- **Hosting:** Hetzner VPS — Next.js standalone behind Caddy + systemd

Per-quote cost: ~$0.09–0.26 measured · cap $0.50 enforced before retry. See [`docs/03-architecture.md`](./docs/03-architecture.md) for the full cost model and [`docs/build-process/09-decision-log.md`](./docs/build-process/09-decision-log.md) D14 for the model split rationale.

---

## Run locally

```bash
git clone https://github.com/Dirk-Tunderman/greenscape-quote-agent
cd greenscape-quote-agent
npm install
cp .env.example .env.local   # populate (see below)
npm run dev                  # → http://localhost:3000
```

Required env vars (full list in `.env.example`):
- `ANTHROPIC_API_KEY` — for the 5-skill agent chain
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — server-side, bypasses RLS in API routes
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-side, RLS-deny by default
- `DEEPGRAM_API_KEY` — required only if you exercise the audio-upload path

To recreate the Supabase schema, apply the 5 SQL files under [`supabase/migrations/`](./supabase/migrations/) in order. PostgREST also needs `greenscape` added to the project's "Exposed schemas" (Data API → Settings).

---

## Documentation

- [`docs/README.md`](./docs/README.md) — **start here.** Indexes the reviewer-facing docs and the internal build trail.
- [`REVIEWER.md`](./REVIEWER.md) — live walkthrough for the reviewer: how to use the deployed app.
- [`strategy.md`](./strategy.md) — Part 1 deliverable.
- [`docs/11-current-state.md`](./docs/11-current-state.md) — what the application actually does today (source of truth).
- [`docs/06-assumptions.md`](./docs/06-assumptions.md) — every defensible assumption + Day 1 swap path.
- [`tests/`](./tests/) — 6-case e2e test suite. `SUMMARY.md` has the aggregate (6/6 PASS, 89.2/100).

For the full reasoning trail (D1–D48), see [`docs/build-process/09-decision-log.md`](./docs/build-process/09-decision-log.md).

---

## Submission

This repo + the `strategy.md` deliverable + a Loom walkthrough constitute the L&S take-home submission.
