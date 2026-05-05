"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Input";
import { setOutcomeAction } from "./actions";

export function OutcomePanel({
  quoteId,
  status,
  outcomeNotes,
}: {
  quoteId: string;
  status: string;
  outcomeNotes: string | null;
}) {
  const [outcome, setOutcome] = useState<"accepted" | "rejected" | "lost" | null>(null);
  const [notes, setNotes] = useState(outcomeNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "sent" && status !== "accepted" && status !== "rejected" && status !== "lost") {
    return null;
  }

  const submit = () => {
    if (!outcome) return;
    setError(null);
    startTransition(async () => {
      const res = await setOutcomeAction(quoteId, outcome, notes);
      if (res.ok) setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      else setError(res.error);
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-gray">
        Once you hear back, mark the outcome here. This feeds future agent improvement.
      </p>
      <div className="flex flex-wrap gap-2">
        {(["accepted", "rejected", "lost"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOutcome(o)}
            className={
              "text-sm px-3 py-1.5 border rounded-md transition-colors " +
              (outcome === o
                ? "border-mojave-green bg-mojave-green/5 text-saguaro-black"
                : "border-stone-gray/40 text-stone-gray hover:bg-adobe/60")
            }
          >
            {o[0].toUpperCase() + o.slice(1)}
          </button>
        ))}
      </div>
      <Textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional context — why this outcome, what we learned…"
      />
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-gray">
          {pending ? "Saving…" : savedAt ? `Saved · ${savedAt}` : status === "sent" ? "Awaiting outcome" : `Outcome: ${status}`}
        </span>
        <Button size="sm" disabled={!outcome || pending} onClick={submit}>
          Record outcome
        </Button>
      </div>
      {error ? <p className="text-xs text-error-brick">{error}</p> : null}
    </div>
  );
}
