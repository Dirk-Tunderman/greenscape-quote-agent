# 00 — Project Brief

## Client

**Greenscape Pro** — high-end residential hardscape & landscape design-build, Phoenix AZ. Founded 2018. ~$4.2M revenue, 150 projects/yr, $28K avg project. 4 crews + office team of 4 + designer + Marcus.

**Primary stakeholder:** Marcus Tate, Founder / CEO.
**Secondary stakeholders:** Jenna Moss (Office Manager), Carlos Reyes (Lead Designer), Brittany Walsh (Sales Coordinator).

## Problem

Marcus personally drafts every proposal — 6-9 days from site walk to sent. **35-40% of qualified leads are lost to faster competitors at the proposal stage** (onboarding line 90). Marcus is the sales-throughput bottleneck of the entire business: he runs every site walk, drafts every quote, and approves 5-10 daily Slack pings from Jenna.

Direct quote (transcript line 15): *"I am the bottleneck. I have to touch every proposal. ... I have to interpret the site walk notes and turn them into a scope. Nobody else knows how to do that."*

Knock-on effects:
- Lost revenue to faster competitors (~$1M+/yr at conservative recovery)
- Marcus burnout — *"I am tired. I want my evenings back"* (line 133)
- Jenna fields anxious customer status calls daily
- Carlos doesn't always get the >$30K render brief on time

## Solution

An **AI quote drafting agent** that:
1. Takes Marcus's site walk notes (text initially; voice in Phase 2)
2. Extracts structured scope and matches to the existing 200+ line item pricing catalog
3. Drafts a complete proposal in Greenscape's branded template
4. Surfaces ambiguities for Marcus to clarify
5. Lets Marcus review, edit, and approve in an admin UI
6. Sends to the customer via email when approved
7. Persists every quote + outcome for ongoing improvement

**Target cycle: <2 days from site walk to sent (vs 6-9 days today).**

## Scope — 24h MVP (Phase 1 of phased rollout)

### In
- Text input for site walk notes
- AI scope extraction
- Line item matching against seeded pricing catalog (~80 items, 8 categories)
- Ambiguity flagging
- Proposal draft generation in branded template
- Admin review UI with inline edits
- Approval flow → PDF generation → signed Supabase Storage URL for download (D32 — Marcus owns customer relationship; system doesn't auto-send)
- Persistent storage on Supabase (quotes, line items, artifacts, audit log)
- Cost tracking per quote
- Public deployed URL (Hetzner — temporary host on existing infra)
- GitHub repo with real commit history
- README + `.env.example`

### Out — deferred to Phase 2+
- Voice memo / audio input + Deepgram transcription (consistent with existing Tunderman stack)
- GHL API integration (we send via email; documented as Phase 2)
- Stripe deposit invoice generation post-approval
- DocuSign signature flow (already exists in GHL)
- Carlos render trigger workflow for >$30K (we flag in UI; trigger remains manual in v1)
- Fine-tuning on Marcus's actual historical proposals (we use representative synthetic examples)
- Photo / image input from CompanyCam
- Multi-tenant / multi-user auth

## Success criteria

### Hard requirements (per L&S brief)
- [x] Public deployed URL
- [x] GitHub repo with real commit history (no mega-commit)
- [x] Persistent storage (Supabase)
- [x] Real LLM API doing meaningful work
- [x] At least one external integration (Anthropic API + Supabase Storage signed URLs + Deepgram audio)
- [x] Documented `.env.example`

### Strongly encouraged (bonus)
- [x] Human-in-loop approval flow
- [x] Error handling / guardrails on AI output (validation skill)
- [x] Cost considerations (Haiku for cheap classification, Sonnet for generation; per-quote cost surfaced)
- [x] Functional admin frontend

### Demo criteria
- Can generate a complete priced proposal from raw notes in <60 seconds of agent runtime
- Marcus can approve and send a real email to a real inbox
- All artifacts visible in admin (scope, line items, draft, validation)
- Quote history shows status changes

## Constraints

- 24-hour delivery window
- Solo developer
- No clarifying questions to the client allowed (per brief line 134)
- Pricing spreadsheet not provided → synthetic but representative data, documented as assumption
- Marcus's actual historical proposals not provided → 3 synthetic examples used as few-shot

## Documented assumptions

**Canonical source: `docs/06-assumptions.md`** — every assumption with: what docs say, what we assumed, why defensible, Day 1 swap path for real engagement.

Summary of major assumption areas (full detail in 06-assumptions.md):

1. **Pricing catalog structure** — 8 categories from onboarding line 18, ~80 synthetic line items, prices back-calculated from $28K avg with 38% margin
2. **Pricing logic** — all-in pricing (labor + materials bundled), no separate tax, no contingency line, custom items flagged for Marcus
3. **Proposal template** — standard 7-section structure: cover / greeting / overview / scope+pricing / timeline / terms / signature
4. **Voice** — premium craftsman, warm-not-corporate, transparent pricing, no hard-sell — derived from positioning
5. **Site walk notes format** — freeform text input; agent extracts whatever's present and surfaces ambiguity
6. **Customer intake** — minimal fields: name, email, phone, address, project type, HOA y/n, budget tier, notes
7. **Pre-qual criteria** (not in MVP) — good/mid/bad thresholds derived from Marcus's stated examples (transcript line 67)
8. **Phoenix-specific factors** — caliche-resistant base prep, drought-tolerant materials, ~$325 permit costs, HOA prevalence

**The architecture is built so that every assumption maps to a swappable component.** Day 1 of a real engagement = ingest Marcus's actual data + swap synthetic fixtures. No architecture change. See `06-assumptions.md` "Replaceability map" for the full swap list.

## Non-goals (explicit)

This product is NOT:
- A CRM (use GHL)
- A project management tool (use Jobber)
- A customer portal
- A replacement for Marcus's site walk presence

This product is also NOT (per L&S strategy doc):
- A marketing/content agent (cut from top 5 entirely)
- A reactivation, pre-qualification, post-sign coordination, or crew upsell agent (those are #2-#5 in strategy; not built in this take-home, per brief instruction to build only #1)
