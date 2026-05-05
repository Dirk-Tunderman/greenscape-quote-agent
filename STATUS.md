# STATUS

**Single coordination dashboard for the multi-chat build.** Every chat reads this at start. Chat A (backend orchestrator) is primary writer. Chat B / Chat C update only their own sections.

---

## Last updated

`2026-05-05` · planning chat (handoff)
Next update: by Chat A at end of Phase 0

---

## Current overall phase

**Phase 0 — Setup (pending)** · Repo initialized, docs complete, build not yet started.

Phase progression (from `docs/05-build-plan.md`):
- [x] Pre-build planning + strategy + setup docs
- [ ] Phase 0 — Setup (repo, Next.js, Supabase project link, Vercel→Hetzner deploy infra)
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

### Chat A (Backend Orchestrator) — _not yet started_
- **Owns:** Next.js scaffold, Supabase schema + seed, agent skills, API routes, PDF, email, integration, deploy coordination, final review
- **Currently doing:** awaiting kickoff
- **Last commit:** N/A
- **Blockers:** none
- **Waiting on:** none

### Chat B (Frontend Builder) — _not yet started_
- **Owns:** all Next.js pages + components per `docs/08-design-system.md`
- **Currently doing:** awaiting kickoff (can run parallel to Chat A; build with mock data first if API not ready)
- **Last commit:** N/A
- **Blockers:** none
- **Waiting on:** Chat A's data model is in `docs/03-architecture.md` — already documented

### Chat C (Hetzner Deployment) — _not yet started_
- **Owns:** server-side prep on `157.90.124.14` (Caddy site block, systemd unit, port assignment)
- **Currently doing:** awaiting kickoff (can run parallel to Chat A and B)
- **Last commit:** N/A (Chat C may not commit if all work is server-side)
- **Blockers:** none
- **Waiting on:** none

---

## Key URLs

| Resource | URL |
|---|---|
| GitHub repo | https://github.com/Dirk-Tunderman/greenscape-quote-agent (private) |
| Supabase project | https://oixhegfptjdcfbwngktq.supabase.co (shared instance, `greenscape` schema) |
| Hetzner Server 1 | `157.90.124.14` (SSH: `ssh -i ~/.ssh/id_ed25519 root@157.90.124.14`) |
| Deploy URL | _TBD — populated by Chat C once port assigned_ |

---

## Open decisions to confirm at kickoff

1. **Anthropic API key:** new dedicated key (preferred per credentials.md project-scoping rule) OR temporarily reuse SchilderGroei's (~$1-3 total cost). Confirm with user.
2. **Public URL format:** IP:port (`http://157.90.124.14:PORT`) is the assumed default for the temporary 1-week deploy. If user wants subdomain (`quote-agent.tunderman.io`), DNS work needed (~30 min).
3. **Chat orchestration:** confirm A/B/C are running in parallel.

---

## Recent completions (most recent first)

| Date | Chat | Item |
|---|---|---|
| 2026-05-05 | planning | Initial commit pushed: strategy.md + docs/00-09 + STATUS.md + prompts/ |
| 2026-05-05 | planning | Decision log created (`docs/09-decision-log.md`) |
| 2026-05-05 | planning | Design system created (`docs/08-design-system.md`) |
| 2026-05-05 | planning | Repo set to private on GitHub |
| 2026-05-05 | planning | Strategy doc + 6 project setup docs + assumptions registry complete |
| 2026-05-05 | planning | GitHub repo created: greenscape-quote-agent |

---

## Active blockers

_(none — kickoff pending)_

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
