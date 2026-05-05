/**
 * PATCH /api/customers/[id] — apply Marcus's edits to a customer record.
 *
 * Accepts any subset of { name, email, phone, address }. Fields not
 * present are left alone. `phone` accepts an empty string which is
 * normalized to null (the column is nullable).
 *
 * Used by the Customer card on /quotes/[id] for inline editing.
 *
 * Returns: { customer }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { Customer } from "@/lib/types";

export const runtime = "nodejs";

interface ParamCtx {
  params: Promise<{ id: string }>;
}

const PatchBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().min(1).optional(),
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

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.address !== undefined) updates.address = body.address;
  if (body.phone !== undefined) updates.phone = body.phone === "" ? null : body.phone;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Customer not found" }, { status: 404 });
  }
  return NextResponse.json({ customer: data as Customer });
}
