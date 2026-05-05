/**
 * Skill 3: flag_ambiguity
 *
 * Reads the raw notes + extracted scope + priced items and surfaces the
 * specific clarifying questions Marcus should resolve before the quote
 * goes to the customer. Haiku because this is classification-style work
 * and we want noise control, not generation quality.
 *
 * Output is `Ambiguity[]` capped at 5 — a noisy ambiguity list is useless.
 *
 * Soft-fail: if the LLM output doesn't parse, the skill returns `[]` rather
 * than failing the run. An ambiguity list is helpful but not load-bearing —
 * the proposal can still go out, Marcus just loses the heads-up.
 *
 * Severity grades:
 * - "blocker"  — must resolve before sending
 * - "warn"     — should review
 * - "info"     — FYI
 *
 * Verified ambiguities from integration tests:
 * - Patel: travertine finish/thickness (blocker), caliche depth (warn),
 *   drip layout (warn)
 * - Chen: gas trench length (blocker), Scottsdale-vs-Phoenix permit (blocker),
 *   kitchen unit composition (warn)
 */

import { z } from "zod";
import { callClaude, extractText, parseJsonFromText } from "@/lib/anthropic";
import type { AuditContext } from "@/lib/audit";
import type { Ambiguity, QuoteLineItem, ScopeItem } from "@/lib/types";

const AmbiguitySchema = z.object({
  scope_item_index: z.number().int(),
  question: z.string().min(1),
  why_it_matters: z.string().min(1),
  severity: z.enum(["blocker", "warn", "info"]),
});

const OutputSchema = z.object({
  ambiguities: z.array(AmbiguitySchema).max(5),
});

const SYSTEM = `You are reviewing a draft quote for Marcus Tate at Greenscape Pro. You will be given:
1. The site walk notes (raw_notes)
2. The structured scope items extracted from those notes
3. The line items priced from the catalog

Your job: identify what Marcus needs to clarify before this quote is sent. Examples of legitimate ambiguities:
- Missing dimensions in the notes (assumed values)
- Material choice unclear (e.g., "pergola" but not "cedar vs aluminum")
- Vague or missing timeline
- Items that look custom and need Marcus's pricing
- Major scope items in the notes that didn't make it into the priced items
- Quantities that seem too high or low for the project type

CRITICAL RULES:
- Output AT MOST 5 ambiguities. Pick the highest-impact ones — a noisy ambiguity list is useless.
- If something is fine and Marcus can send confidently, return an empty array.
- Severity: "blocker" = must resolve before send, "warn" = should review, "info" = FYI.
- scope_item_index = 0-based index into the provided scope_items array, or -1 for project-level.
- Output STRICT JSON, no commentary, no markdown fences.

OUTPUT SHAPE:
{
  "ambiguities": [
    {
      "scope_item_index": 1,
      "question": "Cedar or aluminum pergola?",
      "why_it_matters": "Cedar is ~$1,600 more on a 12x12; affects the project total.",
      "severity": "blocker"
    }
  ]
}`;

export interface FlagAmbiguityInput {
  raw_notes: string;
  scope_items: ScopeItem[];
  priced_items: QuoteLineItem[];
  custom_item_requests: { source_scope_item_index: number; description: string; reason: string }[];
}

export async function flagAmbiguity(
  input: FlagAmbiguityInput,
  audit: AuditContext,
): Promise<Ambiguity[]> {
  const userPrompt = [
    `RAW NOTES:\n"""\n${input.raw_notes}\n"""`,
    `\nSCOPE ITEMS:\n${JSON.stringify(input.scope_items, null, 2)}`,
    `\nPRICED ITEMS:\n${JSON.stringify(
      input.priced_items.map((p) => ({
        line_item_name: p.line_item_name_snapshot,
        category: p.category,
        quantity: p.quantity,
        unit: p.unit,
        line_total: p.line_total,
      })),
      null,
      2,
    )}`,
    input.custom_item_requests.length > 0
      ? `\nCUSTOM ITEM REQUESTS (need Marcus's pricing):\n${JSON.stringify(
          input.custom_item_requests,
          null,
          2,
        )}`
      : "",
    "\nReturn the ambiguities JSON object.",
  ].join("");

  const call = await callClaude({
    model: "haiku",
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 800,
    temperature: 0.3,
  });

  const raw = extractText(call.message);
  try {
    const parsed = OutputSchema.parse(parseJsonFromText(raw));
    audit.record({
      skill: "flag_ambiguity",
      input: { scope_count: input.scope_items.length, priced_count: input.priced_items.length },
      output: parsed,
      call,
      success: true,
    });
    return parsed.ambiguities as Ambiguity[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    audit.record({
      skill: "flag_ambiguity",
      input,
      output: { raw },
      call,
      success: false,
      error: msg,
    });
    // Soft fail — empty ambiguities is acceptable for this skill
    return [];
  }
}
