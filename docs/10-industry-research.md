# 10 — Industry Research (Validation of Working Assumptions)

## Intro

Source materials are silent on most specifics of how a premium residential hardscape contractor like Marcus prices and structures proposals. `06-assumptions.md` makes working assumptions; this doc validates or corrects them with a Phoenix-AZ lens. Output: targeted schema and template changes.

## Methodology

Web research across state regulators (Arizona DOR, AZ ROC), industry/manufacturer sources (CMHA — merged ICPI+NCMA, Belgard, NALP marketplace), and contractor-education sites (Lawn & Landscape, Landscape Management, Aspire, Buildertrend, Angi, BuildingAdvisor); ≥2 sources cross-checked per claim.

---

## Findings

### 1. Pricing model — all-in vs broken out

**Answer:** Residential design-build at this size leans **all-in line items grouped by scope category** on the customer-facing proposal, with labor/materials separated only internally. Broken-out labor on the customer doc is more commercial/cost-plus. Grouping into "deliverables" is the consistent template recommendation. **High confidence.**
**Sources:** [Angi labor-vs-material](https://www.angi.com/articles/what-rule-thumb-labor-cost-vs-material-cost-hardscape-projects.htm); [Aspire template](https://www.youraspire.com/templates/landscaping/proposal); [Grow Group estimating](https://www.growgroupinc.com/the-grow-group-blog/estimate-a-landscaping-job-correctly).
**Phoenix:** AZ tax math (Q3) actively favors a single bundled price.
**Verdict:** Assumption correct.

### 2. Payment schedule

**Answer:** **50/25/25 is on the high-deposit end.** Modal residential design-build is **10–30% deposit, 60–80% in 2–4 milestone draws, 10–15% on completion**. Sources flag deposits >25% as warranting written justification. For $28K, 30/30/30/10 or 35/35/30 is more defensible. **Medium-high confidence.**
**Sources:** [Angi payment terms](https://www.angi.com/articles/what-are-standard-payment-terms-home-remodeling.htm); [Sweeten 33% deposit](https://sweeten.com/advice-and-faq/what-is-normal-deposit-for-a-general-contractor/); [Mastt schedule structures](https://www.mastt.com/blogs/contractor-payment-schedule).
**Phoenix:** No statutory deposit cap in AZ (unlike CA's 10%/$1K rule), so 50% is legal but optically aggressive.
**Verdict:** **Adjust** to 30/30/30/10 default; make schema-configurable.

### 3. Sales tax handling (Arizona TPT)

**Answer:** AZ prime contractors **may but need not** separately state TPT on proposal/invoice; "factoring" tax into gross is explicitly permitted, and the 2021 statute change *removed* the prior separately-stated requirement. Standard residential modification practice = **bundled gross, no tax line**. Plus: post-July-2021 exemption from prime-contracting TPT for residential projects ≤$100K per unit covers most of Greenscape's range. **High confidence.**
**Sources:** [AZ DOR Contracting FAQs](https://azdor.gov/transaction-privilege-tax/contracting-guidelines/contracting-faqs); [AZ DOR Tax Factoring](https://azdor.gov/business/transaction-privilege-tax-tpt/tax-factoring); [AZ DOR Modification Contracting](https://azdor.gov/transaction-privilege-tax/contracting-guidelines/modification-contracting).
**Phoenix:** Marcus likely owes *no* prime contracting TPT on most projects — flag in onboarding.
**Verdict:** Assumption correct; add onboarding note to confirm exemption + factoring election.

### 4. Exclusions section

**Answer:** Yes — explicit "what's NOT included" is residential best practice and standard in every contractor template reviewed. Kills the most common dispute pattern. Typical excludes: permits beyond stated allowance, utility relocation, irrigation repair beyond visible damage, HOA fees, post-install plant replacement. **High confidence.**
**Sources:** [Justice Project — 7 essential clauses](https://www.thejusticeproject.org/7-essential-clauses-every-landscape-design-contract-should-have/); [Aspire template](https://www.youraspire.com/templates/landscaping/proposal); [PandaDoc template](https://www.pandadoc.com/landscaping-proposal-template/).
**Verdict:** **Add as new section.**

### 5. Warranty section

**Answer:** Tiered: **1-yr workmanship minimum; 2–5 yr typical for hardscape**; 90-day plants; manufacturer warranties (often lifetime structural) pass through. Belgard authorized contractors must guarantee workmanship ≥3 years. Should be **separate, named section** — primary trust-builder for premium positioning. **High confidence.**
**Sources:** [Belgard product warranty](https://www.belgard.com/plan-design/installation-beyond/product-warranty/); [Landscape Management plant warranties](https://www.landscapemanagement.net/evening-it-out-how-to-approach-plant-warranties/); [Kingstowne warranty basics](https://www.kingstownelawn.com/blog/landscape-contract-basics-what-is-covered-landscape-warranties); [Sun Viking warranty](https://sunviking.net/wp-content/uploads/Sun-Viking-Hardscaping-Warranty.pdf).
**Verdict:** **Add as new section.** Default: "2-yr workmanship hardscape, 1-yr irrigation, 90-day plant material, manufacturer warranties pass through."

### 6. Contingency / allowances

**Answer:** Two distinct concepts:
- **Allowance** (known-unknown, e.g., "lighting fixtures: $1,200 allowance") — shown as line item.
- **Contingency** (unknown-unknown) — typically **NOT customer-facing**; absorbed into margin or change-ordered. Industry guidance: 10–15% new build, 15–25% renovation, kept internal. **Medium-high confidence.**
**Sources:** [AIA contingency allowance](https://www.aia.org/resource-center/managing-the-contingency-allowance); [Buildertrend contingency](https://buildertrend.com/blog/construction-contingency/); [Buildern contingency vs allowance](https://buildern.com/resources/blog/construction-contingency-vs-allowance/).
**Verdict:** Assumption mostly correct (no contingency line). **Add allowance support** via `item_type` field.

### 7. License + insurance disclosure (Arizona ROC)

**Answer:** AZ statute **requires written contracts to include the contractor's ROC license number**. Illegal to respond to RFPs without a valid license; ROC explicitly tells homeowners to verify. Insurance carrier disclosure not statutorily required but a near-universal trust signal on premium residential. **High confidence.**
**Sources:** [AZ ROC Contracts](https://roc.az.gov/contracts); [AZ ROC Before You Hire](https://roc.az.gov/before-hire); [AZ ROC Contracting in Arizona](https://roc.az.gov/news/contracting-arizona-heres-what-you-need-know).
**Verdict:** **Add.** ROC # in footer/signature block; insurance line optional but recommended.

### 8. Typical proposal length

**Answer:** **5–6 pages** is the residential sweet spot. Industry templates converge 2–6 pages residential, 5–6 typical for design-build. >10 pages = over-engineered for $28K. **High confidence.**
**Sources:** [Cad Crowd landscape architect cost](https://www.cadcrowd.com/blog/what-does-it-cost-to-hire-a-landscape-design-architect-expert-for-your-company/); [Aspire template](https://www.youraspire.com/templates/landscaping/proposal); [PandaDoc template](https://www.pandadoc.com/landscaping-proposal-template/).
**Verdict:** Assumption correct (4–6).

### 9. Photos / case study references

**Answer:** Premium contractors **embed 1–3 past-project photos** in the proposal (cover, overview, or "similar work" page) rather than sending separate portfolio. Reinforced by CompanyCam/Houzz workflows. Fits Greenscape's "photographs well" positioning. **Medium confidence** (template-supported, no hard prevalence stat).
**Sources:** [CompanyCam landscape](https://companycam.com/industries/landscaping); [Landscape Management AI design tools](https://www.landscapemanagement.net/how-ai-design-software-helps-landscape-contractors-win-more-jobs/); [Aspire template](https://www.youraspire.com/templates/landscaping/proposal).
**Verdict:** **Add** optional photo block in Project Overview; Phase 2 = CompanyCam pull.

### 10. Greeting tone

**Answer:** **Warm, name-first, references the site visit** is residential standard. Sources call the intro "the warm-and-fuzzy part." Formal "Dear Mr. Smith" mismatches Marcus's demonstrated voice. **High confidence.**
**Sources:** [Joist contractor proposal](https://stage.joist.com/blog/how-to-write-contractor-proposal/); [Buildern proposal generation](https://buildern.com/resources/blog/proposal-generation/); [Flowcase template](https://www.flowcase.com/blog/construction-proposal-template).
**Verdict:** Assumption correct; reinforce in voice spec.

### 11. Change order policy

**Answer:** Reference change-order process in original proposal (one short clause); deliver actual CO form when triggered. Required: written approval before work proceeds, scope+cost+timeline impact, both signatures. "Verbal change orders not honored" is boilerplate. **High confidence.**
**Sources:** [BuildingAdvisor change orders](https://buildingadvisor.com/project-management/contracts/change-orders/); [AIA change orders](https://learn.aiacontracts.com/articles/6378493-the-fundamentals-of-change-orders-in-construction/); [Solutions GC](https://www.solutionsgc.com/change-order-in-construction/).
**Verdict:** Assumption correct; strengthen language: "All changes require written authorization before work proceeds; verbal requests not actionable."

### 12. Site walk duration

**Answer:** **60–90 min standard**, up to 2 hr on complex/sloped/large lots. **High confidence.**
**Sources:** [ITM consultation expectations](https://www.itmlandscape.com/blog/what-to-expect-during-a-landscaping-design-consultation/); [Glover Nursery prep](https://glovernursery.com/5-things-to-prepare-before-a-landscape-design-consultation/); [Houzz consultation](https://www.houzz.com/magazine/what-to-expect-from-a-landscape-design-consultation-stsetivw-vs~168491490).

### 13. Design-on-site vs design-after

**Answer:** In design-build, **major material/color commitments are deferred** to a design-development phase post-walk. Walk captures scope, constraints, vibe, budget. Site walk produces *direction* (e.g., "travertine over concrete"), not SKU-level commitment. Agent should propose categories + grades, defer SKUs. **Medium-high confidence.**
**Sources:** [Down to Bid 5 stages](https://downtobid.com/blog/design-build-construction-process); [Ashmore Builders process](https://ashmorebuilders.com/blog/expert-guide-to-design-build-process); [Charchitect phases](https://www.charchitect.com/blogs/breaking-down-the-phases-of-design-process).

### 14. Industry close rate at $28K

**Answer:** Marcus's 30% is **directionally consistent**. Landscape design-build close rates fall 25–40%, with 30% as common baseline in software ROI cases. Fully credible for a qualifier→walk→proposal funnel. **Medium confidence** (no hard NALP-published benchmark found; range from secondary sources).
**Sources:** [ProScape landscape design pricing](https://proscapeai.com/resources/pricing-landscape-design-projects); [Lawn & Landscape 13 benchmarks](https://www.lawnandlandscape.com/article/13-key--benchmarks-november-2015-new/); [synkedup benchmark report](https://synkedup.com/man-hour-price-benchmark-report/).

### 15. Software stack norms

**Answer:** **Jobber + CompanyCam is a standard pairing** (official partnership). **GHL is less common landscape-native** — it dominates broader home services (HVAC, roofing). Landscape contractors typically use Jobber/Aspire/LMN as CRM. Stripe is universal. So GHL+Jobber+CompanyCam+Stripe is **plausible but cross-industry-flavored** — Marcus on GHL likely reflects an outbound/marketing-funnel preference. **Medium confidence.**
**Sources:** [CompanyCam best apps](https://companycam.com/resources/blog/best-landscaping-apps-software); [Jobber + CompanyCam integration](https://companycam.com/integrations/jobber); [Lawn & Landscape Jobber partnership](https://www.lawnandlandscape.com/news/jobber-partners-with-companycam/).

---

## Recommendations for our build

### A. Schema changes (`docs/03-architecture.md`)

1. **`line_items`:** add `item_type` enum (`fixed | allowance | custom`) — supports allowance line items (Q6).
2. **`quotes`:** add `payment_schedule` jsonb (default `[{milestone:"deposit",pct:30},{milestone:"mobilization",pct:30},{milestone:"midpoint",pct:30},{milestone:"completion",pct:10}]`) — replaces hard-coded 50/25/25 (Q2).
3. **`quotes`:** add `roc_license_number` and `insurance_carrier` snapshot fields (Q7), frozen at proposal time.
4. **No tax field** — confirmed AZ practice is bundled gross with factoring (Q3).
5. **Optional:** `quote_artifacts` gets `photos` artifact_type for Phase 2 CompanyCam embed (Q9).

### B. Proposal template structure (`06-assumptions.md` Section 3)

Move from **7 sections → 9**:

| # | Section | Change |
|---|---|---|
| 1 | Cover | unchanged |
| 2 | Greeting | warm, name-first (Q10) |
| 3 | Project Overview | add optional photo block (Q9) |
| 4 | Detailed Scope & Pricing | grouped by category, all-in (Q1); allowance items flagged (Q6) |
| 5 | **Exclusions** | **NEW** explicit "not included" list (Q4) |
| 6 | Timeline | unchanged |
| 7 | **Warranty** | **NEW separate section** — workmanship + plant + manufacturer pass-through (Q5) |
| 8 | Terms & Next Steps | adjusted payment schedule (Q2); strengthened CO clause (Q11); 30-day validity |
| 9 | Signature + License Block | **NEW footer** — ROC #, insurance carrier (Q7) |

### C. Voice / style spec (`06-assumptions.md` §4 + `04-agent-skills.md` `generate_proposal`)

- Keep "premium craftsman, warm, transparent" — fully validated (Q10).
- **Add:** Reference site walk by date + 1–2 specific observations from notes.
- **Add:** Material descriptions stay at category/grade level (e.g., "premium travertine pavers, French pattern"), not SKU-locked — reflects design-build phase reality (Q13).
- **Keep:** No salesy modifiers, no urgency, no discount framing.

---

## Flagged disagreements between sources

1. **Deposit norm.** Angi/Sweeten cap "normal" at 25–33%; Buildertrend/Mastt accept up to 50% on smaller jobs. Premium positioning shouldn't lead with the most aggressive cash term — side with the lower range.
2. **Workmanship warranty length.** 1 to 30 years across sources; Belgard's 3-yr minimum for authorized installers is the most defensible anchor. Default 2 yrs, let Marcus edit upward.
3. **Labor/materials separation.** Angi advises separating; landscape-native templates (Aspire, PandaDoc) bundle. Split tracks commercial vs residential — residential bundles win.
4. **GHL prevalence.** No source confirms GHL as landscape-native. Worth confirming with Marcus whether GHL is replacing or supplementing a landscape-native tool — affects Phase 2 integration assumptions.
