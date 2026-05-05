# 01 — Jobs to be Done

JTBD framework: what does each user "hire" this product to do? Functional + emotional + social jobs, plus the system-level jobs the agent itself must perform.

All quotes below are from the source materials (`assignment-docs/`).

---

## Primary user — Marcus Tate (Founder / CEO)

### Functional jobs
- **Get a proposal in front of qualified leads in 1-2 days**, not 6-9 (eliminate the speed loss to faster competitors)
- **Take proposal drafting off my plate** so I can do site walks and run the company (his "fire myself from" task #1, onboarding line 104)
- **Produce accurate proposals** — right scope, right pricing, no missed items
- **Catch the >$30K threshold reliably** so Carlos gets the render brief on time
- **Keep system of record consistent** — eventually pushable to GHL ("everything has to be in GHL", Jenna line 131)

### Emotional jobs
- **"Let me trust this without babysitting"** — direct quote (line 129): *"I do not want a bunch of fancy tech I have to babysit. I want stuff that runs and I just look at it and approve things."*
- **"Give me my evenings back"** — direct quote (line 133): *"I am tired. I want my evenings back."*
- **Feel in control** even though I'm not doing the work (review/approve flow is essential)
- **Reduce anxiety** about leads slipping while I'm too slow ("we lose. customers apologize", line 19)
- **Don't make me look bad** to clients with a poor-quality proposal (premium positioning is the brand)

### Social jobs
- **Maintain the "premium craftsman" brand** even as the company scales (positioning: "photographs well", quality over price)
- **Make Greenscape look like a modern operation** that uses tech well — the kind of company an HOA would approve and a high-end client would trust
- **Stay the relationship owner** at the front (site walks) while the back-office becomes invisible

### "Fire" criteria — what would cause Marcus to abandon this?
1. Outputs garbage that he has to rewrite from scratch (worse than doing it himself)
2. Hallucinates line items that don't exist in the catalog
3. Pricing is wrong in a way that costs him a deal or eats his margin
4. Takes too much of his time to operate (defeats the purpose)
5. Looks unprofessional in front of clients
6. Creates a dependency on tooling he doesn't understand and can't fix

---

## Secondary user — Jenna Moss (Office Manager)

### Functional jobs
- **Stop chasing Marcus** for quote status when customers call asking
- **Stop fielding inbound anxiety calls** from leads who are waiting on quotes
- **See quote status at a glance** without needing to ping Marcus on Slack
- **Keep everything in / pushable to GHL** (her words, line 131)

### Emotional jobs
- **Stop being the human buffer** between an over-extended Marcus and impatient customers

---

## Secondary user — Carlos Reyes (Lead Designer)

### Functional jobs
- **Get a clear render brief on time** (per Marcus, line 15: *"Carlos is fast when I get him the brief"* — implying delays are on Marcus's side)
- **Know which projects need a render** (>$30K threshold) without chasing Marcus

---

## Indirect user — The Customer

### Functional jobs
- **Get a proposal back in days, not weeks**, so I can decide and move forward
- **See that the contractor understood my specific yard** — not a template
- **Have a proposal that looks professional** and matches the premium pitch I was given on the site walk
- **Be able to compare apples to apples** (clear scope, clear line items, clear total)

### Emotional jobs
- **Feel that the craftsman remembered me** between the site walk and the proposal arriving
- **Feel like the price is fair** (clear breakdown, not opaque)

---

## System jobs — what the agent itself must do

These are jobs the AI agent (not a human) is hired to perform. Each maps to a specific skill in `04-agent-skills.md`.

| # | System job | Skill |
|---|---|---|
| 1 | Extract structured scope from Marcus's messy notes | `extract_scope` |
| 2 | Match scope items to a finite catalog of priced line items, with quantities | `match_pricing` |
| 3 | Flag ambiguity before output — surface what Marcus needs to clarify | `flag_ambiguity` |
| 4 | Generate proposal copy in Greenscape's voice and template | `generate_proposal` |
| 5 | Validate output before commit — every line item exists, totals add up, no hallucinations | `validate_output` |
| 6 | Trigger render workflow for projects >$30K (Phase 1 = visual flag; Phase 2 = full workflow) | logic, not LLM |
| 7 | Persist audit trail of decisions for ongoing refinement | `audit_log` table |
| 8 | Stay within cost budget — cheap models for classification, expensive only for generation | orchestrator policy |

---

## Non-jobs (explicit)

The agent is **NOT** hired to:
- Replace Marcus on the site walk (his "where I close deals" — non-negotiable, line 11)
- Make pricing decisions outside the catalog (custom items get flagged for Marcus, not invented)
- Send anything without Marcus's review (human-in-loop is core, not optional)
- Manage customer relationships (still Marcus's job)
- Do project management (Jobber's job)
- Replace the GHL CRM (everything pushes to GHL eventually)

---

## Implications for design

These jobs translate directly into product decisions:

| Job | Design decision |
|---|---|
| "Trust without babysitting" | Validation skill that gates output; clear surfacing of agent confidence |
| "Give me evenings back" | Bulk operations possible; mobile-friendly review UI (Phase 2) |
| "Feel in control" | Edit ANY field before approve; never auto-send |
| "Don't make me look bad" | Branded PDF template; voice quality validation |
| "Maintain premium brand" | Output quality bar > speed (worth a 2nd LLM pass on generation) |
| "Don't hallucinate line items" | Tool-use match against catalog; validator rejects unknown items |
| "Catch >$30K" | Visual flag in admin UI; deterministic threshold check |
| "Keep audit trail" | Every skill call logged; full reproducibility |
