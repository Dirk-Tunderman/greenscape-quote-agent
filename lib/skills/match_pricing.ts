import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { callClaude, parseJsonFromText } from "@/lib/anthropic";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { AuditContext } from "@/lib/audit";
import type {
  ItemCategory,
  LineItem,
  LineItemUnit,
  QuoteLineItem,
  ScopeItem,
} from "@/lib/types";

const CATEGORIES: ItemCategory[] = [
  "patio",
  "pergola",
  "fire_pit",
  "water_feature",
  "artificial_turf",
  "irrigation",
  "outdoor_kitchen",
  "retaining_wall",
  "universal",
];

const PricedItemSchema = z.object({
  line_item_id: z.string().uuid(),
  line_item_name: z.string(),
  category: z.enum([...CATEGORIES] as [ItemCategory, ...ItemCategory[]]),
  unit: z.enum(["sq_ft", "linear_ft", "each", "zone", "hour", "lump_sum"]),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  line_total: z.number().nonnegative(),
  notes: z.string(),
  // -1 (or null) indicates a project-level item like permits/cleanup that doesn't
  // map to a specific scope item index.
  source_scope_item_index: z
    .union([z.number().int(), z.null()])
    .transform((v) => (v == null ? -1 : v)),
});

const CustomItemRequestSchema = z.object({
  source_scope_item_index: z
    .union([z.number().int(), z.null()])
    .transform((v) => (v == null ? -1 : v))
    .default(-1),
  description: z.string().default(""),
  reason: z.string().default(""),
});

const OutputSchema = z.object({
  priced_items: z.array(PricedItemSchema),
  custom_item_requests: z.array(CustomItemRequestSchema).default([]),
});

const SYSTEM = `You are pricing a quote for Greenscape Pro using their priced catalog. You will be given an array of structured scope items. For each one, call the lookup_line_items tool to find matching catalog rows, then return a JSON object with priced_items (and optionally custom_item_requests for things not in the catalog).

CRITICAL RULES:
1. You MUST call lookup_line_items at least once for each scope item that has a category other than "other".
2. Return ONLY catalog line_item_ids you actually saw from a tool result. NEVER invent UUIDs or item names.
3. line_total MUST equal quantity * unit_price exactly.
4. If quantity is missing in the scope item but the catalog item is an "each" or "lump_sum" unit, default to quantity=1.
5. If a scope item references something not in the catalog (e.g., a custom feature), put it in custom_item_requests with a clear description; do NOT fake a price.
6. For each pour-of-base-prep, drainage, demo, or supporting item that is part of a project step, include the corresponding catalog item with the same quantity as the parent step (e.g., "caliche-resistant base prep" matches the patio sq_ft).
7. Always include "Phoenix permit pull" (lump_sum) and "Final cleanup + haul" (lump_sum) once per project.
8. ALWAYS finish by emitting the final JSON object with no markdown fences, no commentary.

OUTPUT SHAPE:
{
  "priced_items": [
    {
      "line_item_id": "<catalog UUID from a tool result>",
      "line_item_name": "<catalog name from the same tool result>",
      "category": "patio",
      "unit": "sq_ft",
      "quantity": 480,
      "unit_price": 22.00,
      "line_total": 10560.00,
      "notes": "Travertine patio matched to scope item 1",
      "source_scope_item_index": 1
    }
  ],
  "custom_item_requests": []
}`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "lookup_line_items",
    description:
      "Search the priced catalog for line items in a given category, fuzzy-matching on name + description. Returns up to 10 candidates with id, name, description, unit, unit_price.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: CATEGORIES,
          description: "Category to search within. Use 'universal' for permits, cleanup, PM overhead.",
        },
        search_terms: {
          type: "string",
          description:
            "Free-text search (matches against name and description). E.g. 'travertine' or 'cedar pergola'.",
        },
      },
      required: ["category", "search_terms"],
    },
  },
];

interface CatalogMatch {
  id: string;
  name: string;
  description: string;
  unit: LineItemUnit;
  unit_price: number;
}

async function lookupLineItems(category: string, search: string): Promise<CatalogMatch[]> {
  const supabase = getSupabaseAdmin();

  // First try ILIKE on name OR description; fallback to category-only if empty.
  const term = `%${search.replace(/[%_]/g, "")}%`;
  const { data, error } = await supabase
    .from("line_items")
    .select("id,name,description,unit,unit_price")
    .eq("category", category as ItemCategory)
    .eq("active", true)
    .or(`name.ilike.${term},description.ilike.${term}`)
    .limit(10);

  if (error) throw new Error(`lookup_line_items query failed: ${error.message}`);

  if (data && data.length > 0) {
    return data as CatalogMatch[];
  }

  // Fallback: return all in-category items if no fuzzy match.
  const fallback = await supabase
    .from("line_items")
    .select("id,name,description,unit,unit_price")
    .eq("category", category as ItemCategory)
    .eq("active", true)
    .limit(10);
  if (fallback.error) throw new Error(`lookup_line_items fallback failed: ${fallback.error.message}`);
  return (fallback.data ?? []) as CatalogMatch[];
}

export interface MatchPricingInput {
  scope_items: ScopeItem[];
}

export interface MatchPricingResult {
  priced_items: QuoteLineItem[];
  custom_item_requests: { source_scope_item_index: number; description: string; reason: string }[];
}

export async function matchPricing(
  input: MatchPricingInput,
  audit: AuditContext,
): Promise<MatchPricingResult> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Scope items to price (indices are 0-based):\n${JSON.stringify(input.scope_items, null, 2)}\n\nUse lookup_line_items as needed, then return the final JSON object with priced_items and custom_item_requests.`,
    },
  ];

  // Conversation loop with tool use. Cap iterations to prevent runaway loops.
  const MAX_ITERATIONS = 10;
  let lastCall = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const call = await callClaude({
      model: "sonnet",
      system: SYSTEM,
      messages,
      max_tokens: 4000,
      temperature: 0.1,
      tools: TOOLS,
    });
    lastCall = call;

    audit.record({
      skill: "match_pricing",
      input: { iteration: i, messageCount: messages.length },
      output: { stop_reason: call.message.stop_reason, content: call.message.content },
      call,
      success: true,
    });

    if (call.message.stop_reason === "tool_use") {
      const toolUses = call.message.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      messages.push({ role: "assistant", content: call.message.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (tu.name !== "lookup_line_items") {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Unknown tool: ${tu.name}`,
            is_error: true,
          });
          continue;
        }
        const args = tu.input as { category: string; search_terms: string };
        try {
          const matches = await lookupLineItems(args.category, args.search_terms ?? "");
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(matches),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: err instanceof Error ? err.message : String(err),
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Stop reason should be end_turn — extract JSON.
    const textBlocks = call.message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    let parsed: z.infer<typeof OutputSchema>;
    try {
      parsed = OutputSchema.parse(parseJsonFromText(textBlocks));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      audit.record({
        skill: "match_pricing",
        input: { final_attempt: true },
        output: { raw: textBlocks },
        call,
        success: false,
        error: `Final JSON parse failed: ${msg}`,
      });
      throw new Error(`match_pricing JSON parse failed: ${msg}`);
    }

    // Snapshot into QuoteLineItem shape (db-shaped, with empty quote_id).
    const priced_items: QuoteLineItem[] = parsed.priced_items.map((p) => ({
      id: "", // assigned by DB
      quote_id: "",
      line_item_id: p.line_item_id,
      line_item_name_snapshot: p.line_item_name,
      category: p.category,
      unit: p.unit,
      quantity: p.quantity,
      unit_price_snapshot: p.unit_price,
      line_total: Math.round(p.quantity * p.unit_price * 100) / 100,
      notes: p.notes,
    }));

    return { priced_items, custom_item_requests: parsed.custom_item_requests };
  }

  throw new Error(
    `match_pricing did not converge in ${MAX_ITERATIONS} iterations (last stop_reason=${lastCall?.message.stop_reason ?? "unknown"})`,
  );
}

/** Verify line_item_ids exist in the catalog. Returns the IDs that DON'T exist. */
export async function verifyCatalogIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("line_items")
    .select("id")
    .in("id", ids);
  if (error) throw new Error(`verifyCatalogIds failed: ${error.message}`);
  const valid = new Set((data ?? []).map((r) => r.id as string));
  return ids.filter((id) => !valid.has(id));
}

export type CatalogLookup = (category: ItemCategory, search: string) => Promise<LineItem[]>;
