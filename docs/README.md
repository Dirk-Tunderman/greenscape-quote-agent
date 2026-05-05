# Documentation

Two layers:

**Reviewer-facing (this directory)** — everything you need to evaluate the submission. Read in roughly the order below.

**Internal trail (`build-process/`)** — how it was built. Decision log with reasoning behind every choice (D1–D48), architecture iterations, multi-chat coordination prompts, deployment ops, design system spec, industry research notes. Skim if you want to see *why* a specific thing looks the way it does; you don't need any of it to evaluate what was shipped.

---

## Reviewer-facing — read in this order

1. [`../strategy.md`](../strategy.md) — **Part 1 deliverable.** 5 AI agents ranked with doc-anchored math, pushback on founder's stated priorities, and the agent considered-but-cut.
2. [`00-project-brief.md`](./00-project-brief.md) — our scope decisions for the 24h take-home (different from L&S's brief). Vision, success criteria, what was explicitly cut.
3. [`01-jobs-to-be-done.md`](./01-jobs-to-be-done.md) — Marcus / Jenna / Carlos / Customer + system jobs.
4. [`03-architecture.md`](./03-architecture.md) — system design, stack, data model, cost analysis.
5. [`04-agent-skills.md`](./04-agent-skills.md) — orchestrator + the 5 agent skills, full specs.
6. [`06-assumptions.md`](./06-assumptions.md) — **THE most important reviewer doc.** Every assumption made (synthetic catalog, template, voice, etc.) with its docs anchor, why it's defensible, and the Day 1 swap path for real engagement.
7. [`11-current-state.md`](./11-current-state.md) — **what the application actually does today.** End-to-end flow, live data model, API surface, configuration, known limitations. Source of truth — overrides anything else if they disagree.
8. [`15-future-extensions.md`](./15-future-extensions.md) — what's deliberately deferred from the 24h MVP, grouped by horizon (Phase 2 / Phase 3 / Day 1 of real engagement). Answers "what would you build next?"

---

## Internal trail — `build-process/`

| File | Purpose |
|---|---|
| [`build-process/02-features.md`](./build-process/02-features.md) | Feature list + MVP cut + user stories |
| [`build-process/05-build-plan.md`](./build-process/05-build-plan.md) | Sequenced 18h build plan (Phase 0–10) |
| [`build-process/07-next-session-plan.md`](./build-process/07-next-session-plan.md) | Multi-chat orchestration plan |
| [`build-process/08-design-system.md`](./build-process/08-design-system.md) | Brand, colors, typography, components, voice, PDF spec |
| [`build-process/09-decision-log.md`](./build-process/09-decision-log.md) | **D1–D48 — every key decision + reasoning + considered alternatives.** Skim if you want the WHY behind a specific shipped behavior. |
| [`build-process/10-industry-research.md`](./build-process/10-industry-research.md) | AZ residential design-build research — drove D26 (payment schedule), D27 (8-section template), D28 (allowance items), D29 (TPT exemption), D30 (voice spec) |
| [`build-process/12-deployment.md`](./build-process/12-deployment.md) | Hetzner server + Caddy + LE cert + systemd reference |
| [`build-process/13-frontend-internals.md`](./build-process/13-frontend-internals.md) | Frontend module map + ownership boundaries |
| [`build-process/14-test-cases.md`](./build-process/14-test-cases.md) | Copy-paste test scenarios for the new-quote flow |
| [`build-process/STATUS.md`](./build-process/STATUS.md) | Multi-chat coordination dashboard (live during the build) |
| [`build-process/prompts/`](./build-process/prompts/) | The actual onboarding prompts used to spawn each parallel build chat |

---

## Outside this directory

- [`../tests/`](../tests/) — 6-case end-to-end test suite. `SUMMARY.md` has the aggregate (6/6 PASS, 89.2/100). `EVALUATION-RUBRIC.md` is the scoring rubric. `cases/` + `results/` have raw inputs/outputs.
- [`../REVIEWER.md`](../REVIEWER.md) — the live walkthrough: how to use the deployed app, what to try, what to look at first.
- [`../README.md`](../README.md) — repo entry point, hard-requirements check, stack, run-locally instructions.
