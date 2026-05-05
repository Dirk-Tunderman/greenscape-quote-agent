/**
 * POST /api/quotes/[id]/send — render PDF, upload, email, mark sent.
 *
 * Pipeline:
 *   1. Validate quote is in `draft_ready` or `validation_failed` status
 *      (sent quotes 409; drafting/sending also 409 — wrong state)
 *   2. Set status='sending' (lock against double-send)
 *   3. Render branded PDF from line_items + customer (lib/pdf/template.tsx)
 *   4. Ensure greenscape-quotes Storage bucket exists; upload PDF (upsert)
 *   5. Get 30-day signed URL for the PDF
 *   6. Send email via Resend with PDF attached (lib/email.ts)
 *   7. Update quote: status='sent', pdf_url, sent_at
 *
 * Failure paths revert status to its pre-send value:
 *   - PDF render → 500
 *   - Storage upload → 500
 *   - Resend send → 500 (pdf_url is preserved)
 *
 * Returns: { quote, pdf_url, sent_at }
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { renderProposalPdf } from "@/lib/pdf/render";
import { sendQuoteEmail } from "@/lib/email";
import type { Customer, Quote, QuoteLineItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PDF_BUCKET = "greenscape-quotes";

interface ParamCtx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, ctx: ParamCtx) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  const { data: quote, error: qe } = await supabase.from("quotes").select("*").eq("id", id).single();
  if (qe || !quote) return NextResponse.json({ error: qe?.message ?? "not found" }, { status: 404 });

  const q = quote as Quote;

  if (q.status === "sent") {
    return NextResponse.json({ error: "Quote already sent" }, { status: 409 });
  }
  if (q.status !== "draft_ready" && q.status !== "validation_failed") {
    return NextResponse.json(
      { error: `Quote not ready to send (status=${q.status}). Only draft_ready or validation_failed quotes can be sent (after Marcus's edits).` },
      { status: 409 },
    );
  }

  const [{ data: customer }, { data: lines }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", q.customer_id).single(),
    supabase.from("quote_line_items").select("*").eq("quote_id", id).order("created_at"),
  ]);
  if (!customer) return NextResponse.json({ error: "customer missing" }, { status: 500 });

  const c = customer as Customer;
  const lineItems = (lines ?? []) as QuoteLineItem[];

  // Mark sending
  await supabase.from("quotes").update({ status: "sending" }).eq("id", id);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderProposalPdf({ customer: c, quote: q, line_items: lineItems });
  } catch (err) {
    await supabase.from("quotes").update({ status: q.status }).eq("id", id);
    return NextResponse.json(
      { error: "PDF render failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const proposalNumber = `GP-${q.id.slice(0, 8).toUpperCase()}`;
  const pdfFilename = `Greenscape-Proposal-${proposalNumber}.pdf`;

  // Ensure bucket exists; create if missing.
  const bucketName = PDF_BUCKET;
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === bucketName)) {
    await supabase.storage.createBucket(bucketName, { public: false });
  }

  const path = `${q.id}/${pdfFilename}`;
  const upload = await supabase.storage.from(bucketName).upload(path, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upload.error) {
    await supabase.from("quotes").update({ status: q.status }).eq("id", id);
    return NextResponse.json(
      { error: "PDF upload failed", detail: upload.error.message },
      { status: 500 },
    );
  }

  const { data: signed } = await supabase.storage.from(bucketName).createSignedUrl(path, 60 * 60 * 24 * 30);
  const pdfUrl = signed?.signedUrl ?? path;

  // Send email
  try {
    await sendQuoteEmail({
      to: c.email,
      customerName: c.name,
      pdfBuffer,
      pdfFilename,
      proposalNumber,
      totalUsd: Number(q.total_amount),
    });
  } catch (err) {
    await supabase.from("quotes").update({ status: q.status, pdf_url: pdfUrl }).eq("id", id);
    return NextResponse.json(
      { error: "Email send failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const sentAt = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("quotes")
    .update({ status: "sent", pdf_url: pdfUrl, sent_at: sentAt })
    .eq("id", id)
    .select("*")
    .single();
  if (updErr || !updated) {
    return NextResponse.json({ error: "send recorded but quote update failed", detail: updErr?.message }, { status: 500 });
  }

  return NextResponse.json({ quote: updated, pdf_url: pdfUrl, sent_at: sentAt });
}
