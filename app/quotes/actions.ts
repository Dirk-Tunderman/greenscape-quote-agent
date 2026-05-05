/**
 * Server actions for the /quotes list view.
 *
 * Currently just one: deleteQuoteAction. Triggered by DeleteQuoteButton's
 * confirmation modal. Routes through data/store → DELETE /api/quotes/[id]
 * → DB cascade. Calls revalidatePath so the list view refreshes
 * server-rendered after the row is gone.
 */
"use server";

import { revalidatePath } from "next/cache";
import { deleteQuote } from "@/data/store";

export async function deleteQuoteAction(
  quoteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteQuote(quoteId);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete quote",
    };
  }
  revalidatePath("/quotes");
  return { ok: true };
}
