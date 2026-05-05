/**
 * GET /api/line-items — read-only catalog for /admin/line-items.
 *
 * Returns active items only, ordered by category then unit_price.
 * Response: { line_items: LineItem[] }
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { LineItem } from "@/lib/types";

export const runtime = "nodejs";

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
