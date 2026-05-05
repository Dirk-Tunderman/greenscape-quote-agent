# Greenscape Quote Agent

L&S take-home: AI-powered quote drafting agent for Greenscape Pro, a Phoenix-based hardscape & landscape design-build company.

## What this is

Marcus Tate (Greenscape Pro founder) personally drafts every proposal — 6-9 days from site walk to sent. 35-40% of qualified leads are lost to faster competitors at the proposal stage. He is the sales-throughput bottleneck of the business.

This agent removes Marcus from the drafting loop:
1. Marcus inputs site walk notes (text initially; voice in Phase 2 via Deepgram)
2. AI extracts structured scope, matches to a 200+ line item pricing catalog
3. Drafts a complete proposal in Greenscape's branded template
4. Surfaces ambiguities for Marcus to clarify
5. Marcus reviews, edits, and approves in admin UI
6. Sends to customer via email when approved

**Target cycle:** <2 days from site walk to sent (vs 6-9 days today).

## Status

✅ **Live on production** — https://quote-agent.tunderman.cc

Backend (5 skills + orchestrator + 5 API routes + branded PDF + Resend email) is complete and verified end-to-end with two production integration tests (Patel $15,955 patio, Chen $59,000 full backyard). Frontend (4 pages + design system) ships against the API contract in `lib/types.ts`. Deploy infra (Caddy + LE cert + systemd) is set up and serving.

For a full snapshot of what currently works (and doesn't), read [`docs/11-current-state.md`](./docs/11-current-state.md).

## Documentation

Grouped by concern. Read `STATUS.md` first for current state across the multi-chat build.

**Snapshot (read this first)**
- [`docs/11-current-state.md`](./docs/11-current-state.md) — what the application actually does today (the WHAT)

**Coordination**
- [`STATUS.md`](./STATUS.md) — live multi-chat coordination dashboard
- [`prompts/`](./prompts/) — copy-paste prompts for each chat (backend / frontend / deployment)

**Strategy / Deliverable**
- [`strategy.md`](./strategy.md) — top 5 AI agents ranked (L&S Part 1 deliverable)

**Product**
- [`docs/00-project-brief.md`](./docs/00-project-brief.md) — vision, scope, constraints, success criteria
- [`docs/01-jobs-to-be-done.md`](./docs/01-jobs-to-be-done.md) — Marcus, Jenna, Carlos, Customer + system jobs
- [`docs/02-features.md`](./docs/02-features.md) — feature list, MVP cut, user stories, edge cases

**Engineering (backend + database)**
- [`docs/03-architecture.md`](./docs/03-architecture.md) — system design, stack, data model, cost analysis
- [`docs/04-agent-skills.md`](./docs/04-agent-skills.md) — orchestrator + 5 agent skills full specs
- [`docs/06-assumptions.md`](./docs/06-assumptions.md) — assumption registry + replaceability map

**Design (frontend)**
- [`docs/08-design-system.md`](./docs/08-design-system.md) — brand, colors, typography, components, voice, PDF spec

**Operations / Build**
- [`docs/05-build-plan.md`](./docs/05-build-plan.md) — sequenced 18h build plan, phases 0-10
- [`docs/07-next-session-plan.md`](./docs/07-next-session-plan.md) — multi-chat orchestration plan
- [`docs/09-decision-log.md`](./docs/09-decision-log.md) — every key decision + reasoning (don't undo without approval)
- [`docs/12-deployment.md`](./docs/12-deployment.md) — server, DNS, TLS, systemd, Caddy, deploy + teardown reference

## Stack

- **Frontend / API:** Next.js 15 (App Router) + TypeScript
- **Database:** Supabase Postgres (`greenscape` schema)
- **LLM:** Anthropic Claude — Sonnet for generation, Haiku for classification/validation
- **Email:** Resend
- **PDF:** `react-pdf` (HTML/CSS template → PDF)
- **Hosting:** Hetzner VPS — Next.js standalone behind Caddy + systemd

## Run locally

```bash
git clone https://github.com/Dirk-Tunderman/greenscape-quote-agent
cd greenscape-quote-agent
npm install
cp .env.example .env.local   # populate ANTHROPIC + SUPABASE + RESEND keys
npm run dev                  # → http://localhost:3000
```

Required env vars:
- `ANTHROPIC_API_KEY` — for the agent skill chain (Sonnet 4.5 + Haiku 4.5)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`

See [`docs/11-current-state.md`](./docs/11-current-state.md) → "Configuration" for the full list and how the keys flow through the stack.

To recreate the Supabase schema in a fresh project, apply the 3 SQL files under [`supabase/migrations/`](./supabase/migrations/) in order. PostgREST needs `greenscape` added to the project's "Exposed schemas" (Data API → Settings) — the schema isolation prevents accidental coupling with other apps on a shared instance.

## Deployment

Deployed URL: **https://quote-agent.tunderman.cc** (Hetzner Server 1, Caddy + systemd, temporary ~1-week deploy). Full deployment reference: [`docs/12-deployment.md`](./docs/12-deployment.md). Teardown: [`scripts/teardown.sh`](./scripts/teardown.sh).

## Submission

This repo + the `strategy.md` deliverable + a Loom walkthrough (≤5 min) constitute the L&S take-home submission.
