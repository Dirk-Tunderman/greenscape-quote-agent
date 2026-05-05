/**
 * GET /api/quotes — list quotes ordered newest first (cap 200).
 *
 * Query: ?status=<QuoteStatus>  (optional filter)
 *
 * Response: { quotes: QuoteSummary[] }
 *
 * Notes:
 * - Joins customers (id, name, email) for the table view
 * - Supabase nested-select returns customer as either object or array;
 *   we normalise to a single object client-side
 * - Used by /quotes (Chat B's list page)
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { QuoteSummary } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase
    .from("quotes")
    .select(
      "id, project_type, status, total_amount, needs_render, total_cost_usd, created_at, sent_at, customer:customers(id, name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summaries: QuoteSummary[] = (data ?? []).map((row) => {
    // Supabase nested-select returns `customer` as either an array or a single object
    // depending on relationship cardinality; normalise here.
    const rawCustomer = (row as { customer: unknown }).customer;
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;
    const c = customer as { id: string; name: string; email: string } | null | undefined;
    return {
      id: row.id as string,
      customer_name: c?.name ?? "(unknown)",
      customer_email: c?.email ?? "",
      project_type: (row as { project_type: string }).project_type,
      status: (row as { status: QuoteSummary["status"] }).status,
      total_amount: Number((row as { total_amount: number }).total_amount),
      needs_render: (row as { needs_render: boolean }).needs_render,
      total_cost_usd: Number((row as { total_cost_usd: number }).total_cost_usd),
      created_at: (row as { created_at: string }).created_at,
      sent_at: (row as { sent_at: string | null }).sent_at ?? null,
    };
  });

  return NextResponse.json({ quotes: summaries });
}
