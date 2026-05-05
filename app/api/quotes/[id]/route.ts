/**
 * GET /api/quotes/[id] — full QuoteDetail for the review/edit page.
 *
 * Response: QuoteDetail = {
 *   quote, customer, line_items[], artifacts: {scope, ambiguities, validation},
 *   audit_log[]
 * }
 *
 * Reads in parallel: quote row, line items, artifacts, audit log. Then a
 * second roundtrip for the customer (id from the quote).
 *
 * 404 if quote not found.
 *
 *
 * PATCH /api/quotes/[id] — apply Marcus's edits.
 *
 * Body: any subset of {
 *   proposal_markdown?, outcome_notes?, status?, line_items?
 * }
 *
 * Behavior:
 * - line_items: full replacement (drop existing rows, insert new). Each row's
 *   line_total is recomputed server-side as quantity * unit_price_snapshot
 *   so the client can't desync the math.
 * - total_amount on the quote row is always recomputed from current line items
 * - status: setting to accepted|rejected|lost auto-stamps outcome_at
 * - proposal_markdown: stored as-is (Marcus's edit is canonical)
 *
 * Used by Chat B's /quotes/[id] inline-edit table + proposal markdown
 * editor + outcome panel.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { Ambiguity, AuditLogEntry, Customer, Quote, QuoteDetail, QuoteLineItem, ScopeItem, ValidationResult } from "@/lib/types";

export const runtime = "nodejs";

interface ParamCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: ParamCtx) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  const [{ data: q, error: qe }, lines, artifacts, audit] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).single(),
    supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", id)
      .order("created_at"),
    supabase.from("quote_artifacts").select("artifact_type, payload").eq("quote_id", id),
    supabase
      .from("audit_log")
      .select(
        "id, quote_id, skill_name, model, input_tokens, output_tokens, cost_usd, duration_ms, success, error, created_at",
      )
      .eq("quote_id", id)
      .order("created_at"),
  ]);

  if (qe || !q) {
    return NextResponse.json({ error: qe?.message ?? "not found" }, { status: 404 });
  }

  const { data: customer } = await supabase.from("customers").select("*").eq("id", (q as Quote).customer_id).single();

  const artMap = (artifacts.data ?? []).reduce<Record<string, unknown>>((acc, row) => {
    acc[(row as { artifact_type: string }).artifact_type] = (row as { payload: unknown }).payload;
    return acc;
  }, {});

  const detail: QuoteDetail = {
    quote: q as Quote,
    customer: (customer ?? {
      id: "",
      name: "(missing)",
      email: "",
      phone: null,
      address: "",
      created_at: new Date().toISOString(),
    }) as Customer,
    line_items: (lines.data ?? []) as QuoteLineItem[],
    artifacts: {
      scope: (artMap.scope as ScopeItem[]) ?? [],
      ambiguities: (artMap.ambiguities as Ambiguity[]) ?? [],
      validation: (artMap.validation_result as ValidationResult) ?? null,
    },
    audit_log: (audit.data ?? []) as AuditLogEntry[],
  };

  return NextResponse.json(detail);
}

const PatchBodySchema = z.object({
  proposal_markdown: z.string().optional(),
  outcome_notes: z.string().nullable().optional(),
  status: z
    .enum([
      "drafting",
      "draft_ready",
      "validation_failed",
      "sending",
      "sent",
      "accepted",
      "rejected",
      "lost",
    ])
    .optional(),
  line_items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        line_item_id: z.string().uuid().nullable().optional(),
        line_item_name_snapshot: z.string(),
        category: z.enum([
          "patio",
          "pergola",
          "fire_pit",
          "water_feature",
          "artificial_turf",
          "irrigation",
          "outdoor_kitchen",
          "retaining_wall",
          "universal",
        ]),
        unit: z.enum(["sq_ft", "linear_ft", "each", "zone", "hour", "lump_sum"]),
        quantity: z.number().positive(),
        unit_price_snapshot: z.number().nonnegative(),
        line_total: z.number().nonnegative(),
        notes: z.string().default(""),
      }),
    )
    .optional(),
});

export async function PATCH(req: Request, ctx: ParamCtx) {
  const { id } = await ctx.params;
  let body: z.infer<typeof PatchBodySchema>;
  try {
    body = PatchBodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", detail: err instanceof z.ZodError ? err.issues : String(err) },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Replace line items if provided (drop + insert; simpler than diffing for an MVP).
  if (body.line_items) {
    const { error: delErr } = await supabase.from("quote_line_items").delete().eq("quote_id", id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    if (body.line_items.length > 0) {
      const rows = body.line_items.map((li) => ({
        quote_id: id,
        line_item_id: li.line_item_id ?? null,
        line_item_name_snapshot: li.line_item_name_snapshot,
        category: li.category,
        unit: li.unit,
        quantity: li.quantity,
        unit_price_snapshot: li.unit_price_snapshot,
        line_total: Math.round(li.quantity * li.unit_price_snapshot * 100) / 100,
        notes: li.notes ?? "",
      }));
      const { error } = await supabase.from("quote_line_items").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Recompute total_amount from line items so it always reflects the latest state.
  const { data: lines } = await supabase
    .from("quote_line_items")
    .select("line_total")
    .eq("quote_id", id);
  const total =
    Math.round(((lines as { line_total: number }[] | null) ?? []).reduce((s, r) => s + Number(r.line_total), 0) * 100) /
    100;

  const updates: Record<string, unknown> = { total_amount: total };
  if (body.proposal_markdown !== undefined) updates.proposal_markdown = body.proposal_markdown;
  if (body.outcome_notes !== undefined) updates.outcome_notes = body.outcome_notes;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (["accepted", "rejected", "lost"].includes(body.status)) {
      updates.outcome_at = new Date().toISOString();
    }
  }

  const { data: updated, error: updErr } = await supabase
    .from("quotes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (updErr || !updated) return NextResponse.json({ error: updErr?.message }, { status: 500 });

  return NextResponse.json({ quote: updated });
}
