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

🚧 **In development** — strategy and architecture complete; implementation in progress.

## Documentation

Grouped by concern. Read `STATUS.md` first for current state across the multi-chat build.

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

## Stack

- **Frontend / API:** Next.js 15 (App Router) + TypeScript
- **Database:** Supabase Postgres (`greenscape` schema)
- **LLM:** Anthropic Claude — Sonnet for generation, Haiku for classification/validation
- **Email:** Resend
- **PDF:** `react-pdf` (HTML/CSS template → PDF)
- **Hosting:** Hetzner VPS — Next.js standalone behind Caddy + systemd

## Run locally

```bash
# (instructions populated once Phase 0 of build is complete)
npm install
cp .env.example .env.local   # populate with your keys
npm run dev
```

## Deployment

Deployed URL: _TBD — populated once build is live_

## Submission

This repo + the `strategy.md` deliverable + a Loom walkthrough (≤5 min) constitute the L&S take-home submission.
