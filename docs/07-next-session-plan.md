# 07 — Next-Session Build Plan

This doc is the handoff to the next chat session(s). Strategy + setup is complete; this defines how we orchestrate the actual build using **multiple chats + sub-agents**.

---

## Where we are

✅ Strategy doc complete (`strategy.md`)
✅ Project setup docs complete (`docs/00-06`)
✅ Assumptions registered (`docs/06-assumptions.md`)
✅ GitHub repo created and initial commit pushed
✅ Hetzner Server 1 confirmed for temporary deploy (~1 week)
✅ Supabase schema designed (in `docs/03-architecture.md` — not yet applied)

🔲 Build & deploy P0 quote agent
🔲 Loom walkthrough (≤5 min)
🔲 Submit to L&S

---

## Orchestration philosophy (from skills read)

Two relevant patterns from the superpowers skills:

**`superpowers:dispatching-parallel-agents`** — One agent per *independent problem domain*. Truly independent = no shared state, no sequential dependencies. When tasks share files or sequence, do NOT parallelize.

**`superpowers:subagent-driven-development`** — Within a single chat: dispatch sub-agents *sequentially* (parallel implementer subagents would conflict on files). Pattern is implementer → spec reviewer → code quality reviewer → mark complete. Two-stage review per task.

**Key implication for our build:**
- **Separate chats** = parallel execution streams (truly independent work, e.g., infra setup vs. agent code)
- **Sub-agents within a chat** = sequential focused tasks (each gets fresh context, doesn't pollute the chat's main thread)

---

## Multi-chat plan

Three chat sessions running, each with its own focus:

### Chat A — Orchestrator + Backend (the main session)

**Owns:** project structure, Next.js scaffold, Supabase schema, agent skill chain, API routes, integration, polish, deployment, Loom.

**Spawns sub-agents for:**
- Apply Supabase migration (one-shot)
- Generate synthetic pricing catalog (~80 items as seed JSON/SQL)
- PDF template + generation
- Deepgram client wrapper (Phase 2 — likely skip in 24h MVP)
- Final code review

### Chat B — Frontend (separate chat, runs in parallel)

**Owns:** all Next.js pages and components.

Pages:
- `/quotes` — list view with status filters
- `/quotes/new` — input form (customer info + scope notes)
- `/quotes/[id]` — review/edit/approve UI (the most complex page — scope, line items, draft markdown, ambiguities, approve button)
- `/admin/line-items` — read-only catalog view

Components: data tables, form fields, inline-edit cells, approve button with confirmation, audit log modal.

**Coordinates with Chat A via:** the data model in `docs/03-architecture.md` and the agent output schemas in `docs/04-agent-skills.md`. No conflict because Chat A handles API routes and Chat B handles pages — they meet at the API contract.

### Chat C — Hetzner Deployment Setup (separate chat, runs in parallel — short)

**Owns:** server-side prep on `157.90.124.14` (existing SchilderGroei prod server, mixed-use).

Tasks:
- Provision `/opt/greenscape-quote-agent` directory
- Install Node 20+ if not present
- Caddy reverse proxy config (new site block, free port)
- systemd unit file (`greenscape-quote-agent.service`)
- Firewall / port open
- Test that a hello-world Node app runs and is reachable

**Coordinates with Chat A via:** deploy script that Chat A writes once both Chat A's build and Chat C's infra are ready.

---

## Sub-agent task list (for Chat A to dispatch)

Per `superpowers:subagent-driven-development`, each gets implementer + spec reviewer + code quality reviewer.

| # | Task | Trigger | Independent of |
|---|---|---|---|
| 1 | Apply Supabase migration (greenscape schema, all 6 tables, RLS, indexes, triggers) | Right after Chat A scaffolds Next.js | All other tasks |
| 2 | Generate synthetic pricing catalog seed (~80 items per `docs/06-assumptions.md`) | After #1 | Agent skill code |
| 3 | Build `lib/skills/extract_scope.ts` with zod schema validation | After #1 | Other skills (testable in isolation) |
| 4 | Build `lib/skills/match_pricing.ts` with tool use against catalog | After #2 (needs seeded catalog) | Other skills |
| 5 | Build `lib/skills/flag_ambiguity.ts` (Haiku) | After #3, #4 | Other skills |
| 6 | Build `lib/skills/generate_proposal.ts` with style guide | After #4 | `validate_output` |
| 7 | Build `lib/skills/validate_output.ts` (deterministic + LLM checks) | After #6 | None |
| 8 | Build orchestrator (`lib/orchestrator.ts`) chaining all 5 skills with retry logic | After #3-7 | None |
| 9 | Build PDF generation (`react-pdf` template, branded HTML/CSS) | After #6 | Other tasks |
| 10 | Build Resend email send + `/api/quotes/[id]/send` endpoint | After #9 | Other tasks |
| 11 | Cost tracking + audit log writer | Parallel with #3-7 (utility) | None |
| 12 | Final code review across full implementation | After everything | N/A |

---

## Order of operations (next session, in sequence)

1. **Chat A**: Phase 0 setup — `git clone`, `npx create-next-app`, install deps, `.env.example`, push to repo
2. **Chat A**: Dispatch sub-agent #1 (Supabase migration applied)
3. **Chat A**: Dispatch sub-agent #2 (seed catalog) — IN PARALLEL: spin up Chat C (Hetzner setup) and Chat B (frontend skeleton)
4. **Chat A**: Dispatch sub-agents #3, #4, #5, #6, #7 sequentially (each with two-stage review)
5. **Chat A**: Dispatch sub-agent #8 (orchestrator) and #11 (audit logger)
6. **Chat A**: Dispatch sub-agent #9 (PDF) and #10 (email send)
7. **Chat A** + **Chat B** sync: API contract finalized, Chat B wires forms to API
8. **Chat A** + **Chat C** sync: deploy script runs, app is live on Hetzner
9. **Chat A**: Final integration test, edge case sweep, demo run-through
10. **Chat A**: Sub-agent #12 (final code review)
11. **Main work**: Loom recording + submission

---

## Skills to reference (for next session)

Read order at the start of next chat:

1. **`superpowers:using-git-worktrees`** — REQUIRED before subagent-driven-development. Set up isolated workspace.
2. **`superpowers:subagent-driven-development`** — already read in this session; re-read at start of build session for full pattern.
3. **`superpowers:test-driven-development`** — sub-agents should follow TDD per the skill.
4. **`superpowers:verification-before-completion`** — never claim done without proof.
5. **`superpowers:requesting-code-review`** — for the final review pass.
6. **`superpowers:dispatching-parallel-agents`** — already read in this session.
7. **`superpowers:executing-plans`** — alternative pattern if next session prefers handoffs over in-session sub-agents.

---

## Specific things the user authorized in this session

- **Hetzner Server 1** (`157.90.124.14`) for temporary deploy (~1 week, will be removed after)
- **Supabase shared instance** — new schema `greenscape`, no impact on SchilderGroei or Lead System tables
- **Public GitHub repo** at https://github.com/Dirk-Tunderman/greenscape-quote-agent
- **Direct PDF path** (markdown editor → PDF) — not Google Drive (deferred to Phase 2)
- **Deepgram for audio** (Phase 2; not built in 24h MVP) — matches existing Tunderman infra

## Specific things still to confirm at start of next session

- **Anthropic API key:** new dedicated key (preferred — costs trackable) OR temporarily reuse SchilderGroei's key (~$1-3 total). User leaning permission-by-default; confirm.
- **Public URL format:** IP:port (`http://157.90.124.14:PORT`) is the assumed default. If user wants subdomain (`quote-agent.tunderman.io`), DNS work needed — adds ~30 min.

---

## Synthetic dummy data — sub-agent task for next session

Per user: *"we need to create the dummy data of course. We can do that as well in Supabase. With a separate agent. We don't need to do that now, but it's for the next one."*

This is sub-agent #2 above. The agent's brief:

> **Task:** Generate seed data for `greenscape.line_items` table per the structure and example items in `docs/06-assumptions.md` "Synthetic catalog skeleton". Target ~80 items spread across 8 categories. Each item: realistic Phoenix-market pricing, appropriate unit type, descriptive name, brief description for LLM matching context. Output as a SQL `INSERT` migration file in `supabase/migrations/`. Also seed 5 sample customers and 3 representative historical proposals (as JSON in `data/historical-proposals.json` for few-shot prompting). Verify totals — sample $28K project should be reachable from realistic line item combos.

---

## What to NOT do in next session

- Do not push code to repo until each phase is committable (no broken-state pushes)
- Do not skip the spec compliance review per sub-agent — that's the guardrail against scope drift
- Do not parallelize implementer subagents on the same files (per skill — they will conflict)
- Do not deploy partially-working code to Hetzner — local end-to-end test first
- Do not over-build for 24h — voice memo, GHL integration, DocuSign, Stripe deposit are explicitly Phase 2
- Do not narrate code line-by-line in the Loom — focus on decisions and end-to-end demo (brief explicit penalty)

---

## Definition of "done" for the build

Per `docs/05-build-plan.md` "Definition of done — MVP":
- Public URL live on Hetzner and reachable
- Can create new quote from notes (happy path)
- Agent generates draft with all components (scope, line items, ambiguities, proposal markdown, total)
- Marcus can edit any field
- Marcus can approve a quote
- PDF generates with branded template
- Email sent to customer with PDF
- Quote appears in history with correct status
- All skill calls logged in `audit_log` with cost metadata
- Cost per quote visible in admin
- README + `.env.example` complete
- GitHub commit history is real (not one mega-commit)
