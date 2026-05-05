/**
 * /api/line-items/[id]
 *
 * PATCH — update name, description, category, unit, unit_price, or item_type
 *   of an existing catalog item. Partial — send only what's changing.
 *   Body: Partial<{category, name, description, unit, unit_price, item_type}>
 *   Response: { line_item: LineItem }
 *
 * DELETE — soft delete (sets active=false). Existing quote_line_items keep
 *   their snapshot fields, so historical quotes remain coherent. Future
 *   agent runs won't find the item via lookup_line_items.
 *   Response: { ok: true }
 *
 * Why soft delete: quote_line_items.line_item_id FK references this row.
 * A hard delete on an item already on a quote would either break the FK
 * or cascade-delete history. Snapshot columns (line_item_name_snapshot,
 * unit_price_snapshot) on quote_line_items mean active=false is enough
 * to remove the item from the live catalog without touching history.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { LineItem, LineItemUnit } from "@/lib/types";

export const runtime = "nodejs";

const UNITS: LineItemUnit[] = ["sq_ft", "linear_ft", "each", "zone", "hour", "lump_sum"];

const UpdateLineItemSchema = z
  .object({
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
    item_type: z.enum(["fixed", "allowance", "custom"]),
  })
  .partial();

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateLineItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("line_items")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: error?.code === "PGRST116" ? 404 : 500 },
    );
  }

  return NextResponse.json({ line_item: data as LineItem });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("line_items")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
