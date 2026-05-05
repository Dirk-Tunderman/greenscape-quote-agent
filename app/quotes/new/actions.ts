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
  budget_tier: z.string().optional().default(""),
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
      budget_tier: parsed.data.budget_tier,
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
