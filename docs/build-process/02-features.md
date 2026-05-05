# 02 — Features

## User stories — MVP / Phase 1

### Marcus
- As Marcus, I can paste site walk notes into a form so the agent can begin drafting
- As Marcus, I can see the extracted scope before the proposal is drafted so I can catch errors early
- As Marcus, I can see the matched line items with quantities and prices in a table so I can verify pricing
- As Marcus, I can see flagged ambiguities so I know what to resolve before sending
- As Marcus, I can edit any field in the draft (line items, quantities, prices, copy) before approving
- As Marcus, I can approve a draft and have it sent to the customer via email
- As Marcus, I can see a list of all past quotes with their status (draft, sent, accepted, rejected, lost)
- As Marcus, I can re-open any past quote to see what was sent and the agent's reasoning
- As Marcus, I can see the cost (in dollars) of generating each quote

### Jenna (read-only in MVP)
- As Jenna, I can see the status of any active quote so I can answer customer status questions

### Customer (passive)
- As a customer, I receive a clean, branded PDF proposal in my email inbox

---

## Feature list — full vision → MVP cut

| # | Feature | Phase | Notes |
|---|---|---|---|
| 1 | Text input for site walk notes | **MVP** | Required |
| 2 | Customer info form (name, email, address, project type) | **MVP** | Required |
| 3 | AI scope extraction | **MVP** | Sonnet |
| 4 | Line item matching against pricing catalog | **MVP** | Sonnet w/ tool use |
| 5 | Ambiguity flagging | **MVP** | Haiku |
| 6 | Proposal copy generation in branded voice | **MVP** | Sonnet |
| 7 | Output validation (no hallucinated items, totals match) | **MVP** | Haiku — gates send |
| 8 | Editable draft UI (all fields) | **MVP** | Inline editing |
| 9 | Approve & send flow | **MVP** | Email via Resend |
| 10 | PDF generation with branded template | **MVP** | HTML→PDF |
| 11 | Cost tracking per quote (displayed in admin) | **MVP** | Per-call accounting |
| 12 | Quote list / history with status filter | **MVP** | Sortable table |
| 13 | Outcome tracking (accepted / rejected / lost) | **MVP** | Manual update field |
| 14 | Carlos render trigger (>$30K visual flag) | **MVP** | Trigger workflow = Phase 2 |
| 15 | Pricing catalog admin (read-only view) | **MVP** | Edit = Phase 2 |
| 16 | Audit log of all agent decisions | **MVP** | Full reproducibility |
| 17 | Voice memo upload + transcription | Phase 2 | Deepgram API (matches existing Tunderman infra — used in other internal projects) |
| 18 | GHL push on approval | Phase 2 | Requires GHL OAuth setup |
| 19 | Stripe deposit invoice generation | Phase 2 | Triggered after approval |
| 20 | DocuSign integration | Phase 2 | Already exists in GHL native flow |
| 21 | HOA package auto-generation | Phase 2 | If HOA flag = true |
| 22 | Photo upload + vision LLM for grade/material context | Phase 3 | CompanyCam integration |
| 23 | Mobile-first PWA for site walk capture | Phase 3 | Marcus on the road |
| 24 | Continuous fine-tuning loop on accepted quotes | Phase 3 | Marcus's voice over time |
| 25 | Customer portal (view proposal in browser, sign in-app) | Phase 3 | Reduce email friction |
| 26 | AI-generated cover banner image per project | **Bonus** | Imagen/DALL-E if time allows |
| 27 | Multi-language support (Spanish for crew use) | Future | Phoenix market |

---

## Non-goals (explicit)

This product is NOT:
- A CRM — use GHL
- A project management tool — use Jobber
- A customer portal — out of scope
- A replacement for Marcus's site walk (he keeps that — line 11: *"non-negotiable"*)
- An autonomous send system — human-in-loop is non-negotiable
- A pricing engine that invents new line items — only catalog items, custom flagged for Marcus

---

## Edge cases — must handle

| Edge case | Behavior |
|---|---|
| Notes are too sparse to generate a proposal | Agent surfaces specific clarifying questions; doesn't guess |
| Customer asks for something not in the catalog | Agent flags as "custom item — needs Marcus pricing" |
| Total ends up <$8K (below project minimum) | Warn Marcus — could be a misqualified lead |
| Total ends up >$120K (above stated max range) | Flag for extra Marcus review |
| LLM returns malformed JSON | Validator rejects; orchestrator re-prompts with corrective instruction |
| LLM hallucinates a line item not in catalog | Validator rejects before commit; one retry then surface to Marcus |
| Cost exceeds per-quote budget | Warn but allow once; alert in admin |
| Customer email is invalid | Validate at form submit; don't proceed |
| Marcus edits make the total no longer match line items | Recompute on save; warn if mismatch persists |

---

## Success metrics (post-launch)

| Metric | Target | Baseline |
|---|---|---|
| Quote cycle time (notes → sent) | <2 days | 6-9 days |
| Marcus edit rate per quote | <30% of fields edited | N/A |
| Validation failure rate | <5% of generations need re-prompt | N/A |
| Cost per quote | <$0.50 | N/A |
| Quote-to-send conversion | >90% of generated drafts get sent | N/A |
| Hallucination rate (line items invented) | 0 (validator must catch) | N/A |
| Acceptance rate on quotes | ≥30% (current overall) | 30% |

The leading indicator is **cycle time**. The lagging indicator is **acceptance rate** (downstream of cycle time per the auditor's analysis).

---

## Demo scenarios for the Loom

The Loom should show:

1. **Happy path** — paste realistic notes, see scope extracted, see line items priced, see ambiguities surfaced (or none), see proposal draft, edit a line item, approve, see PDF, see "sent" confirmation
2. **Edge case** — sparse notes → agent flags missing info instead of guessing
3. **History view** — show 3-4 past quotes with different statuses
4. **Cost & audit** — show per-quote cost; click into audit log to show every skill call

Out of scope for Loom: code line-by-line narration (brief explicitly penalizes this).
