/**
 * Server actions for /quotes/[id].
 *
 * These exist (instead of /api/ routes) so Chat A keeps full ownership of
 * app/api/. Each action is a thin wrapper over data/store.ts that:
 *   1. Mutates state via the store
 *   2. Revalidates affected paths so list + detail re-fetch
 *   3. Returns a discriminated union { ok: true, ... } | { ok: false, error }
 *      so the caller can render error state without a try/catch.
 *
 * approveAndSendAction is the exception — it redirects on success. The thrown
 * NEXT_REDIRECT is caught in the client component (ApproveBar) and ignored.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  patchQuote,
  sendQuote,
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
    const detail = await patchQuote(quoteId, {
      line_items: patches as PatchLineItemInput[],
    });
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/quotes");
    return { ok: true, total: detail.quote.total_amount };
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

export async function approveAndSendAction(
  quoteId: string
): Promise<never> {
  await sendQuote(quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  redirect(`/quotes?sent=${quoteId}`);
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
