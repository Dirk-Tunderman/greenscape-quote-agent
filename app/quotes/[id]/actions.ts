/**
 * Server actions for /quotes/[id].
 *
 * Thin wrappers over data/store.ts (which calls the real /api/* endpoints).
 * Each action mutates state, revalidates affected paths, and returns a
 * discriminated union so the caller can render error state without
 * try/catch.
 *
 * approveAndDownloadAction is special — it returns the signed PDF URL so
 * the client can window.open() the download. Email send is deprecated;
 * see lib/email.ts for the dormant Resend code.
 */
"use server";

import { revalidatePath } from "next/cache";
import {
  patchQuote,
  downloadPdf,
  setOutcome,
  type PatchLineItemInput,
} from "@/data/store";

export interface UpdateLineItemPayload {
  id: string;
  quantity?: number;
  unit_price_snapshot?: number;
  notes?: string;
}

export async function updateLineItemsAction(
  quoteId: string,
  patches: UpdateLineItemPayload[]
): Promise<{ ok: true; total: number } | { ok: false; error: string }> {
  try {
    const { total } = await patchQuote(quoteId, {
      line_items: patches as PatchLineItemInput[],
    });
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/quotes");
    return { ok: true, total };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
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
