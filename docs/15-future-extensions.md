# 15 — Future Extensions

What's deliberately deferred from the 24h MVP. Capture here so:
- The Loom answer to *"what would you build next if you had another week / month?"* is concrete
- The live walkthrough call has structured answers to *"how would you handle X?"*
- A real engagement Day 1 has a ready roadmap

Each item: **what · why deferred · effort estimate · how to ship.**

Grouped by horizon: **Phase 2 (week 2-4)**, **Phase 3 (month 2-3)**, **Real engagement Day 1**.

---

## Phase 2 — Week 2-4 (post-MVP, building on what's live)

### ~~F1 · UI to add line items to catalog~~ ✅ SHIPPED 2026-05-05 (D39)

**Status:** Done. Form lives on `/admin/line-items`: combobox for category (existing + "+ New category…"), fields for name/description/unit/unit_price/item_type. Posts to `POST /api/line-items`, refreshes the list. Newly added items are immediately searchable by the agent on the next quote.

### ~~F2 · Add new categories (not just new items)~~ ✅ SHIPPED 2026-05-05 (D39)

**Status:** Done. Migration `20260505_005_category_enum_to_text.sql` converted `line_items.category` from a Postgres enum to text. The agent's `match_pricing` skill now calls `getCategories()` at the start of every run to fetch the live distinct-category list, building the system prompt's "AVAILABLE CATEGORIES" section AND the `lookup_line_items` tool's enum constraint dynamically. Net effect: any category added via the UI at 10:00 is searchable by the agent at 10:01 — no code/prompt change.

The "registry table" idea from the original deferred plan turned out to be over-engineered: a CHECK constraint + dynamic agent prompt + UI normalization (snake_case) is simpler. PDF template iterates over whatever categories appear in the priced items so it adapts automatically.

### F3 · Voice memo input + Deepgram transcription

**What:** Marcus dictates site walk notes on the drive home; Deepgram transcribes; same downstream chain runs.

**Why deferred:** Phase 1 scope. Marcus's actual reality (he's on the road between site walks, not at a desk) makes voice the primary capture mode in real engagement.

**Effort:** ~4-6 hours.

**Ship:**
- File upload field on `/quotes/new` (audio/m4a, audio/mp3, audio/wav)
- Deepgram client wrapper in `lib/transcribe.ts` (Deepgram already in Tunderman stack — `~/Desktop/system/credentials.md`)
- Server action: upload audio → Deepgram → text → existing `extract_scope` flow
- Loading state during transcription (5-15s typical)

### F4 · Photo upload + CompanyCam reference

**What:** Marcus attaches site walk photos. Future: vision LLM extracts grade/material/scale info.

**Why deferred:** Phase 3 — not blocking the core drafting flow. Photos in `extract_scope` requires multi-modal model support which adds cost/complexity.

**Effort:** ~3 hours for upload + display; another ~6-8 hours for CompanyCam OAuth + sync.

### F5 · Manual proposal section reordering / hiding

**What:** Marcus drags sections to reorder, or hides sections he doesn't want for a specific quote (e.g., skip Warranty for a tiny add-on).

**Why deferred:** Current 8-section structure is good for 95% of cases. Edge case.

**Effort:** ~2 hours (drag-and-drop on the editor + a per-section visibility flag in proposal_markdown rendering).

---

## Phase 3 — Month 2-3 (broader workflow integration)

### F6 · GHL push on approval

**What:** When Marcus approves a quote, push the customer + opportunity + the proposal PDF URL into GHL as a contact + opportunity. Keeps GHL as the single system of record per Jenna's directive (transcript line 131).

**Why deferred:** Requires GHL OAuth app registration (~1 hour) + custom field mapping + reliable error handling for partial failures.

**Effort:** ~6-10 hours.

### F7 · Stripe deposit invoice generation

**What:** On approval, auto-generate the 50% deposit invoice in Stripe with the customer's email pre-filled, ready for Marcus to send.

**Why deferred:** Out of scope per user's explicit MVP scope decision. Marcus's existing Stripe flow handles this.

**Effort:** ~3-4 hours (Stripe API + customer mapping + invoice template).

### F8 · DocuSign integration

**What:** PDF goes to DocuSign for signature instead of being downloaded.

**Why deferred:** Marcus already has a DocuSign-style flow inside GHL (onboarding line 70). Integration would replace a working tool. Defer until the GHL push (F6) is in place; both could share the document handoff.

**Effort:** ~6 hours.

### F9 · 3D render workflow for >$30K projects

**What:** When `needs_render = true`, automatically:
1. Create a brief for Carlos (scope summary + site notes + customer info)
2. Email/Slack Carlos with the brief + a render upload link
3. Block the proposal from being downloaded until the render is uploaded
4. Embed the render in the PDF

**Why deferred:** Currently we just show a `RENDER` badge — Marcus tells Carlos manually. Doing this properly requires Carlos's tooling preferences (does he upload PNG, attach Lumion files, share via Dropbox?) — needs Marcus interview to design.

**Effort:** ~8-12 hours including Carlos discovery.

**Why this matters:** The current MVP is technically a regression for >$30K projects — Marcus's existing flow waits for Carlos before sending; ours generates and emails (when email was on) the proposal without it. We replaced one bottleneck (Marcus's drafting) but broke the >$30K render-attached chain.

### F10 · HOA package generation + timeline impact

**What:**
- (a) When `hoa = true`, auto-generate the HOA submission package (PDF with required attachments, dimensions, materials list) instead of just adding a $450 line item
- (b) Add 3-4 weeks to the Timeline section automatically when HOA flagged (matches Jenna's transcript line 27 description of board approval cycle)

**Why deferred:** Each HOA has different submission requirements; generic package is a starting point but won't match Camelback Mountain HOA vs Troon HOA exactly. Needs HOA-specific templates per ZIP code or per HOA name.

**Effort:** (a) ~10-15 hours including template design; (b) ~30 min.

### F11 · Crew availability check from Jobber

**What:** Before generating the Timeline section, query Jobber for crew availability and suggest realistic start dates instead of inventing them.

**Why deferred:** Requires Jobber API integration + Marcus's crew calendar discipline (if he doesn't keep Jobber updated, the data is wrong anyway).

**Effort:** ~8-12 hours.

**Why this matters:** Marcus said in transcript line 67 that he sometimes disqualifies leads because *"we are booked 6 weeks out."* Currently the agent could quote "2 weeks to start" when crews are unavailable for 8 weeks — promises Marcus can't keep.

### F12 · Welcome packet automation

**What:** On approval, auto-trigger Jenna's welcome packet send (brand kit + what-to-expect timeline + start date estimate).

**Why deferred:** Out of scope per user. Jenna's manual flow works. Integration is replacing a working tool with an automation that needs careful design.

**Effort:** ~4 hours (template + GHL send trigger).

### F13 · Customer-facing portal

**What:** Customer gets a unique URL where they can view the proposal, make comments, sign, pay deposit, all in one place.

**Why deferred:** Big build. Useful but not blocking the core "Marcus drafts faster" value prop.

**Effort:** ~40 hours for a real portal.

### F14b · Customer dedup-on-email respects form values

**What:** When the customer find-or-create logic in `lib/orchestrator.ts` Step 1 matches an existing customer by email, the form-submitted address/phone/name are silently dropped in favor of the stored values. Detected by all 3 e2e test runners on 5 of 6 cases.

**Why deferred from MVP:** Doesn't affect proposal quality, agent reasoning, or any deterministic guards. Customer NAME still flows correctly into the proposal because the agent reads from the form values during the run; only the persisted customer record uses the existing row's stored fields. Only manifests when the same email is reused across multiple quotes — uncommon in real usage and only visible during demo if Marcus creates multiple test quotes for the same email.

**Effort:** ~10 min for the simplest fix (option a) below.

**Three options when shipping:**
- (a) **Update existing record** with form values on dedup match (simplest, may cause silent overwrites if Marcus made a typo)
- (b) **Show "this email matches existing customer X — use stored OR update?" prompt** (better UX, requires UI work)
- (c) **Treat (email + address) as the dedupe key** instead of just email (more correct semantics if a customer has multiple properties)

Lean: option (b) if shipping, but (a) is fine for MVP-level fix.

### F14 · Real Anthropic key (not SchilderGroei reuse)

**What:** Per `~/Desktop/system/credentials.md` project-scoping rule, the Anthropic key should be project-scoped to Greenscape, not reused from SchilderGroei.

**Why deferred:** Temporary 1-week deploy; ~$1-3 total cost not worth a separate key for the demo window.

**Effort:** 5 min — generate new key in Anthropic console, swap `.env`, update credentials.md.

**When to do:** before any non-temporary deployment, OR at teardown (just remove the key entirely).

---

## Phase 4 — Real engagement Day 1 (after Marcus signs)

### F15 · Replace synthetic catalog with Marcus's real spreadsheet

**What:** Import Marcus's actual 200+ line item Google Sheets pricing spreadsheet → map columns to `greenscape.line_items` schema → bulk insert.

**Why MVP shipped synthetic:** Brief instruction "make defensible assumptions and document them" — see decision log D9 + assumptions registry replaceability map.

**Effort:** ~2 hours (Google Drive read + column mapping + bulk insert + validation).

### F16 · Replace synthetic proposal template with Marcus's actual Google Doc layout

**What:** Get Marcus's existing Google Doc template; mirror sections, voice, branding in our HTML/CSS PDF template.

**Why MVP shipped a generic template:** No access to Marcus's actual template.

**Effort:** ~2-3 hours.

### F17 · Replace 3 synthetic few-shot proposals with Marcus's real proposals

**What:** Marcus emails 3-5 of his best past proposals; we extract his actual voice patterns; update the few-shot examples in `lib/skills/generate_proposal.ts`.

**Why MVP shipped synthetic:** Same reason as F15/F16.

**Effort:** ~1 hour.

### F18 · Confirm + apply AZ TPT residential exemption (potential money on the table)

**What:** Research finding (D29) — Arizona's July 2021 statute change removed the requirement to separately state TPT, AND there's a residential exemption from prime-contracting TPT for projects ≤$100K per unit. Covers most of Marcus's $8K-$120K range.

**Why deferred:** Not architectural — needs a Marcus interview ("are you currently collecting TPT? are you properly factoring? did you know about the ≤$100K exemption?"). Could be money on the table.

**Effort:** 30-min Marcus interview + adjustments to invoice templates if needed.

### F19 · ROC license + insurance disclosure on proposals

**What:** Re-enable the License + Insurance section (was section 9 of the research-validated 9-section template; cut to 8 sections for the fictional Greenscape — see D27).

**Why deferred:** Greenscape Pro is a fictional client for the take-home. Real Marcus has a real ROC license number. AZ statute REQUIRES this on contracts (research Q7).

**Effort:** 15 min — add the section back to `generate_proposal` + PDF template + a `roc_license_number` env var.

---

## Other items considered but not pursued

### Multi-tenant auth + SaaS-ification

If Greenscape becomes a product L&S sells to multiple landscape contractors. Out of scope for the take-home (single-tenant by design).

### Word/.docx export

PDF satisfies the "Marcus can edit and send through DocuSign" flow. Adding .docx is reasonable but PDF is the cleanest format for a final customer-facing artifact.

### Mobile app / PWA

Marcus's real reality is on-the-road. A mobile-first PWA for site walk notes capture would be ideal but is Phase 3 and overlaps with F3 (voice memo).

### AI-generated cover banner image

Imagen/DALL-E-generated visualization on the PDF cover. Bonus that didn't make the cut. ~1 hour to add if Phase 2 has spare budget.

### Audit log aggregation / cost dashboards

Currently per-quote cost is visible. Daily/monthly aggregates across all quotes would be nice for Marcus to see total spend over time. Phase 2.

---

## How to use this doc

**For the Loom:** "What would you build next if you had another week?" → F1 (UI for adding line items, backend already done), F3 (voice memo), F9 (3D render workflow). One sentence each.

**For the live walkthrough call:** "How would you handle X?" → look up X here, answer with the structured "what + why deferred + effort + how to ship."

**For real engagement Day 1:** F15, F16, F17, F18, F19 are the immediate post-signature work. ~10-15 hours total to swap synthetic for real.

**For sequencing in a real engagement:** F1 → F3 → F9 → F6 → F11 → F10 is roughly the leverage-ordered roadmap.
