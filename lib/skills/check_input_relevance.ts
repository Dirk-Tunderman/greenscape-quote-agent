/**
 * Skill 0: check_input_relevance — pre-flight gate before the expensive chain.
 *
 * Cheapest possible defense against accidental garbage input (wrong text
 * pasted, mom conversation, recipe, lorem ipsum, etc.). Runs BEFORE we burn
 * any Sonnet tokens or create a quote row.
 *
 * Haiku, T=0.0, max ~250 tokens → ~$0.001 per call. Net positive after
 * catching just 1 in 100 misfires (saves ~$0.10 per catch).
 *
 * Decision logic in the orchestrator:
 *   is_relevant=true  → proceed normally
 *   is_relevant=false AND confidence=high  → throw InputRejectedError → API 400
 *   confidence=medium → proceed but the reason is logged in audit_log
 *
 * The skill DOES NOT block sparse-but-relevant inputs — extract_scope's
 * __no_scope exit handles those. This skill specifically catches "wrong
 * content type" (the brief's "click outside the happy path" failure mode).
 */

import { z } from "zod";
import { callClaude, extractText, parseJsonFromText } from "@/lib/anthropic";
import type { AuditContext } from "@/lib/audit";

const RelevanceSchema = z.object({
  is_relevant: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
  detected_content: z.enum([
    "site_walk_notes",
    "personal_conversation",
    "recipe_or_instructions",
    "unrelated_text",
    "too_sparse",
    "non_english",
    "lorem_ipsum_or_test",
    "other",
  ]),
});

export type RelevanceResult = z.infer<typeof RelevanceSchema>;

export interface CheckInputRelevanceInput {
  raw_notes: string;
  project_type: string;
}

const SYSTEM = `You are a quick gate-check on the input to a residential outdoor construction quote drafting system. Your ONLY job: determine whether the provided text is plausibly notes from a site walk for a hardscape/landscape project (patios, pergolas, fire pits, water features, turf, irrigation, outdoor kitchens, retaining walls).

Return JSON only, no commentary, no markdown fences.

WHAT COUNTS AS RELEVANT (return is_relevant=true):
- Notes describing scope: any of the above categories, with or without dimensions
- Mentions of materials, customer preferences, budget hints, timeline, HOA
- Sparse but topical attempts ("Backyard. Pergola maybe. Customer wants nice.") — these are valid sparse notes; downstream skills will surface ambiguities
- Notes in any reasonable format (paragraph, bullets, abbreviated shorthand)

WHAT IS NOT RELEVANT (return is_relevant=false):
- Personal conversations (e.g., "Hi Mom! Picked up the milk you wanted...")
- Recipes or instructions for non-construction tasks
- Lorem ipsum, "test test test", random gibberish
- Pure customer info with no project description at all
- Text in a language other than English (mark detected_content="non_english")
- Single words or trivially short input that says nothing about a project

OUTPUT SHAPE:
{
  "is_relevant": true|false,
  "confidence": "high" | "medium" | "low",
  "reason": "<one short sentence stating WHY>",
  "detected_content": "site_walk_notes" | "personal_conversation" | "recipe_or_instructions" | "unrelated_text" | "too_sparse" | "non_english" | "lorem_ipsum_or_test" | "other"
}

CONFIDENCE GUIDE:
- high: clearly relevant or clearly not (a recipe, a mom conversation, lorem ipsum → high not-relevant)
- medium: ambiguous but leans one way (sparse but topical → medium relevant; one mention of "backyard" with otherwise unrelated content → medium not-relevant)
- low: genuinely unclear; let it through for the downstream skills to handle

EXAMPLES:

Input: "Site walk Mon morning — Claire wants travertine patio replacing existing concrete slab, ~16x20."
Output: {"is_relevant":true,"confidence":"high","reason":"Clear site walk notes with project, dimensions, and materials.","detected_content":"site_walk_notes"}

Input: "Hi Mom, picked up the milk. Recipe is butter, flour, eggs. Love you."
Output: {"is_relevant":false,"confidence":"high","reason":"Personal conversation, not a site walk.","detected_content":"personal_conversation"}

Input: "Patio. Pergola maybe. Customer wants nice."
Output: {"is_relevant":true,"confidence":"medium","reason":"Sparse but mentions hardscape categories — downstream skills will surface ambiguities.","detected_content":"site_walk_notes"}

Input: "asdkjfh asdkjfh test test"
Output: {"is_relevant":false,"confidence":"high","reason":"Gibberish/test placeholder text.","detected_content":"lorem_ipsum_or_test"}`;

export async function checkInputRelevance(
  input: CheckInputRelevanceInput,
  audit: AuditContext,
): Promise<RelevanceResult> {
  const userPrompt = `Project type label: "${input.project_type || "(unspecified)"}"\n\nText to evaluate:\n"""\n${input.raw_notes}\n"""\n\nReturn the JSON.`;

  const call = await callClaude({
    model: "haiku",
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 250,
    temperature: 0.0,
  });

  const raw = extractText(call.message);

  let parsed: RelevanceResult;
  try {
    parsed = RelevanceSchema.parse(parseJsonFromText(raw));
  } catch (err) {
    // If the relevance check itself fails to parse, FAIL OPEN (let the
    // downstream skills handle it). Don't block the flow on a meta-skill bug.
    audit.record({
      skill: "check_input_relevance",
      input,
      output: { raw, parse_error: err instanceof Error ? err.message : String(err) },
      call,
      success: false,
      error: `parse_failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return {
      is_relevant: true,
      confidence: "low",
      reason: "Relevance check parse failed — failing open, letting downstream skills evaluate.",
      detected_content: "other",
    };
  }

  audit.record({
    skill: "check_input_relevance",
    input,
    output: parsed,
    call,
    success: true,
  });

  return parsed;
}
