/**
 * Skill 1: extract_scope
 *
 * Turns Marcus's freeform site walk notes into a structured `ScopeItem[]`.
 * Sonnet because wrong extraction propagates to every downstream skill.
 *
 * Output is zod-validated. On parse failure the skill performs ONE corrective
 * re-prompt with the parse error attached, then throws if it still fails.
 *
 * Behavior contract:
 * - Each ScopeItem has `certainty: high | medium | low`. `low` items must
 *   carry a `needs_clarification` question that flag_ambiguity will surface
 *   to Marcus.
 * - The skill never invents dimensions. If a quantity is unclear in the
 *   notes, it sets `dimensions: null` and `certainty: low`.
 *
 * Few-shot examples below cover (a) a happy-path detailed note and (b) a
 * deliberately sparse note where the model must surface clarification
 * questions instead of guessing.
 */

import { z } from "zod";
import { callClaude, extractText, parseJsonFromText } from "@/lib/anthropic";
import type { AuditContext } from "@/lib/audit";
import type { ScopeItem } from "@/lib/types";

const CATEGORIES = [
  "patio",
  "pergola",
  "fire_pit",
  "water_feature",
  "artificial_turf",
  "irrigation",
  "outdoor_kitchen",
  "retaining_wall",
  "other",
] as const;

const UNITS = ["sq_ft", "linear_ft", "each", "zone", "hour", "lump_sum"] as const;

const ScopeItemSchema = z.object({
  category: z.enum(CATEGORIES),
  description: z.string().min(1),
  dimensions: z
    .object({
      quantity: z.number().nullable(),
      unit: z.enum(UNITS),
    })
    .nullable(),
  material_notes: z.string().nullable(),
  certainty: z.enum(["high", "medium", "low"]),
  needs_clarification: z.string().nullable(),
});

const OutputSchema = z.object({
  scope_items: z.array(ScopeItemSchema).min(0).max(20),
});

const SYSTEM = `You are a quote-drafting assistant for Greenscape Pro, a Phoenix AZ design-build company specializing in hardscape and landscape.

Your job: turn Marcus's freeform site walk notes into a STRUCTURED list of scope items. Each item must map to one of these categories:
- patio, pergola, fire_pit, water_feature, artificial_turf, irrigation, outdoor_kitchen, retaining_wall, other

For each item:
- description: a short, specific phrase ("travertine paver patio, ~480 sq ft, sand-set")
- dimensions: { quantity, unit } if extractable. unit MUST be one of: sq_ft, linear_ft, each, zone, hour, lump_sum
- material_notes: any specific materials Marcus called out (e.g., "Western red cedar", "75oz turf"). null if none.
- certainty: high if Marcus explicitly stated quantity AND material; medium if either is implied; low if either is missing or ambiguous.
- needs_clarification: when certainty is low, write a SHORT specific question Marcus needs to answer (e.g., "Confirm patio dimensions" or "Cedar vs aluminum pergola?"). null otherwise.

CRITICAL RULES:
- Do NOT invent dimensions. If Marcus didn't say "~400 sq ft", do NOT write a number. Set quantity=null and certainty=low.
- Do NOT invent line items. Extract only what Marcus actually mentioned.
- It's fine to have certainty=low — that's how Marcus knows what to clarify.
- Output STRICT JSON, no commentary, no markdown fences.

OUTPUT SHAPE:
{
  "scope_items": [
    {
      "category": "patio",
      "description": "travertine patio, ~480 sq ft",
      "dimensions": { "quantity": 480, "unit": "sq_ft" },
      "material_notes": "premium travertine, sand tone",
      "certainty": "high",
      "needs_clarification": null
    }
  ]
}`;

const FEW_SHOT: { user: string; assistant: string }[] = [
  {
    user: `Site walk Mon afternoon, Patel residence. They want the existing concrete patio out — it's lifted in two corners, ~320 sq ft. Replace with travertine, sand tone, prob 480 sq ft so we wrap to the side gate. Caliche prep needed. Two pop-ups on the east side need to convert to drip on the new bed. Want a Rachio. Permit through Phoenix.`,
    assistant: JSON.stringify({
      scope_items: [
        {
          category: "patio",
          description: "Existing concrete demo, ~320 sq ft, two corners lifted",
          dimensions: { quantity: 320, unit: "sq_ft" },
          material_notes: null,
          certainty: "high",
          needs_clarification: null,
        },
        {
          category: "patio",
          description: "Travertine paver patio, ~480 sq ft, sand-tone, wrapped to side gate",
          dimensions: { quantity: 480, unit: "sq_ft" },
          material_notes: "premium travertine, sand tone",
          certainty: "high",
          needs_clarification: null,
        },
        {
          category: "patio",
          description: "Caliche-resistant base prep across new patio footprint",
          dimensions: { quantity: 480, unit: "sq_ft" },
          material_notes: null,
          certainty: "high",
          needs_clarification: null,
        },
        {
          category: "irrigation",
          description: "Convert two pop-up zones to drip on new east bed",
          dimensions: { quantity: 2, unit: "zone" },
          material_notes: null,
          certainty: "high",
          needs_clarification: null,
        },
        {
          category: "irrigation",
          description: "Smart Rachio controller",
          dimensions: { quantity: 1, unit: "each" },
          material_notes: "Rachio",
          certainty: "high",
          needs_clarification: null,
        },
        {
          category: "other",
          description: "Phoenix permit pull",
          dimensions: { quantity: 1, unit: "lump_sum" },
          material_notes: null,
          certainty: "high",
          needs_clarification: null,
        },
      ],
    }),
  },
  {
    user: `Quick visit. They want a fire feature and maybe a pergola. Big yard. Maybe putting green for the kid.`,
    assistant: JSON.stringify({
      scope_items: [
        {
          category: "fire_pit",
          description: "Fire feature — type and size unspecified",
          dimensions: null,
          material_notes: null,
          certainty: "low",
          needs_clarification: "Gas vs wood? Round/linear? Approx size?",
        },
        {
          category: "pergola",
          description: "Pergola — material and dimensions unspecified",
          dimensions: null,
          material_notes: null,
          certainty: "low",
          needs_clarification: "Cedar/aluminum/steel? Approx footprint?",
        },
        {
          category: "artificial_turf",
          description: "Putting green — dimensions unspecified",
          dimensions: null,
          material_notes: null,
          certainty: "low",
          needs_clarification: "Approx square footage of putting area?",
        },
      ],
    }),
  },
];

export interface ExtractScopeInput {
  raw_notes: string;
  project_metadata: { project_type?: string; hoa?: boolean; budget_tier?: string };
}

export async function extractScope(
  input: ExtractScopeInput,
  audit: AuditContext,
): Promise<ScopeItem[]> {
  const userPrompt = `Project metadata: ${JSON.stringify(input.project_metadata)}\n\nSite walk notes:\n"""\n${input.raw_notes}\n"""\n\nReturn the structured scope_items JSON object.`;

  const messages = [
    ...FEW_SHOT.flatMap((s) => [
      { role: "user" as const, content: s.user },
      { role: "assistant" as const, content: s.assistant },
    ]),
    { role: "user" as const, content: userPrompt },
  ];

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const call = await callClaude({
      model: "sonnet",
      system: SYSTEM,
      messages,
      max_tokens: 2000,
      temperature: 0.2,
    });

    const raw = extractText(call.message);

    try {
      const parsed = parseJsonFromText<unknown>(raw);
      const validated = OutputSchema.parse(parsed);
      audit.record({
        skill: "extract_scope",
        input,
        output: validated,
        call,
        success: true,
      });
      return validated.scope_items as ScopeItem[];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      audit.record({
        skill: "extract_scope",
        input,
        output: { raw },
        call,
        success: false,
        error: lastError.message,
      });
      // One corrective retry — append an explicit instruction.
      messages.push(
        { role: "assistant", content: raw },
        {
          role: "user",
          content: `Your previous response did not parse against the required schema (${lastError.message}). Re-output ONLY the JSON object matching the shape shown in the system prompt — no markdown fences, no commentary.`,
        },
      );
    }
  }

  throw new Error(`extract_scope failed after retry: ${lastError?.message ?? "unknown"}`);
}
