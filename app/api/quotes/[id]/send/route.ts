/**
 * POST /api/quotes/[id]/send — render PDF, upload to Storage, return signed URL.
 *
 * Email send is intentionally OFF in this iteration. The route renders +
 * stores + returns a signed URL; the frontend opens that URL in a new tab
 * so Marcus can save or forward the PDF himself. lib/email.ts is retained
 * as dormant working code (Phase 2 candidate).
 *
 * **Re-runnable.** PDF generation is no longer terminal. Marcus can edit
 * line items, sections, or anything else and re-call this endpoint to
 * regenerate the PDF. The status guard blocks only:
 *   - `drafting` / `sending` — orchestrator or render in flight
 *   - `accepted` / `rejected` / `lost` — outcome locked, customer signed
 *
 * Pipeline:
 *   1. Status guard (above)
 *   2. Render branded PDF from line_items + customer (lib/pdf/template.tsx)
 *   3. Upload to Supabase Storage (greenscape-quotes bucket, upsert)
 *   4. Get a 30-day signed URL
 *   5. Update quote: status=sent, pdf_url, sent_at. The `sent` enum is
 *      decorative — "PDF has been generated at least once" — and does
 *      NOT lock further edits or further finalizes.
 *
 * Failure paths revert status to its pre-render value.
 *
 * Returns: { quote, pdf_url, sent_at }
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { renderProposalPdf } from "@/lib/pdf/render";
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

  if (q.status === "drafting" || q.status === "sending") {
    return NextResponse.json(
      { error: `Quote is currently ${q.status} — wait for it to settle before generating a PDF.` },
      { status: 409 },
    );
  }
  if (q.status === "accepted" || q.status === "rejected" || q.status === "lost") {
    return NextResponse.json(
      { error: `Quote is locked (status=${q.status}). Outcome was recorded; PDFs can no longer be regenerated.` },
      { status: 409 },
    );
  }
  // Otherwise (draft_ready, validation_failed, sent) — proceed with render.
  // `sent` is intentionally allowed: PDF generation is not terminal.
  const previousStatus = q.status;

  const [{ data: customer }, { data: lines }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", q.customer_id).single(),
    supabase.from("quote_line_items").select("*").eq("quote_id", id).order("created_at"),
  ]);
  if (!customer) return NextResponse.json({ error: "customer missing" }, { status: 500 });

  const c = customer as Customer;
  const lineItems = (lines ?? []) as QuoteLineItem[];

  // Mark in-flight (lock against double-finalize)
  await supabase.from("quotes").update({ status: "sending" }).eq("id", id);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderProposalPdf({ customer: c, quote: q, line_items: lineItems });
  } catch (err) {
    await supabase.from("quotes").update({ status: previousStatus }).eq("id", id);
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
    await supabase.from("quotes").update({ status: previousStatus }).eq("id", id);
    return NextResponse.json(
      { error: "PDF upload failed", detail: upload.error.message },
      { status: 500 },
    );
  }

  const { data: signed } = await supabase.storage.from(bucketName).createSignedUrl(path, 60 * 60 * 24 * 30);
  const pdfUrl = signed?.signedUrl ?? path;

  const sentAt = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("quotes")
    .update({ status: "sent", pdf_url: pdfUrl, sent_at: sentAt })
    .eq("id", id)
    .select("*")
    .single();
  if (updErr || !updated) {
    return NextResponse.json({ error: "finalize recorded but quote update failed", detail: updErr?.message }, { status: 500 });
  }

  return NextResponse.json({ quote: updated, pdf_url: pdfUrl, sent_at: sentAt });
}
