/**
 * NewQuoteForm — uncontrolled form bound to createDraftAction via useActionState.
 *
 * Why uncontrolled (defaultValue, not value): zero re-render cost while typing,
 * and the action receives a FormData snapshot on submit. State is only used
 * to surface field errors and re-populate values after a validation failure.
 *
 * Site-walk notes textarea is the exception: it's controlled so the audio
 * uploader can drop a transcript into it after Deepgram returns. The user
 * still reviews/edits before submit and the same `raw_notes` field reaches
 * the server action — single ingest path on the backend.
 *
 * SubmitButton is split out so useFormStatus picks up the pending state from
 * the enclosing form context.
 */
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field, Input, Textarea } from "@/components/Input";
import { Button } from "@/components/Button";
import { AudioUploader } from "@/components/AudioUploader";
import { createDraftAction } from "./actions";
import { EMPTY_FORM_STATE, type NewQuoteFormState } from "./form-state";

export function NewQuoteForm() {
  const [state, formAction] = useActionState<NewQuoteFormState, FormData>(
    createDraftAction,
    EMPTY_FORM_STATE,
  );

  const errors: Record<string, string> = state?.fieldErrors ?? {};
  const values: Record<string, string> = state?.values ?? {};

  // Controlled so the audio uploader can write into it; seeded from the
  // server-returned values (e.g., after a validation re-render).
  const [rawNotes, setRawNotes] = useState<string>(values.raw_notes ?? "");

  const handleTranscript = (transcript: string) => {
    setRawNotes((current) => {
      const trimmedExisting = current.trim();
      // If the textarea has prior content, append below a blank line so the
      // user can see what came from typing vs. from the recording.
      if (trimmedExisting.length === 0) return transcript;
      return `${current.replace(/\s+$/, "")}\n\n${transcript}`;
    });
  };

  return (
    <form action={formAction} className="space-y-8">
      <fieldset className="space-y-5">
        <legend className="font-serif text-2xl text-saguaro-black mb-2">
          Customer
        </legend>
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Name" htmlFor="customer_name" required error={errors.customer_name}>
            <Input
              id="customer_name"
              name="customer_name"
              defaultValue={values.customer_name ?? ""}
              autoComplete="name"
              invalid={Boolean(errors.customer_name)}
              placeholder="Claire Henderson"
            />
          </Field>
          <Field label="Email" htmlFor="customer_email" required error={errors.customer_email}>
            <Input
              id="customer_email"
              name="customer_email"
              type="email"
              defaultValue={values.customer_email ?? ""}
              autoComplete="email"
              invalid={Boolean(errors.customer_email)}
              placeholder="claire@example.com"
            />
          </Field>
          <Field label="Phone" htmlFor="customer_phone" error={errors.customer_phone}>
            <Input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              defaultValue={values.customer_phone ?? ""}
              autoComplete="tel"
              placeholder="(602) 555-0148"
            />
          </Field>
          <Field
            label="Project address"
            htmlFor="customer_address"
            required
            error={errors.customer_address}
          >
            <Input
              id="customer_address"
              name="customer_address"
              defaultValue={values.customer_address ?? ""}
              autoComplete="street-address"
              invalid={Boolean(errors.customer_address)}
              placeholder="4421 E Camelback Rd, Phoenix, AZ 85018"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-serif text-2xl text-saguaro-black mb-2">
          Project
        </legend>
        <Field
          label="Project title"
          htmlFor="project_type"
          required
          hint="A short label for this project — write it like you'd say it. Bundles are fine."
          error={errors.project_type}
        >
          <Input
            id="project_type"
            name="project_type"
            defaultValue={values.project_type ?? ""}
            invalid={Boolean(errors.project_type)}
            placeholder="e.g. Patio + pergola refresh"
          />
        </Field>

        <div className="rounded-lg border border-stone-gray/30 bg-caliche-white/50 p-5 sm:p-6 space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-xl text-saguaro-black">
              Site walk
              <span className="ml-2 align-middle text-[10px] uppercase tracking-[0.18em] text-sunset-terracotta">
                required
              </span>
            </h3>
          </div>
          <p className="text-sm text-saguaro-black/80 leading-relaxed">
            Drop a recording, write notes by hand, or do both. The agent
            works from whatever ends up in the notes box — recordings fill
            it automatically and you can edit before drafting.
          </p>

          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-stone-gray">
              1 · Recording
              <span className="ml-2 normal-case tracking-normal text-xs text-stone-gray/80">
                optional
              </span>
            </p>
            <AudioUploader onTranscript={handleTranscript} />
          </div>

          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-stone-gray/25" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-gray">
              and / or
            </span>
            <span className="h-px flex-1 bg-stone-gray/25" />
          </div>

          <Field
            label="2 · Notes"
            htmlFor="raw_notes"
            hint="Type, paste, or let a recording fill this in — then edit. Be messy; the agent pulls structured scope and surfaces anything it can't pin down."
            error={errors.raw_notes}
          >
            <Textarea
              id="raw_notes"
              name="raw_notes"
              rows={10}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              invalid={Boolean(errors.raw_notes)}
              placeholder="Site walk Mon morning — Claire wants travertine patio replacing the existing concrete slab, roughly 16x20. Cedar pergola over the dining area, lighting package..."
            />
          </Field>
        </div>

        <label className="inline-flex items-center gap-2.5 text-sm text-saguaro-black select-none cursor-pointer">
          <input
            type="checkbox"
            name="hoa"
            defaultChecked={values.hoa === "on"}
            className="h-4 w-4 rounded border-stone-gray/40 text-mojave-green focus:ring-mojave-green/30"
          />
          Property is in an HOA — include submission package
        </label>
      </fieldset>

      {state?.formError ? (
        <div
          role="alert"
          className="border-l-4 border-error-brick bg-error-brick/10 px-4 py-3 text-sm text-error-brick"
        >
          {state.formError}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-adobe pt-6">
        <p className="text-xs text-stone-gray max-w-md">
          Drafting typically completes in under a minute. You'll land on the
          review page once the agent's done.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Drafting proposal…" : "Draft proposal"}
    </Button>
  );
}
