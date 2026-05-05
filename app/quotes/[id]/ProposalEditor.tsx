"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/Button";
import { updateProposalAction } from "./actions";

export function ProposalEditor({
  quoteId,
  initialMarkdown,
  readOnly,
}: {
  quoteId: string;
  initialMarkdown: string;
  readOnly: boolean;
}) {
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const [draft, setDraft] = useState(initialMarkdown);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = draft !== initialMarkdown;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateProposalAction(quoteId, draft);
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
      } else setError(res.error);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-adobe">
        <div className="flex">
          <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
            Preview
          </TabButton>
          {!readOnly && (
            <TabButton active={tab === "edit"} onClick={() => setTab("edit")}>
              Edit markdown
            </TabButton>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-gray">
          {pending ? <span>Saving…</span> : savedAt ? <span>Saved · {savedAt}</span> : null}
          {error ? <span className="text-error-brick">{error}</span> : null}
          {!readOnly && tab === "edit" ? (
            <Button size="sm" disabled={!dirty || pending} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </div>
      </div>

      {tab === "preview" ? (
        <article className="prose-proposal bg-caliche-white border border-adobe rounded-md px-6 py-6 md:px-10 md:py-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
        </article>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={26}
          className="w-full font-mono text-xs bg-caliche-white border border-stone-gray/40 rounded-md px-4 py-3 text-saguaro-black focus:outline-none focus:border-mojave-green focus:ring-2 focus:ring-mojave-green/20"
          spellCheck={false}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
        (active
          ? "border-mojave-green text-saguaro-black"
          : "border-transparent text-stone-gray hover:text-saguaro-black")
      }
    >
      {children}
    </button>
  );
}
