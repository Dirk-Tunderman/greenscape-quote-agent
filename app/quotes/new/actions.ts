/**
 * createDraftAction — server action behind /quotes/new.
 *
 * Validates form input with zod, calls store.createDraft (which POSTs to
 * /api/agent/draft and waits for the agent chain to finish — typically
 * 60-180s, which is why the form's pending state is visible while
 * useFormStatus is true). On success, redirects to /quotes/[id].
 *
 * Returns NewQuoteFormState on validation failure so the form re-renders
 * with inline errors and preserved input.
 *
 * NOTE: this file is "use server" — Next.js 15 only allows async function
 * exports here. The form-state interface + EMPTY_FORM_STATE constant live
 * in `./form-state.ts` so they can be shared with the client component
 * without violating that rule.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createDraft } from "@/data/store";
import type { NewQuoteFormState } from "./form-state";

// Layer 1 of the input-quality defense — see docs/09-decision-log.md D41.
// Rejects obvious empty/too-short input for free, before any LLM token is
// spent. The pre-flight relevance check (Skill 0) catches wrong-content-type;
// extract_scope's __no_scope exit catches sparse-but-relevant inputs.
const draftSchema = z.object({
  customer_name: z.string().trim().min(2, "Customer name is required"),
  customer_email: z.string().trim().email("Enter a valid email"),
  customer_phone: z.string().trim().optional().default(""),
  customer_address: z.string().trim().min(5, "Project address is required"),
  project_type: z.string().trim().min(2, "Project title is required"),
  raw_notes: z
    .string()
    .trim()
    .min(30, "Site walk notes are too short — add at least a sentence or two."),
  hoa: z.string().optional(),
});

export async function createDraftAction(
  _prev: NewQuoteFormState,
  formData: FormData
): Promise<NewQuoteFormState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = draftSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, formError: null, values: raw };
  }

  let quoteId: string;
  try {
    const { quote_id } = await createDraft({
      customer: {
        name: parsed.data.customer_name,
        email: parsed.data.customer_email,
        phone: parsed.data.customer_phone,
        address: parsed.data.customer_address,
      },
      project_type: parsed.data.project_type,
      raw_notes: parsed.data.raw_notes,
      hoa: parsed.data.hoa === "on" || parsed.data.hoa === "true",
    });
    quoteId = quote_id;
  } catch (err) {
    return {
      fieldErrors: {},
      formError: err instanceof Error ? err.message : "Failed to draft proposal.",
      values: raw,
    };
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${quoteId}`);
}
