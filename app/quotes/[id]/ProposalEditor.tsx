/**
 * ProposalEditor — section-by-section editable proposal.
 *
 * Why: the proposal_markdown is one big blob and Marcus is a contractor, not
 * a markdown user. Splitting on `## ` H2 headers gives him one labeled,
 * editable card per section (Greeting, Project Overview, Detailed Scope &
 * Pricing, Exclusions, Timeline, Warranty, Terms & Next Steps, Signature)
 * — the human-in-the-loop control the brief calls out.
 *
 * Storage stays as a single `proposal_markdown` column. Parse on read,
 * recombine on save (Option 1 from prompts/chat-a-v2-wireup.md). Two tabs:
 *   - Sections — editable textareas, one per H2 section
 *   - Preview  — react-markdown rendered (single source of truth for what
 *               Marcus sees vs. what the PDF will render)
 *
 * Save semantics: one "Save proposal" button at the top — it batches all
 * dirty sections into a single PATCH. Per-section dirty pip is shown so
 * Marcus knows what he's about to commit.
 *
 * The Detailed Scope & Pricing section contains a markdown table that's a
 * snapshot of line items at agent-run time. The PDF renders from
 * `quote_line_items`, not from this markdown — so editing line items in
 * the table panel above this editor and editing this section's text are
 * two separate concerns. Worth knowing if numbers ever look out of sync.
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/Button";
import { updateProposalAction } from "./actions";

interface Section {
  title: string;
  body: string;
}

interface Parsed {
  prefix: string;
  sections: Section[];
}

/**
 * Splits the markdown at the first `## ` H2 header. Everything before is
 * `prefix` (typically `# Proposal\n\n`); everything after is split into
 * sections by subsequent `## ` markers.
 *
 * The split is line-anchored to avoid accidentally matching `##` inside a
 * code block or inline text — H2 headers in the agent's output always
 * start at the beginning of a line.
 */
function parseSections(md: string): Parsed {
  let firstHeader: number;
  if (md.startsWith("## ")) {
    firstHeader = 0;
  } else {
    const idx = md.search(/\n##\s+/);
    firstHeader = idx >= 0 ? idx + 1 : -1;
  }
  if (firstHeader < 0) return { prefix: md, sections: [] };

  const prefix = md.slice(0, firstHeader);
  const body = md.slice(firstHeader);
  const chunks = body.split(/\n##\s+/);
  if (chunks[0].startsWith("## ")) chunks[0] = chunks[0].slice(3);

  const sections = chunks.map((chunk) => {
    const nl = chunk.indexOf("\n");
    if (nl < 0) return { title: chunk.trim(), body: "" };
    return { title: chunk.slice(0, nl).trim(), body: chunk.slice(nl + 1) };
  });
  return { prefix, sections };
}

/**
 * Recombine prefix + sections back into a single markdown string. Joining
 * sections with a single `\n` produces `body\n## next-title` which is two
 * newlines visually (the body's trailing `\n` + the `\n` join). Markdown
 * renderers accept this even if a section's body has no trailing newline.
 */
function recombineSections(prefix: string, sections: Section[]): string {
  if (sections.length === 0) return prefix;
  const parts = sections.map((s) => `## ${s.title}\n${s.body}`);
  return prefix + parts.join("\n");
}

export function ProposalEditor({
  quoteId,
  initialMarkdown,
  readOnly,
}: {
  quoteId: string;
  initialMarkdown: string;
  readOnly: boolean;
}) {
  const parsed = useMemo(() => parseSections(initialMarkdown), [initialMarkdown]);

  const [tab, setTab] = useState<"sections" | "preview">(readOnly ? "preview" : "sections");
  const [sections, setSections] = useState<Section[]>(parsed.sections);
  const [savedSections, setSavedSections] = useState<Section[]>(parsed.sections);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const combined = useMemo(
    () => recombineSections(parsed.prefix, sections),
    [parsed.prefix, sections]
  );

  const dirtyMap = useMemo(
    () =>
      sections.map((s, i) => {
        const saved = savedSections[i];
        if (!saved) return true;
        return s.body !== saved.body || s.title !== saved.title;
      }),
    [sections, savedSections]
  );

  const anyDirty = dirtyMap.some(Boolean);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateProposalAction(quoteId, combined);
      if (res.ok) {
        setSavedSections(structuredClone(sections));
        setSavedAt(
          new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        );
      } else {
        setError(res.error);
      }
    });
  };

  const updateSectionBody = (idx: number, body: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, body } : s)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b border-adobe">
        <div className="flex">
          {!readOnly && (
            <TabButton active={tab === "sections"} onClick={() => setTab("sections")}>
              Sections{anyDirty ? " ·" : ""}
            </TabButton>
          )}
          <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
            Preview
          </TabButton>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-gray">
          {pending ? <span>Saving…</span> : savedAt ? <span>Saved · {savedAt}</span> : null}
          {error ? <span className="text-error-brick">{error}</span> : null}
          {!readOnly && tab === "sections" ? (
            <Button size="sm" disabled={!anyDirty || pending} onClick={save}>
              {pending ? "Saving…" : "Save proposal"}
            </Button>
          ) : null}
        </div>
      </div>

      {tab === "sections" ? (
        <div className="space-y-3">
          {sections.length === 0 ? (
            <p className="text-sm text-stone-gray italic">
              No sections detected in this proposal — preview tab shows the raw markdown.
            </p>
          ) : (
            sections.map((s, i) => (
              <SectionCard
                key={i}
                index={i}
                title={s.title}
                body={s.body}
                dirty={dirtyMap[i]}
                readOnly={readOnly}
                onChange={(b) => updateSectionBody(i, b)}
              />
            ))
          )}
        </div>
      ) : (
        <article className="prose-proposal bg-caliche-white border border-adobe rounded-md px-6 py-6 md:px-10 md:py-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{combined}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}

function SectionCard({
  index,
  title,
  body,
  dirty,
  readOnly,
  onChange,
}: {
  index: number;
  title: string;
  body: string;
  dirty: boolean;
  readOnly: boolean;
  onChange: (body: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const rows = Math.max(4, Math.min(20, body.split("\n").length + 1));

  return (
    <div
      className={
        "border rounded-md transition-colors " +
        (dirty ? "border-mojave-green" : "border-adobe")
      }
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left bg-adobe/40 hover:bg-adobe/60 rounded-t-md"
      >
        <span className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-gray tnum">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-serif text-base text-saguaro-black">{title}</span>
          {dirty && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-mojave-green/15 text-mojave-green font-medium">
              unsaved
            </span>
          )}
        </span>
        <span className="text-stone-gray text-xs">{collapsed ? "Expand" : "Collapse"}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-adobe">
          {readOnly ? (
            <pre className="whitespace-pre-wrap text-sm text-saguaro-black font-sans px-4 py-3">
              {body}
            </pre>
          ) : (
            <textarea
              value={body}
              onChange={(e) => onChange(e.target.value)}
              rows={rows}
              className="w-full px-4 py-3 text-sm font-mono bg-caliche-white text-saguaro-black focus:outline-none focus:bg-mojave-green/[0.02] resize-y rounded-b-md"
              spellCheck={false}
              aria-label={`Edit section: ${title}`}
            />
          )}
        </div>
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
