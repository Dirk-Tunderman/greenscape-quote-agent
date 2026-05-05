/**
 * Form-state types + constants for /quotes/new.
 *
 * Lives in a non-"use server" module because Next.js 15 strictly requires
 * "use server" files to export ONLY async functions (interfaces are fine —
 * they're erased at compile — but const objects like EMPTY_FORM_STATE are
 * rejected at runtime with: 'A "use server" file can only export async
 * functions, found object'). Splitting these into their own module keeps
 * the action file clean.
 *
 * Both NewQuoteForm.tsx (client component) and actions.ts (server action)
 * import from here.
 */

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
