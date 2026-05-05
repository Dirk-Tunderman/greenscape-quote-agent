# 04 — Agent Skills Spec

## Pattern

Agentic orchestration with **focused skill modules**. The orchestrator runs a deterministic chain (with one optional retry on validation failure). Each skill is a single LLM call with a focused prompt, structured output, and explicit guardrails.

Why this pattern: easier to test, debug, observe, and refine each step independently than a monolithic single-prompt approach. Aligns with how L&S sells AI ("OpenAI/Claude agents, custom dashboards, internal tools, end-to-end automation systems" — brief).

---

## Orchestrator flow

```
input: { customer_info, raw_notes, project_metadata }
  │
  ▼
┌──────────────────────┐
│ [1] extract_scope    │ → structured scope items
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ [2] match_pricing    │ → priced line items (tool use)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ [3] flag_ambiguity   │ → questions for Marcus
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ [4] generate_proposal│ → markdown copy + summary
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ [5] validate_output  │ → pass / fail + issues
└──────────┬───────────┘
           │
   ┌───────┴────────┐
   ▼                ▼
 pass            fail
   │                │
   ▼                ▼
commit          retry once from [4] with corrective prompt
   │                │
   │                ▼
   │           pass / fail
   │                │
   │       ┌────────┴────────┐
   │       ▼                 ▼
   │     pass             surface to Marcus
   │       │             with validation_failed flag
   ▼       ▼
status: draft_ready     status: validation_failed
```

---

## Skill 1 — `extract_scope`

**Job:** Turn Marcus's messy site walk notes into a structured scope.

| Field | Value |
|---|---|
| Input | `raw_notes: string`, `project_metadata: object` |
| Output | `scope_items: ScopeItem[]` (validated against zod schema) |
| Model | Claude Sonnet (quality matters — wrong extraction propagates) |
| Max tokens | 2,000 |
| Temperature | 0.2 |

**Output schema (ScopeItem):**
```typescript
{
  category: "patio" | "pergola" | "fire_pit" | "water_feature" |
            "artificial_turf" | "irrigation" | "outdoor_kitchen" |
            "retaining_wall" | "other"
  description: string          // e.g., "travertine patio, ~400 sq ft"
  dimensions: {
    quantity: number | null
    unit: "sq_ft" | "linear_ft" | "each" | "zone" | "hour"
  } | null
  material_notes: string | null
  certainty: "high" | "medium" | "low"
  needs_clarification: string | null
}
```

**Prompt strategy:** Few-shot with 3-5 example extractions (synthetic). Explicit instruction: *"If a dimension is unclear or missing, set certainty='low' and populate needs_clarification. Do not invent numbers."*

**Guardrails:**
- Output must parse against zod schema; one retry on parse failure
- Each item must have either dimensions OR a `needs_clarification` value
- `certainty='low'` items will surface as ambiguities downstream

---

## Skill 2 — `match_pricing`

**Job:** Map structured scope items to line items in the priced catalog.

| Field | Value |
|---|---|
| Input | `scope_items: ScopeItem[]` |
| Output | `priced_items: PricedItem[]` |
| Model | Claude Sonnet with tool use |
| Tool | `lookup_line_items(category: string, search_terms: string)` → returns array of catalog matches |
| Max tokens | 4,000 (room for tool calls) |
| Temperature | 0.1 |

**Tool spec (`lookup_line_items`):**
```typescript
input: { category: string, search_terms: string }
output: Array<{
  id: string
  name: string
  description: string
  unit: string
  unit_price: number
}>
```

The tool queries the `line_items` table by category + fuzzy match on name/description.

**Output schema (PricedItem):**
```typescript
{
  line_item_id: string         // MUST exist in catalog
  line_item_name: string        // snapshot
  quantity: number
  unit_price: number            // snapshot
  line_total: number            // quantity * unit_price
  notes: string                 // why this match
  source_scope_item_index: number
}
```

**Prompt strategy:** *"For each scope item, call `lookup_line_items` to find matching catalog items. Pick the best match. Do NOT invent line items. If no good match exists, return a `custom_item_request` instead."*

**Guardrails (post-call validation):**
- Every `line_item_id` must exist in `line_items` table → reject + retry if not
- `line_total = quantity * unit_price` exactly
- Quantity > 0
- Custom items handled via separate path (not in `priced_items` array)

---

## Skill 3 — `flag_ambiguity`

**Job:** Identify what Marcus needs to clarify before this quote can be sent.

| Field | Value |
|---|---|
| Input | `raw_notes`, `scope_items`, `priced_items` |
| Output | `ambiguities: Ambiguity[]` (max 5) |
| Model | Claude Haiku (cheap, classification-style) |
| Max tokens | 800 |
| Temperature | 0.3 |

**Output schema:**
```typescript
{
  scope_item_index: number      // which scope item this references
  question: string              // for Marcus
  why_it_matters: string        // pricing impact, scope risk, etc.
  severity: "blocker" | "warn" | "info"
}
```

**Prompt strategy:** *"You are reviewing a draft quote for Marcus. Identify anything ambiguous, missing, or risky he should clarify before this quote is sent to a customer. Examples: missing dimensions, unclear material choice, vague timeline, items priced as 'custom' that need his price."*

**Guardrails:**
- Max 5 ambiguities to avoid noise
- Each must reference a specific scope item or be marked as `scope_item_index: -1` for global

---

## Skill 4 — `generate_proposal`

**Job:** Generate the final proposal markdown in Greenscape's voice.

| Field | Value |
|---|---|
| Input | `customer_info`, `priced_items`, `scope_items`, `style_guide`, `historical_examples` |
| Output | `proposal_markdown: string` |
| Model | Claude Sonnet |
| Max tokens | 3,000 |
| Temperature | 0.5 |

**Style guide (loaded as part of prompt):**
- Voice: premium craftsman, confident, warm
- Avoid: corporate language, overpromise, hard-sell
- Embrace: specific references to the customer's project, clear scope, transparent pricing
- Brand position: quality > price; "photographs well"

**Required sections (9, per `docs/06-assumptions.md` Section 3 + `docs/build-process/10-industry-research.md`):**
1. Cover (logo placeholder, "Proposal for [Customer Name]", address, date, proposal #)
2. Greeting / Introduction (warm, name-first, references site walk by date + 1-2 specific observations)
3. Project Overview (1-2 paragraphs scope + optional 1-3 past-project photo placeholders)
4. Detailed Scope & Pricing (line items grouped by category; allowance items distinctly flagged)
5. **Exclusions** (explicit "what's NOT included" — kills dispute pattern)
6. Timeline (start date range, duration, phased milestones)
7. **Warranty** (default: "2-yr workmanship hardscape, 1-yr irrigation, 90-day plant material, manufacturer warranties pass through")
8. Terms & Next Steps (payment schedule from `quotes.payment_schedule` jsonb; default 30/30/30/10; 30-day validity; change order clause)
9. **Signature + License Block** (Customer + Marcus signature lines; **ROC license # is required on AZ contracts**; insurance carrier line)

**Prompt strategy:** Few-shot with 2-3 example proposals (synthetic but representative). Explicit voice instruction (premium craftsman, warm, transparent, no salesy modifiers). Render line items as a clean markdown table grouped by category. Material descriptions stay at category/grade level (e.g., "premium travertine pavers, French pattern"), NOT SKU-locked — reflects design-build phase reality.

**Guardrails:**
- Must include all 9 required sections (validator checks)
- Total in proposal must match sum of `line_total` across `priced_items`
- Customer name must match `customer_info.name`
- No prices appear that aren't in `priced_items`
- Payment schedule percentages must sum to 100
- ROC license # must appear in section 9 (AZ statutory requirement)

---

## Skill 5 — `validate_output`

**Job:** Quality gate before commit. Catches hallucinations, math errors, missing sections.

| Field | Value |
|---|---|
| Input | `proposal_markdown`, `priced_items`, `customer_info` |
| Output | `{ pass: boolean, issues: ValidationIssue[] }` |
| Model | Claude Haiku |
| Max tokens | 800 |
| Temperature | 0.0 |

**Validation checks (combined: deterministic + LLM):**

Deterministic (code, not LLM):
- All 9 required sections present (regex on headers — Cover, Greeting, Project Overview, Detailed Scope & Pricing, Exclusions, Timeline, Warranty, Terms & Next Steps, Signature + License Block)
- Total in proposal matches sum of `priced_items.line_total` exactly
- Customer name appears in cover + greeting
- No line item names appear that aren't in `priced_items`
- ROC license # appears in section 9 (AZ statutory requirement)
- Payment schedule percentages sum to 100

LLM-based:
- Voice/tone matches style guide (warm, premium, no salesy/corporate)
- No factual claims that aren't supported by the input (e.g., specific timelines not derivable)
- No promises about things outside scope

**Output schema:**
```typescript
{
  pass: boolean
  issues: Array<{
    severity: "error" | "warn"
    check: string                // which check failed
    detail: string                // human-readable
    suggested_fix: string | null
  }>
}
```

**Behavior on fail:** Orchestrator constructs corrective prompt and re-runs `generate_proposal` once. If 2nd validation fails, status = `validation_failed`, surface issues to Marcus in admin UI.

---

## Re-prompt logic (after validate_output fails)

```typescript
const correctivePrompt = `
Your previous proposal had these issues:
${issues.map(i => `- ${i.check}: ${i.detail}`).join('\n')}

Re-generate the proposal addressing each issue. Keep all valid content from the previous draft.
`
```

---

## Cost guardrails (orchestrator-level)

- Total per-quote API budget: **$0.50**
- If exceeded mid-flow: log warning, allow once, alert in admin
- Per-call timeout: **30s**
- Max retries per skill: **1**
- If all retries exhausted: status = `validation_failed`, full diagnostic visible in admin

---

## Observability

Every skill call writes to `audit_log`:

```typescript
{
  quote_id: uuid
  skill_name: string
  model: string
  input: jsonb     // truncated to ~5KB
  output: jsonb    // truncated to ~5KB
  input_tokens: number
  output_tokens: number
  cost_usd: number
  duration_ms: number
  success: boolean
  error: string | null
}
```

This enables:
- Per-quote cost analysis (sum cost_usd grouped by quote_id)
- Skill-level latency profiling
- Replay of any quote's reasoning chain (full reproducibility)
- Continuous improvement: identify which skills fail most often

---

## Why these specific skills (not others)

We chose **5 focused skills** over alternatives:

| Alternative | Why rejected |
|---|---|
| Single mega-prompt that does everything | Hard to debug, hard to validate, no observability per step, lower quality on complex tasks |
| 10+ tiny skills (e.g., separate skill per category) | Over-engineered for MVP; orchestration overhead exceeds benefit |
| LLM-as-orchestrator (let Claude decide which skill to call) | Adds latency, cost, and unpredictability; deterministic chain is fine here because the steps don't branch |
| No validate skill | Brief explicitly rewards "guardrails on AI output" — and hallucinated line items would burn trust immediately |

This 5-skill chain is the minimum viable agent that handles the actual job, with explicit guardrails at the only place hallucinations matter (output gate).
