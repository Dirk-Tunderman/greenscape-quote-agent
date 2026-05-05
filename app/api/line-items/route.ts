/**
 * /api/line-items
 *
 * GET — read-only catalog for /admin/line-items.
 *   Returns active items only, ordered by category then unit_price.
 *   Response: { line_items: LineItem[] }
 *
 * POST — manually add a new line item to the catalog.
 *   Newly inserted items become immediately available to the agent —
 *   `match_pricing` queries the live `greenscape.line_items` table on
 *   every run, so no skill/prompt change is needed for the LLM to use them.
 *   Categories are constrained by the `greenscape.line_item_category` enum;
 *   adding a NEW category requires a migration (deferred to Phase 2 — see
 *   docs/15-future-extensions.md).
 *   Body: { category, name, description, unit, unit_price, item_type? }
 *   Response: { line_item: LineItem }
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { LineItem, LineItemUnit } from "@/lib/types";

export const runtime = "nodejs";

const UNITS: LineItemUnit[] = ["sq_ft", "linear_ft", "each", "zone", "hour", "lump_sum"];

// Category is free-form text post-D39 so Marcus can add new categories
// at runtime. We snake_case-normalize on insert (e.g., "Outdoor Lighting"
// → "outdoor_lighting") so categories stay consistent with the seeded set
// and the UI grouping behaves predictably.
const CreateLineItemSchema = z.object({
  category: z
    .string()
    .trim()
    .min(2, "Category is required")
    .max(40, "Category too long")
    .transform((s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""),
    )
    .refine((s) => s.length >= 2, "Category is required"),
  name: z.string().trim().min(2, "Name is required"),
  description: z.string().trim().min(2, "Description is required"),
  unit: z.enum([...UNITS] as [LineItemUnit, ...LineItemUnit[]]),
  unit_price: z.coerce.number().nonnegative("Unit price must be ≥ 0"),
  item_type: z.enum(["fixed", "allowance", "custom"]).default("fixed"),
});

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("line_items")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("unit_price");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ line_items: (data ?? []) as LineItem[] });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateLineItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("line_items")
    .insert({
      category: parsed.data.category,
      name: parsed.data.name,
      description: parsed.data.description,
      unit: parsed.data.unit,
      unit_price: parsed.data.unit_price,
      item_type: parsed.data.item_type,
      active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ line_item: data as LineItem }, { status: 201 });
}
