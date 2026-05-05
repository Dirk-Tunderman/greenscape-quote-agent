/**
 * Server actions for /quotes/[id].
 *
 * Thin wrappers over data/store.ts (which calls the real /api/* endpoints).
 * Each action mutates state, revalidates affected paths, and returns a
 * discriminated union so the caller can render error state without
 * try/catch.
 *
 * approveAndDownloadAction returns the signed PDF URL so the client can
 * window.open() the download. PDF generation is re-runnable — Marcus can
 * call this after any edit to regenerate the PDF.
 *
 * Email send is dormant — see lib/email.ts.
 */
"use server";

import { revalidatePath } from "next/cache";
import {
  patchQuote,
  replaceLineItems,
  downloadPdf,
  setOutcome,
  type ReplacementLineItem,
} from "@/data/store";

export type LineItemReplacement = ReplacementLineItem;

/**
 * Replace the full line-items list in one shot. Backend does drop+insert
 * and recomputes the quote total. The client always sends the full list
 * so adds, deletes, and edits all round-trip through the same path.
 */
export async function saveLineItemsAction(
  quoteId: string,
  items: LineItemReplacement[]
): Promise<{ ok: true; total: number } | { ok: false; error: string }> {
  try {
    const { total } = await replaceLineItems(quoteId, items);
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/quotes");
    return { ok: true, total };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function updateProposalAction(
  quoteId: string,
  proposal_markdown: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await patchQuote(quoteId, { proposal_markdown });
    revalidatePath(`/quotes/${quoteId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function approveAndDownloadAction(
  quoteId: string
): Promise<{ ok: true; pdf_url: string; sent_at: string } | { ok: false; error: string }> {
  try {
    const result = await downloadPdf(quoteId);
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/quotes");
    return { ok: true, pdf_url: result.pdf_url, sent_at: result.sent_at };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Download failed" };
  }
}

export async function setOutcomeAction(
  quoteId: string,
  outcome: "accepted" | "rejected" | "lost",
  notes: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await setOutcome(quoteId, outcome, notes);
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/quotes");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}
