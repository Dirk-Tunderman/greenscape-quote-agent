/**
 * createDraftAction — server action behind /quotes/new.
 *
 * Validates form input with zod, calls store.createDraft (which POSTs to
 * /api/agent/draft and waits for the agent chain to finish — typically
 * 60-180s, which is why the form's pending state is visible while
 * useFormStatus is true). On success, redirects to /quotes/[id].
 *
 * Returns { fieldErrors, formError, values } on validation failure so the
 * form can re-render with inline errors and preserved input.
 *
 * The "budget signal" form field was removed — see prompts/chat-a-v2-wireup.md
 * Task A5: it was UI-only and never piped into agent reasoning, so it was
 * worse than not collecting it.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createDraft } from "@/data/store";

const draftSchema = z.object({
  customer_name: z.string().trim().min(2, "Customer name is required"),
  customer_email: z.string().trim().email("Enter a valid email"),
  customer_phone: z.string().trim().optional().default(""),
  customer_address: z.string().trim().min(5, "Project address is required"),
  project_type: z.string().trim().min(2, "Project type is required"),
  raw_notes: z.string().trim().min(20, "Add at least a few sentences of site walk notes"),
  hoa: z.string().optional(),
});

export interface NewQuoteFormState {
  fieldErrors: Record<string, string>;
  formError: string | null;
  values: Record<string, string>;
}

export const EMPTY_FORM_STATE: NewQuoteFormState = {
  fieldErrors: {},
  formError: null,
  values: {},
};

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
