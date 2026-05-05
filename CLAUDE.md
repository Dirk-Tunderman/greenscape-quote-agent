# Greenscape Quote Agent (L&S Take-Home)

AI quote drafting agent for a fictional Phoenix hardscape contractor — submitted as the L&S "AI Developer Role" 24h take-home. Removes the founder from proposal drafting (6-9 days → <2 days) by extracting scope from his notes, matching to a priced catalog, generating a branded PDF, and emailing the customer after his approval.

**Live:** https://quote-agent.tunderman.cc · **Repo:** private GitHub at `Dirk-Tunderman/greenscape-quote-agent`

---

## Position

- **Business unit:** Other — one-off take-home, not a Tunderman or SchilderGroei product
- **Macro-operation:** Skills demonstration / portfolio
- **Maturation stage:** Codified — functional MVP, live in production, 2 integration tests passed
- **Directory path:** `/Users/dirktunderman/Desktop/projects/test-project-LS`
- **Lifecycle:** Temporary deploy (~1 week). `scripts/teardown.sh` removes from Hetzner Server 1 cleanly when done.

## Inputs & Outputs

- **Inputs:** L&S brief + Greenscape Pro onboarding + discovery call → `assignment-docs/` (gitignored — client materials stay private)
- **Outputs:** Live URL · `strategy.md` (Part 1 deliverable) · this repo · Loom walkthrough (pending)

---

## On Session Start

Load the standard block from `~/Desktop/system/SESSION-START.md`. Then, before doing anything in this directory:

1. `git pull`
2. Read `STATUS.md` — live multi-chat coordination dashboard
3. Read `docs/11-current-state.md` — canonical "what works today" (overrides docs 00-10 if disagreements)
4. Read `LEARNING.md` — captured lessons, apply them
5. If picking up a specific role: read the matching prompt in `prompts/chat-{a,b,c}.md`

---

## Operating Context

### Tools in use here

- **Anthropic Claude SDK** — Sonnet 4.5 (generation skills) + Haiku 4.5 (classification/validation). 5-skill chain in `lib/skills/`
- **Supabase** — Postgres (`greenscape` schema, RLS, service-role from API) + Storage (PDFs). Shared instance with SchilderGroei + Lead System
- **Resend** — outbound customer email
- **Hetzner Server 1** (`157.90.124.14`) — mixed-use server. Next.js standalone behind Caddy + systemd
- **Cloudflare** — DNS for `quote-agent.tunderman.cc`

### Relevant skills

| Task | Skill |
|------|-------|
| Update this CLAUDE.md | `meta-claude-md` |
| Default for non-code deliverables (writeups, docs) | `meta-execute` |
| Deploy update to Hetzner | `dev-deploy` |
| Verify feature end-to-end | `dev-testing` |
| Iterative documentation pass | `dev-feature-docs` |
| Create or update a skill | `skill-developer` |
| Create Linear tickets (if needed) | `ops-linear-create` |

**Default workflow:** any non-code deliverable in this directory routes through `meta-execute` (Architect → Builder → Reviewer).

### Foundation references

N/A — this is a fictional-client take-home, not Tunderman content. The 9-section proposal template + voice spec is industry-anchored (not Tunderman-brand) and lives in `docs/06-assumptions.md` + `docs/10-industry-research.md`.

### Related projects

Standalone — no in-system dependencies. The Hetzner Server 1 conventions are inherited from `~/Desktop/projects/schildergroei/` (mixed-use server, `/opt/<service>/` for backends, Caddy site blocks).

---

## Directory-specific

### Key files

- `STATUS.md` — live multi-chat coordination dashboard (Chat A primary writer; B/C update own rows)
- `strategy.md` — L&S Part 1 deliverable (top 5 AI agents ranked with doc-anchored math)
- `docs/11-current-state.md` — canonical WHAT the app does today (source of truth)
- `docs/09-decision-log.md` — every key decision + reasoning (do NOT undo without explicit OK)
- `docs/10-industry-research.md` — industry-validated assumptions (D26-D30 came from this)
- `lib/orchestrator.ts` — agent chain entry point with retry-on-validate-fail
- `lib/skills/*.ts` — 5 LLM skills: extract_scope, match_pricing, flag_ambiguity, generate_proposal, validate_output
- `lib/pdf/template.tsx` — branded react-pdf template (8 sections in production)
- `app/api/` — 5 routes: `/agent/draft`, `/quotes`, `/quotes/[id]`, `/quotes/[id]/send`, `/line-items`
- `app/quotes/`, `app/admin/`, `components/` — frontend (Chat B's territory)
- `supabase/migrations/` — 3 SQL migrations, applied to live DB
- `prompts/chat-{a,b,c}.md` — copy-paste prompts for spawning sub-chats with full onboarding
- `scripts/{deploy,teardown}.sh` — operational

### Commands

```bash
npm run dev          # local dev → http://localhost:3000 (uses .env.local)
npm run build        # production build (Next.js standalone output)
npm run typecheck    # tsc --noEmit

./scripts/deploy.sh         # rsync standalone build to Hetzner + restart systemd service
./scripts/teardown.sh       # idempotent, confirmation-gated server-side cleanup
```

### Rules unique to this directory

- **Schema isolation:** every DB write goes through `lib/db/supabase.ts` against `greenscape.*` tables. Never touch `public`, SchilderGroei, or Lead System tables on the shared instance.
- **Anthropic key:** currently SchilderGroei's key in temp reuse (per credentials.md project-scoping rule). Swap or null out on teardown.
- **Multi-chat ownership** (commit boundaries — see `docs/11-current-state.md` "Coordination conventions"):
  - Chat A: `lib/{anthropic,audit,db,skills,orchestrator,pdf,email}.ts`, `app/api/`, `supabase/`, `data/historical-proposals.json`, `scripts/deploy.sh`, root configs
  - Chat B: `app/quotes/`, `app/admin/`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/`, `data/{mocks,store}.ts`, `lib/types.ts` (shared, B is primary)
  - Chat C: server-side at `/opt/`, `/etc/systemd/`, `/etc/caddy/`; `scripts/teardown.sh`
- **`assignment-docs/` is gitignored** — L&S source materials stay private.
- **Don't claim "deployed" without `verification-before-completion`** — verify with curl, not `systemctl status` alone.

### Current focus

Final code-review subagent + Loom recording (≤5 min) + submission email to L&S. After submission: teardown via `scripts/teardown.sh`, swap Anthropic key out of `.env`.

---

**Credentials:** `~/Desktop/system/credentials.md`
**Learnings:** `LEARNING.md` — read before starting work. Add new entries when you learn something worth keeping.

*Principles → `~/Desktop/system/BIBLE.md`. Procedures → `~/Desktop/system/OPERATIONS.md`. Persona → `~/Desktop/system/SOUL.md`. Universal session start → `~/Desktop/system/SESSION-START.md`.*
