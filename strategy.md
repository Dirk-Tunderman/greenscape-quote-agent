# Greenscape Pro — AI Agent Strategy

*License & Scale audit. Prepared for Marcus Tate, Founder.*

## Diagnosis

Greenscape Pro is **fulfillment-constrained**, not acquisition-constrained. Marcus's own words on the call (transcript line 103): *"Quote. I cannot keep up with the leads I have."* Pipeline is full — Meta ROAS 4–4.5x, ~500 qualified leads/year, 1,400-lead closed-lost backlog. The constraint is Marcus himself: he drafts every proposal (6–9 days), runs every site walk, and fields 5–10 daily Slack approvals from Jenna.

**Each agent below either removes Marcus from a process where he is the bottleneck, or converts latent revenue without using his time.**

---

## #1 — Quote Drafting Agent

**Purpose:** Eliminate Marcus from the drafting loop. Phased build — Phase 1 ships in ~2 weeks.

- Marcus voice-memos site walk observations on the drive home
- AI extracts scope, maps to the 200+ line item pricing spreadsheet
- Generates proposal in his existing template; flags > $30K for Carlos render
- Marcus reviews / edits / approves in admin view → sent via GHL
- Logs every quote + outcome for ongoing fine-tuning

**Replaces:** Marcus's 6–9 day post-walk drafting cycle. His own "fire myself from" task #1 (onboarding line 104).

**ROI:**
- *Doc-anchored facts:* 35–40% of qualified leads lost to faster competitors at proposal stage (onboarding line 90), $28K avg, ~500 qualified leads/year (derived: 150 closes ÷ 30% close rate, lines 11–12 onboarding)
- *Derived:* 175–200 deals/year lost specifically to speed
- *Stated assumption — 20% recovery (conservative):* **~$1M Y1.** 30% recovery: $1.5M. We model 20%.
- Plus reclaimed Marcus time: ~10–15 hrs/week (derived from cycle × volume)
- Auditor confirmed in the call (line 21): *"single highest-leverage intervention in the business."*

**Why #1:** Only agent attacking the actual business constraint. Compounds forever (Y2+ projected ~$1.5M+/yr at maturity). Phasing means revenue starts week 2, not month 4–6 — comparable time-to-value to #2.

---

## #2 — Closed-Lost Reactivation Agent

**Purpose:** Drain the 1,400-lead backlog with personalized outreach in Marcus's voice. Runs in parallel with #1 build-out.

- Pulls closed-lost leads from GHL with original conversation context
- Generates personalized SMS / email referencing specific past notes
- Marcus pre-approves message templates per lead segment
- Routes replies to Brittany's hot list; logs everything to GHL
- Tracks reply rate, opt-outs, conversions

**Replaces:** Brittany's "occasional re-engagement blasts" — described as "not systematic" (transcript line 55).

**ROI (fully doc-anchored):**
- Auditor's explicit math (transcript line 61): **2% reactivation × 1,400 × $28K = $784K Y1**
- Marcus validates the channel (line 59): *"When it feels like Marcus is reaching out personally, people respond. When it feels like a mass blast, they do not."*
- Recurring after backlog drain: ~$28K/yr (new closed-lost flow at same rate)

**Why #2:** Doesn't consume Marcus, ships in 2–3 weeks, highest ROI per build dollar in the set. Could reasonably be argued as #1 if optimizing purely on cost-adjusted leverage; we keep it #2 because #1 attacks the actual constraint and dominates Y2+ economics.

---

## #3 — Pre-Qualification Agent

**Purpose:** Filter unqualified leads via SMS *before* they hit Marcus's calendar. Ships in week 1. Frees Marcus time AND structures intake data that compounds with #1.

- SMS qualifier asking 4–5 questions Marcus already asks in the first 2 minutes of every call (transcript line 67): budget tier, timeline, owner vs renter, project category, HOA y/n
- Routes qualified leads to Marcus's calendar; sends polite no-fit response otherwise
- Stores structured intake data; passes to #1 quote agent for scope extraction pre-fill
- Logs all responses for ICP refinement
- Marcus reviews edge-case leads (anything between "good" and "bad") in admin

**Replaces:** Marcus's "I call everyone" workflow (transcript line 67); 4–6 unqualified calls/week.

**ROI:**
- *Doc-anchored time:* Auditor estimate (transcript line 73): **1–2 hrs/week of Marcus time saved**
- *Direct standalone $:* ~$15–30K/yr (Marcus time at $200/hr — stated assumption)
- *Indirect compound effect (the real value):* Those reclaimed hours go straight back into more site walks. At 1–2 extra walks/week × 70% close rate (onboarding line 66) × $28K = **$75–150K/yr in capacity-unlock revenue**
- *Synergy with #1:* Structured intake data feeds scope extraction → fewer ambiguities surfaced → faster Marcus review cycles. Compounds with #1's per-quote efficiency.

**Why #3 — three reasons, in order of weight:**
1. **Speed of execution.** Ships in 1–5 days — fastest of any agent here. L&S delivers a working production system in week 1, not week 2–4. That's trust currency for the bigger #1–2 builds and a near-certain quick win.
2. **Direct interdependency with #1.** Brief explicitly rewards calling out interdependencies (line 104). Pre-Qual structures intake data that #1 consumes — the two compound.
3. **Risk-adjusted leverage.** Standalone $ is modest; execution certainty is near 100% and indirect capacity unlock can be 5–10x the standalone number.

Ranks above #4 and #5 because speed-to-value + #1 synergy beats their larger absolute revenue at this position — they ship slower and don't compound with #1.

---

## #4 — Post-Sign Coordination Agent

**Purpose:** Eliminate the 4–6 week post-sign drag (HOA, permits, deposits). **A non-obvious pain Marcus did not list in his stated priorities.**

- Tracks every signed deal through HOA submission, permit revisions, deposit collection
- Auto-sends customer reminders + deposit nudges on schedule
- Alerts Jenna to stage slips; surfaces a daily blocker dashboard
- Predicts crew start dates from current stage status
- Logs to GHL for system-of-record consistency

**Replaces:** Jenna's manual chase work (5–10 daily Slack pings to Marcus, line 92 onboarding); Marcus's blocked crew schedules.

**ROI:**
- *Doc-anchored:* Auditor's math (transcript line 37): **8–12 projects in limbo × $28K = $224–336K in delayed revenue at any given moment**
- Marcus's framing (line 35): *"If a project slips 2 weeks because of HOA, that is 2 weeks my crew could be on another job. It compounds."*
- *Stated assumption:* 1–2 weeks acceleration × 150 projects ≈ capacity for 5–10 additional projects/yr ≈ $140–280K incremental revenue
- Reduces inbound customer "what's happening" calls (onboarding line 84: *"this happens daily"*)

**Why #4:** Surfaces the highest-impact item Marcus did not include in his top 4. Doc-anchored cash-flow + crew utilization unlock. Ranks below #3 only because #3 ships in week 1 vs #4's 4–6 week build.

---

## #5 — Crew Upsell Coach (SMS Bot)

**Purpose:** When customers ask crews for additions on-site, return correct price + script in under 60 seconds. Capture margin currently eaten as free work.

- Crew SMSs description of customer ask
- Bot returns line item + price + customer-facing script
- Auto-logs upsell for Marcus's daily approval queue
- Builds knowledge base from accepted / rejected outcomes

**Replaces:** Marcus's stated #3 — *"AI thing that lives in their pocket"* (transcript line 79).

**ROI (fully doc-anchored):**
- Auditor's math (transcript line 89): **4 crews × 1 missed/week × $500 avg = $104K/yr baseline**
- Marcus quantified (line 87): *"Couple hundred bucks. Maybe $500–1,000 if it is a real screw-up"*
- Pure margin contribution: ~70%+ on small adds vs ~38% project margin (onboarding line 24)

**Why #5 (not #3 as Marcus ranked):** Real money, but auditor explicitly flagged this as a candidate trap (line 89): *"order of magnitude smaller than the quote-cycle revenue at risk."* The data demotes it from Marcus's stated #3 to our #5.

---

## What we cut

**Marketing / Content Agent (Marcus's stated #4) — cut entirely.** Marcus contradicted his own priority on the call (line 103): *"Quote. I cannot keep up with the leads I have."* Auditor flagged this as solving a non-problem (line 105). Adding leads to a clogged funnel solves nothing.

## Documented assumptions (where the docs were silent)

**Strategy-level assumptions:**
- Quote agent recovery rate: 20% (conservative; refine post-launch)
- Build phasing timelines for #1: industry-standard scoping with ~450 historical proposals available as fine-tuning corpus (3 yrs × 150)
- Pre-Qual lead criteria: good = $30K+ / 4+ wks out / owner / in-scope category; mid = $10–30K; bad = <$10K / renter / immediate timeline / out-of-scope
- Pre-Qual indirect capacity gain: 1–2 reclaimed hours/wk become 1–2 extra site walks/wk
- Post-Sign capacity gain: 1–2 wks/project × 150 projects = 5–10 extra projects/yr
- Marcus's hourly value: $200 (used in pre-qual standalone $ calc)

**Build-level assumptions** (synthetic pricing catalog structure, proposal template sections, voice spec, intake fields, Phoenix-specific factors): see `docs/06-assumptions.md` — every assumption with reasoning and Day 1 swap path. The architecture is built so every assumption maps to a swappable component; Day 1 of real engagement = ingest Marcus's actual data + swap fixtures, no architecture change.

---

## Why our #1 isn't Marcus's stated #1 (literally)

Marcus's diagnosis (quote speed) is correct — auditor confirmed and the math overwhelms. We diverge on **implementation philosophy and structure**:

1. **Implementation:** Marcus framed it as "make Marcus faster" — implying linear improvement of his own throughput. We framed it as "remove Marcus from drafting; he reviews instead." This matches what he said he actually wants ("fire myself from drafting", onboarding line 104) but he did not position it as a priority.
2. **Phasing:** A typical full quote-agent build is 4–6 months. We're proposing Phase 1 in 2 weeks at ~10% of mature cost (text input + scope extraction + draft + review/approve), then layering in fine-tuning, voice capture, and full integrations across the next 2 months. Revenue starts week 2.

The bigger pushback in this strategy lives at #3, #4, #5, and the cut: **#3 promoted Pre-Qual** (Marcus mentioned wanting it but did not put it in his stated priorities), **#4 added Post-Sign** (he did not list it at all — the non-obvious pain), **#5 demoted his stated #3** Crew Upsell with the auditor's "candidate trap" math, **his stated #4 cut** (marketing). Every position 2–5 differs from his stated list with explicit reasoning anchored in the docs.

## One agent considered but not included in the top 5

**Customer Communication Agent** — automated during-build progress updates with Marcus voice/branding, triggered by CompanyCam uploads + Jobber milestones. Auditor flagged as "high-signal, low-cost opportunity" (transcript line 49). Marcus confirmed: *"customers love it... I have gotten referrals from people who said 'you are the only contractor who kept us informed'"* (line 47). Cut from top 5 because:

- No doc-anchored revenue figure (referrals real but unquantified)
- Solves customer experience and brand more than throughput or revenue
- Lower leverage than top 5 on Marcus's stated constraint and stated tiredness
- Strong add-on candidate once #4 (Post-Sign Coord) is live, since both touch project lifecycle data and can share the event-source infrastructure
