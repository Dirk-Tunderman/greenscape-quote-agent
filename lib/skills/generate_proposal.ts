/**
 * Skill 4: generate_proposal
 *
 * Writes the customer-facing proposal markdown in Marcus's voice. Sonnet
 * with two few-shot examples from data/historical-proposals.json.
 *
 * Output is a single Markdown document with 8 H2 sections (see system
 * prompt). The markdown is the canonical edit surface in the admin UI;
 * the PDF template (lib/pdf/template.tsx) renders the SAME structured
 * data into a branded PDF independently.
 *
 * Voice (per docs/06-assumptions.md #4 + research D27):
 * - Premium craftsman, warm not corporate, specific to the project
 * - Greeting MUST reference site walk by date + 1-2 specific observations
 *   from raw_notes (validates: a generic "thanks for reaching out" is
 *   caught by the LLM voice check in validate_output)
 * - No salesy modifiers ("amazing", "stunning", "premium experience")
 * - Allowance items flagged "(allowance)" in the pricing table
 *
 * Math contract:
 * - Project Total in the markdown MUST equal the sum of priced_items.line_total
 *   exactly (validate_output enforces deterministically)
 * - Payment schedule percentages MUST sum to 100
 *
 * Retry path:
 * - If validate_output fails on the first attempt, the orchestrator calls
 *   this skill again with `corrective_feedback` listing the specific issues.
 *   The model is told to keep valid content from the previous draft and
 *   only address the issues.
 */

import { callClaude, extractText } from "@/lib/anthropic";
import type { AuditContext } from "@/lib/audit";
import {
  DEFAULT_PAYMENT_SCHEDULE,
  type Customer,
  type PaymentScheduleItem,
  type QuoteLineItem,
  type ScopeItem,
} from "@/lib/types";
import historicalProposals from "@/data/historical-proposals.json";

const STYLE_GUIDE = `VOICE — Greenscape Pro proposal copy:
- Premium craftsman: confident in the work, specific in the details
- Warm, NOT corporate: speak to the customer, not at them
- Specific to THIS project: greeting MUST reference the site walk by date and 1-2 specific observations from the raw notes (e.g., "the slab lifted in two corners", "the citrus grove on the south side")
- Material descriptions stay at category/grade level (e.g., "premium travertine pavers, sand-tone, French pattern") — NOT SKU-locked. Reflects design-build phase reality (Day-1 spec changes are normal).
- Transparent on pricing: no hidden fees, no markup obfuscation. Allowances called out clearly as "allowance".
- No hard-sell: no urgency tactics, no discounts framed as favors
- No salesy modifiers: AVOID "amazing", "stunning", "perfect", "premium experience", "world-class"
- Phoenix-aware: caliche, heat, HOA — call them out where relevant in the scope summary
- Marcus's voice on the close: direct, friendly, "any questions, call me directly"

REQUIRED SECTIONS — output as a single Markdown document:

1. # Proposal — H1
2. ## "{Customer Name} · {Project Address}" — H2
3. Greeting paragraph (1 short paragraph, references the site walk by date + 1-2 specific observations)
4. ## Project Overview — 1-2 paragraphs of plain-English scope summary (key materials at category/grade level, special considerations like caliche/HOA). DESCRIBES ONLY ITEMS THAT ARE PRICED. Do NOT describe items that are in custom_item_requests anywhere in this proposal.
5. ## Detailed Scope & Pricing — Markdown table grouped by category with columns: Description | Qty | Unit | Unit Price | Line Total. Allowance items must be flagged "(allowance)" in the Description column.
6. **Project Total: $X,XXX.XX** — bold line right after the table
7. ## Exclusions — bulleted list of what is NOT included (kills dispute risk).
8. ## Timeline — short paragraph (start window, duration, phased milestones, 7-hour Phoenix-heat workdays)
9. ## Warranty — bullet list with default: "2-year workmanship on hardscape; 1-year on irrigation; 90-day on plant material; manufacturer warranties pass through."
10. ## Terms & Next Steps — payment schedule (use the per-quote schedule provided; default 50/50), 30-day proposal validity, change-order clause
11. ## Signature — Customer signature line + Marcus signature line, then closing "— Marcus Tate, Greenscape Pro"`;

const SYSTEM = `You write proposal copy for Greenscape Pro in Marcus Tate's voice. You will be given:
- Customer info (name, address, project type)
- Site walk notes (raw_notes) including the date of the walk
- Structured scope items
- Priced items (line items with quantities and prices from the catalog; some may be allowance items)
- Payment schedule (per-quote, default 30/30/30/10)
- The style guide and required sections

OUTPUT: a single Markdown document, ready to render to PDF. No commentary, no JSON wrapper, no markdown fences — just the proposal Markdown directly.

CRITICAL RULES:
- Project Total MUST equal the sum of all line_total values across priced_items, exactly. No rounding.
- ONLY use prices, quantities, and item names from the priced_items array. Do not invent any.
- Customer name MUST appear in the H2 heading and greeting.
- Greeting paragraph MUST reference the site walk by date AND 1-2 specific observations from raw_notes.
- All required sections (## headings) must be present (except "Items Requiring Custom Pricing" which is conditional).
- Allowance items must be flagged "(allowance)" in the Description column.
- Payment schedule percentages MUST sum to 100. Use the per-quote schedule provided (default 50/50).

CUSTOM ITEMS — STRICT INTERNAL-ONLY BOUNDARY:
- The user prompt may include a "custom_item_requests" array. These are scope items the customer mentioned that fell outside the catalog and need Marcus's manual pricing.
- These items are INTERNAL TO MARCUS — they are NOT visible to the customer in the proposal. The proposal stays clean: it describes only what's priced, and only what's explicitly excluded. Marcus follows up with the customer separately about anything in custom_item_requests.
- DO NOT describe items in custom_item_requests anywhere in the proposal — not in Project Overview, not in Detailed Scope, not in Exclusions, not in Timeline. Pretend they don't exist for the purpose of writing this document.
- This is the most common cause of validation failure: a customer mentions gas lines, electrical work, or specialty items, the agent describes them in Project Overview as part of the build, but they're not in priced_items. That creates a contradiction. Solution: just don't mention them. Marcus has the list separately.
- The Project Overview describes what's BEING DELIVERED IN THIS QUOTE. If something isn't priced, it's not in this quote.

${STYLE_GUIDE}`;

interface HistoricalProposal {
  title: string;
  summary: string;
  voice_notes: string;
  markdown: string;
}

export interface GenerateProposalInput {
  customer: Customer;
  project_type: string;
  raw_notes: string;
  scope_items: ScopeItem[];
  priced_items: QuoteLineItem[];
  custom_item_requests: { source_scope_item_index: number; description: string; reason: string }[];
  payment_schedule?: PaymentScheduleItem[];
  /** Optional corrective feedback from a failed validate_output, used on retry. */
  corrective_feedback?: string | null;
}

export interface GenerateProposalOutput {
  proposal_markdown: string;
  total_amount: number;
}

export async function generateProposal(
  input: GenerateProposalInput,
  audit: AuditContext,
): Promise<GenerateProposalOutput> {
  const total = Math.round(input.priced_items.reduce((sum, p) => sum + p.line_total, 0) * 100) / 100;
  const schedule = input.payment_schedule ?? DEFAULT_PAYMENT_SCHEDULE;

  const fewShot = (historicalProposals as HistoricalProposal[])
    .slice(0, 2)
    .map(
      (h, i) =>
        `EXAMPLE ${i + 1} — ${h.title}\n(voice notes: ${h.voice_notes})\n\n${h.markdown}\n\n---`,
    )
    .join("\n\n");

  const userPrompt = [
    `Customer:\n${JSON.stringify(input.customer, null, 2)}`,
    `\nProject type: ${input.project_type || "(unspecified)"}`,
    `\nRaw site walk notes (first line typically has date — quote it in greeting):\n"""\n${input.raw_notes}\n"""`,
    `\nScope items (for context — drive the prose):\n${JSON.stringify(input.scope_items, null, 2)}`,
    `\nPriced items (use EXACTLY these for the pricing table):\n${JSON.stringify(
      input.priced_items.map((p) => ({
        line_item_name: p.line_item_name_snapshot,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        unit_price: p.unit_price_snapshot,
        line_total: p.line_total,
        notes: p.notes,
      })),
      null,
      2,
    )}`,
    `\nProject Total (must match the sum at the bottom): $${total.toFixed(2)}`,
    `\nPayment schedule (must sum to 100%):\n${JSON.stringify(schedule)}`,
    input.custom_item_requests.length > 0
      ? `\nCustom item requests (FOR MARCUS'S INTERNAL AWARENESS ONLY — surfaced to him via the admin UI, NOT included in this customer-facing proposal. Do NOT mention these items anywhere in the proposal you generate; pretend they aren't here):\n${JSON.stringify(input.custom_item_requests, null, 2)}`
      : "",
    `\n\nFor reference, here are 2 examples of proposals in the right voice:\n\n${fewShot}\n\nNow write THIS proposal as a complete Markdown document with all required sections from the system prompt.`,
    input.corrective_feedback
      ? `\n\nCORRECTIVE FEEDBACK FROM PREVIOUS ATTEMPT — fix these specific issues:\n${input.corrective_feedback}\nKeep all valid content from the previous draft; address each issue.`
      : "",
  ].join("");

  const call = await callClaude({
    model: "sonnet",
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 3500,
    temperature: 0.5,
  });

  const markdown = extractText(call.message).trim();

  audit.record({
    skill: "generate_proposal",
    input: {
      customer_name: input.customer.name,
      priced_count: input.priced_items.length,
      total_expected: total,
      retry: !!input.corrective_feedback,
    },
    output: { length: markdown.length },
    call,
    success: markdown.length > 0,
  });

  return { proposal_markdown: markdown, total_amount: total };
}
