# 06 — Assumptions (Explicit Registry)

This doc is the canonical source for every assumption we made because the source materials (`assignment-docs/`) were silent on it. Per the brief: *"make defensible assumptions and document them."* (line 134).

For each assumption: **what the docs say, what we assumed, why defensible, Day 1 of real engagement swap path.**

The architecture is built so that every assumption maps to a swappable component — Day 1 of a real engagement = ingest Marcus's actual data + swap the synthetic fixture, no architecture change.

---

## 1. Pricing — spreadsheet structure

**What docs say:** *"The pricing spreadsheet is pretty complete. It has 200 or more line items"* (transcript line 15). Lives in Google Workspace (onboarding line 53). Marcus uses it to "build line items in a Google Doc" (line 11). That's it. No mention of structure, columns, formulas, units, or naming.

**What we assumed (synthetic catalog):**
- Schema: `(category, name, description, unit, unit_price, active)`
- Categories: the 8 from onboarding line 18 (patio, pergola, fire_pit, water_feature, artificial_turf, irrigation, outdoor_kitchen, retaining_wall)
- Units: `sq_ft`, `linear_ft`, `each`, `zone`, `hour`, `lump_sum`
- Seeded ~80 items (~10 per category), Phoenix-realistic
- Prices are "installed" (labor + materials bundled), 38% margin baked in to match doc revenue/margin numbers (onboarding line 24)

**Why defensible:**
- Categories are taken directly from onboarding line 18
- Unit types are industry-standard for hardscape contracting
- Prices back-calculate to $28K avg projects (onboarding line 12)
- Phoenix-specific items (caliche-resistant base, drought-tolerant turf, heat-rated finishes) match the market

**Day 1 of real engagement:** Ingest Marcus's actual Google Sheets pricing spreadsheet via Google Drive API → map columns to our schema → bulk insert to `greenscape.line_items`. The agent code does not change.

### Synthetic catalog skeleton (representative — full list in seed data)

| Category | Sample items (representative) |
|---|---|
| Patio | Travertine paver patio (premium, $22/sq ft); Flagstone natural ($28/sq ft); Concrete paver ($14/sq ft); Stamped concrete ($12/sq ft); Caliche-resistant base prep ($4/sq ft); Existing concrete demo + haul ($3.50/sq ft); Drainage install (lump $850) |
| Pergola | Cedar pergola 12x12 ($7,800); 16x16 ($12,500); Aluminum 12x12 ($6,200); Steel powder-coat 12x14 ($11,500); Lighting package ($1,800); Retractable canopy add-on ($2,400) |
| Fire pit | Gas fire pit 36" round ($3,400); 48"x24" rectangular ($4,800); Wood-burning flagstone ($2,200); Linear gas feature 6 ft ($5,600); Wood→gas conversion ($1,400) |
| Water feature | Pondless waterfall small 3-5 ft ($4,800); medium 6-8 ft ($7,500); Pond w/ waterfall ($9,200); Bubbling rock fountain ($1,200); Sheer descent water wall 4 ft ($3,400) |
| Artificial turf | Premium 75oz pet/play ($9.50/sq ft installed); Standard 50oz ($7.25/sq ft); Putting green ($13/sq ft); Caliche-resistant base prep ($2.50/sq ft); Grass removal + haul ($1.80/sq ft) |
| Irrigation | Drip zone ($450/zone); Pop-up sprinkler zone ($380/zone); Smart controller Rachio ($480); Rain sensor ($180); Backflow preventer ($320); Audit/repair labor ($125/hour) |
| Outdoor kitchen | L-shaped grill island 8 ft stucco ($8,800); Linear 10 ft stone veneer ($14,500); Built-in grill insert ($3,200); Granite countertop ($145/linear ft); Outdoor refrigerator ($1,800); Sink + plumbing ($1,200) |
| Retaining wall | Block 24" tall ($85/linear ft); 36" ($125/linear ft); 48" engineered ($185/linear ft); Boulder natural ($145/linear ft); Stucco-finish concrete ($165/linear ft); Cap stones ($22/linear ft); Drainage behind wall ($35/linear ft); Engineering stamp >36" ($850) |
| Universal | Phoenix permit pull ($325); HOA submission package ($450); Final cleanup + haul ($650); 3D rendering for >$30K projects ($850); Project mgmt overhead 8% of subtotal |

---

## 2. Pricing — logic / markup / handling

**What docs say:** Margin is ~38% on design+build (onboarding line 24). 50% deposit on signing (line 71). Nothing else.

**What we assumed:**
- Prices are all-in (labor + materials bundled per line item), not separated
- 38% margin is already baked into each `unit_price`, not added on top
- No tax line on the proposal (Marcus presumably handles tax at invoice stage via Stripe/QuickBooks)
- No contingency line item (Marcus eats overage from his margin)
- No discount logic — Marcus quotes firm; if he discounts, he edits the line in admin
- Custom items (anything not in catalog) get `is_custom = true`, `unit_price = 0` placeholder, surfaced to Marcus to price manually

**Why defensible:**
- All-in pricing matches how most residential design-build companies quote (vs labor-broken-out which is more commercial/industrial)
- 38% margin in price aligns to the doc's stated revenue/margin numbers
- No tax on quote = standard for residential US contractors (tax shown on invoice)
- "Custom" handling preserves Marcus's authority over judgment calls

**Day 1 of real engagement:** Confirm pricing model with Marcus in 15 min. If he separates labor/materials, we add fields and update the proposal template. Schema migration only if structure differs (rare).

---

## 3. Proposal — template structure

**What docs say:** *"plugs line items into a Google Doc template"* (transcript line 11), exports to PDF (onboarding line 64). 50% deposit (line 71). Customer signs via DocuSign-style flow in GHL after (line 70). Nothing about sections, length, or voice.

**What we assumed (7-section structure):**

| # | Section | Purpose |
|---|---|---|
| 1 | Cover Page | Greenscape Pro logo placeholder, "Proposal for [Customer Name]", project address, date, proposal #, optional cover banner |
| 2 | Greeting / Introduction | 1 paragraph in Marcus's voice; references the site walk; sets tone |
| 3 | Project Overview | 1-2 paragraphs; plain-English scope summary; key materials and special considerations |
| 4 | Detailed Scope & Pricing | Line items table grouped by category; subtotal per category; project subtotal; project total |
| 5 | Timeline | Estimated start date range, duration in weeks, phased milestones |
| 6 | Terms & Next Steps | 50% deposit on signing, 25% mid-project, 25% on completion; 30-day proposal validity; change order policy; warranty mention |
| 7 | Signature Block | Customer signature line, Marcus signature line, dates |

**Length:** 4-6 pages PDF (cover + 3-4 content + signature)

**Why defensible:**
- 7-section structure is industry-standard for residential design-build proposals
- The 50%/25%/25% payment schedule is the most common variant for Phoenix residential
- 30-day validity is standard
- Reads professional without being overdesigned

**Day 1 of real engagement:** Ask Marcus to email us his current Google Doc template. Mirror its sections, voice, and order in our HTML/CSS template. Re-render the same dynamic content into his exact layout. ~2-3 hours of template work.

---

## 4. Proposal — voice and tone

**What docs say:** Greenscape positioning is *"quality, reliability, and a finished product that photographs well"* (onboarding line 18). Premium. Doesn't compete on price. Customers apologize when they pick competitors (transcript line 19). Marcus's reactivation language is personal: *"Hey, we were talking about your backyard last spring..."* (line 59).

**What we assumed (voice spec for `generate_proposal` skill):**
- **Premium craftsman.** Confident in the work, specific in the details.
- **Warm, not corporate.** Speaks to the customer, not at them.
- **Specific to their project.** Avoids generic templating phrases. References their yard, their materials, their use case.
- **Transparent on pricing.** No hidden fees, no markup obfuscation.
- **No hard-sell.** No urgency tactics, no discounts framed as favors.
- **No salesy modifiers.** Avoid "amazing", "stunning", "perfect" — let the work speak.

**Why defensible:** Derived directly from Greenscape's positioning ("photographs well", premium, quality), Marcus's own demonstrated voice in the reactivation example, and the customer-base description (high-end residential — they respond to craftsmanship, not pitches).

**Day 1 of real engagement:** Marcus sends us 3-5 of his best past proposals → we extract his actual voice patterns → update the few-shot examples in `generate_proposal.ts`. Same skill, sharper voice.

---

## 5. Site walk notes — input format

**What docs say:** Marcus *"pulls scope from his notes"* (onboarding line 64). *"I have to interpret the site walk notes and turn them into a scope"* (transcript line 15). Format unspecified — could be handwritten, phone notes, voice, sketches.

**What we assumed:**
- Agent accepts **freeform text** as input (paste from anywhere, type fresh, or transcribed voice memo in Phase 2)
- No required structure — extract whatever's present
- Agent surfaces ambiguity rather than guessing missing info
- Phase 2 adds: voice memo upload + Deepgram transcription (existing infra in SchilderGroei + Lead System), then same downstream chain

**Why defensible:** The agent's `extract_scope` skill is designed to handle messy unstructured input — that's its job. Locking input to a specific format would defeat the purpose and break against Marcus's actual workflow (whatever it is).

**Day 1 of real engagement:** Marcus uses whatever capture method he already uses. Phase 2 voice memo upload added once we know whether he records on his phone, dictates while driving, or types after.

---

## 6. Customer intake / quote creation form

**What docs say:** GHL has the customer's basic info from the lead form. Phone qualifier covers "scope, timeline, and budget range" (onboarding line 62) — exact questions not specified.

**What we assumed (customer fields on `/quotes/new`):**
- Customer name (required)
- Email (required, validated)
- Phone (optional)
- Project address (required — Phoenix area assumed)
- Project type (freeform text or select from category list)
- HOA y/n (boolean — feeds Phase 2 HOA package automation)
- Budget tier (informational, not used in agent reasoning)
- Site walk notes (the main input — see #5)

**Why defensible:** Minimal fields needed to generate a quote and email it. Mirrors what Marcus already gathers in his GHL lead record + phone qualifier.

**Day 1 of real engagement:** Trigger `/quotes/new` from a GHL webhook on lead-qualified status. Fields pre-populate from the GHL contact record. Marcus only fills in scope notes after the site walk.

---

## 7. Pre-Qualification criteria (for ranked agent #3 — not built in this MVP, but documented for completeness)

**What docs say:** Marcus disqualifies *"$2,000 job, or they are renting, or they want it done in two weeks and we are booked 6 weeks out"* (transcript line 67). 4-6/week of his 15-20 calls are "clearly unqualified" (line 71).

**What we assumed (good / mid / bad criteria):**

| Tier | Criteria | Action |
|---|---|---|
| **Good** | Budget ≥ $30K AND timeline ≥ 4 weeks AND owner AND in-scope category | Auto-route to Marcus's calendar |
| **Mid** | Budget $10-30K AND owner AND in-scope category AND timeline ≥ 2 weeks | Route to Marcus for manual review |
| **Bad** | Budget < $10K OR renter OR timeline < 2 weeks OR out-of-scope category | Polite no-fit response, no calendar slot |

**Why defensible:** Thresholds derived directly from Marcus's stated examples (transcript line 67). $30K threshold also aligns with the existing >$30K render trigger (line 64) — natural breakpoint in their business.

**Day 1 of real engagement:** Validate thresholds with Marcus in a 10-min call. Adjust based on his actual close-rate-by-budget data from GHL.

---

## 8. Phoenix-specific factors

**What docs say:** Phoenix AZ location (onboarding line 9). Crews work 5 days × 7-hour days *"due to Phoenix heat"* (line 82). Nothing about soil, materials, or codes.

**What we assumed:**
- Caliche soil is real and adds base-prep cost (every patio/turf line includes a "caliche-resistant base prep" sub-item)
- Drought-tolerance and heat-resistance baked into material choices (artificial turf options heavy, native plant assumptions)
- Permit costs reflect Phoenix municipal pricing (~$325 typical)
- HOA prevalence reflects Phoenix suburban norms (most projects have HOA)

**Why defensible:** Phoenix-specific industry knowledge. Caliche, heat, and HOA density are well-documented characteristics of the market.

**Day 1 of real engagement:** No change — Phoenix-specific assumptions hold for any Phoenix-based contractor.

---

## 9. Replaceability map (the architectural insurance)

Every assumption above maps to a swappable component. Day 1 of real engagement, the swaps are:

| Assumption | What gets swapped Day 1 | Architecture impact |
|---|---|---|
| Pricing catalog | `greenscape.line_items` table re-seeded from Marcus's spreadsheet | None — same schema |
| Pricing logic (markup, discount, tax) | If different: schema migration to add fields; agent skill prompt update | Minor |
| Proposal template structure | HTML/CSS template file replaced; section component changes | None — same data flow |
| Proposal voice | Few-shot examples in `generate_proposal.ts` replaced with Marcus's real proposals | None — same skill |
| Site walk notes format | Phase 2 audio capture added; same `extract_scope` skill | None |
| Customer intake fields | GHL webhook auto-populates; `/quotes/new` form simplifies | Minor |
| Pre-qual thresholds | Constants in pre-qual skill (not in MVP build) | None |
| Phoenix factors | Already correct | None |

**This is the key defense for the live walkthrough:** when L&S asks *"how do you handle Marcus's actual data?"*, the answer is *"every assumption is a swappable fixture; the architecture doesn't change Day 1 — only the seed data does."*

---

## How this doc gets used

- **Strategy doc** has a brief "Documented assumptions" summary that links here for full detail
- **Project brief** (`00-project-brief.md`) references this doc in its "Documented assumptions" section
- **Architecture** (`03-architecture.md`) cross-links specifically for pricing schema + proposal template assumptions
- **Loom walkthrough** explicitly mentions: *"every assumption is in `docs/06-assumptions.md`, every assumption maps to a swappable component"*
- **Live walkthrough call** — open this doc in a tab; if asked about a specific assumption, answer from here directly
