/**
 * ProposalEditor — section-by-section editable proposal with single-source
 * pricing.
 *
 * The proposal_markdown is split on `## ` H2 headers into sections. Most
 * sections are plain editable textareas. Two sections carry pricing data
 * and must stay in sync with the live `line_items` panel and the quote's
 * `payment_schedule` — those are auto-derived at render time AND at save
 * time, so the stored markdown never drifts:
 *
 *   - "Detailed Scope & Pricing" — full body is regenerated from the
 *     current line_items + total. Not editable as text. Hint points to
 *     the line items panel above.
 *
 *   - "Terms & Next Steps" — the payment-schedule block at the top is
 *     regenerated from current total × payment_schedule percentages.
 *     The rest of the section (other terms, closing paragraph) stays
 *     freely editable.
 *
 * On save we recombine: prefix + each section, where the two pricing
 * sections use derived bodies and the editable section's body is the
 * rest text the user typed.
 *
 * Storage stays as a single proposal_markdown column — no schema change,
 * but the column is now best understood as "denormalized snapshot, updated
 * by the editor and the PDF renderer". The PDF (lib/pdf/template.tsx)
 * renders structured data directly, so the markdown is purely the on-screen
 * review surface.
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/Button";
import type { PaymentScheduleItem, QuoteLineItem } from "@/lib/types";
import { DEFAULT_PAYMENT_SCHEDULE } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { updateProposalAction } from "./actions";

interface Section {
  title: string;
  body: string;
}

interface Parsed {
  prefix: string;
  sections: Section[];
}

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

function recombineSections(prefix: string, sections: Section[]): string {
  if (sections.length === 0) return prefix;
  const parts = sections.map((s) => `## ${s.title}\n${s.body}`);
  return prefix + parts.join("\n");
}

// --- Auto-derived section bodies -----------------------------------------

function isScopePricingSection(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("scope") && t.includes("pricing");
}

function isTermsSection(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("terms") || t.includes("next steps");
}

function generateScopePricingBody(items: QuoteLineItem[], total: number): string {
  if (items.length === 0) {
    return `_No line items yet — add some in the Line items panel above._\n\n**Project Total: $0.00**`;
  }
  const header =
    `| Description | Qty | Unit | Unit Price | Line Total |\n` +
    `|---|---:|---|---:|---:|`;
  const rows = items.map((li) => {
    const desc = (li.line_item_name_snapshot || "—").replace(/\|/g, "\\|");
    return `| ${desc} | ${li.quantity} | ${li.unit} | ${formatCurrency(li.unit_price_snapshot)} | ${formatCurrency(li.line_total)} |`;
  });
  return `${header}\n${rows.join("\n")}\n\n**Project Total: ${formatCurrency(total)}**`;
}

function generatePaymentSchedule(total: number, schedule: PaymentScheduleItem[]): string {
  const items = schedule.length > 0 ? schedule : DEFAULT_PAYMENT_SCHEDULE;
  const lines = items.map((s) => {
    const amt = (total * s.pct) / 100;
    return `- ${s.pct}% ${s.milestone} (${formatCurrency(amt)})`;
  });
  return `**Payment schedule:**\n${lines.join("\n")}`;
}

/**
 * Strip the existing payment-schedule block from a Terms-section body.
 * Returns just the "rest" — Other terms, closing paragraph, anything else
 * Marcus has typed. Tolerant of variations in the agent's output.
 */
function stripPaymentSchedule(body: string): string {
  const lines = body.split("\n");
  let scheduleStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/payment\s+schedule/i.test(lines[i])) {
      scheduleStart = i;
      break;
    }
  }
  if (scheduleStart < 0) return body;

  let scheduleEnd = scheduleStart + 1;
  while (scheduleEnd < lines.length) {
    const ln = lines[scheduleEnd].trim();
    if (ln === "" || ln.startsWith("-") || ln.startsWith("*") || /^\d+%/.test(ln)) {
      scheduleEnd++;
      continue;
    }
    break;
  }
  const before = lines.slice(0, scheduleStart);
  const after = lines.slice(scheduleEnd);
  while (before.length && before[before.length - 1].trim() === "") before.pop();
  while (after.length && after[0].trim() === "") after.shift();
  if (before.length && after.length) before.push("");
  return [...before, ...after].join("\n");
}

// --- Component ------------------------------------------------------------

export function ProposalEditor({
  quoteId,
  initialMarkdown,
  readOnly,
  lineItems,
  total,
  paymentSchedule,
}: {
  quoteId: string;
  initialMarkdown: string;
  readOnly: boolean;
  lineItems: QuoteLineItem[];
  total: number;
  paymentSchedule: PaymentScheduleItem[];
}) {
  const parsed = useMemo(() => parseSections(initialMarkdown), [initialMarkdown]);

  const [tab, setTab] = useState<"sections" | "preview">(readOnly ? "preview" : "sections");
  // Editable bodies = section bodies stripped of any auto-derived content.
  // For terms section, that means the body without the payment schedule.
  // For scope/pricing section, the user can't edit, so we don't even
  // surface the body in state.
  const [editableBodies, setEditableBodies] = useState<Record<number, string>>(() => {
    const out: Record<number, string> = {};
    parsed.sections.forEach((s, i) => {
      if (isScopePricingSection(s.title)) {
        // never editable — skip
      } else if (isTermsSection(s.title)) {
        out[i] = stripPaymentSchedule(s.body);
      } else {
        out[i] = s.body;
      }
    });
    return out;
  });
  const [savedBodies, setSavedBodies] = useState<Record<number, string>>(editableBodies);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const derivedScope = useMemo(
    () => generateScopePricingBody(lineItems, total),
    [lineItems, total]
  );
  const derivedSchedule = useMemo(
    () => generatePaymentSchedule(total, paymentSchedule),
    [total, paymentSchedule]
  );

  const buildSection = (i: number, s: Section): Section => {
    if (isScopePricingSection(s.title)) {
      return { title: s.title, body: derivedScope };
    }
    if (isTermsSection(s.title)) {
      const rest = editableBodies[i] ?? "";
      return { title: s.title, body: rest ? `${derivedSchedule}\n\n${rest}` : derivedSchedule };
    }
    return { title: s.title, body: editableBodies[i] ?? s.body };
  };

  const combined = useMemo(
    () => recombineSections(parsed.prefix, parsed.sections.map((s, i) => buildSection(i, s))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parsed, editableBodies, derivedScope, derivedSchedule]
  );

  // "Dirty" only counts text the user can actually edit. Auto-derived
  // sections are always re-derived on save, so they don't gate the
  // Save button's enabled state.
  const dirtyMap = useMemo(() => {
    const m: Record<number, boolean> = {};
    Object.keys(editableBodies).forEach((k) => {
      const idx = Number(k);
      m[idx] = (savedBodies[idx] ?? "") !== editableBodies[idx];
    });
    return m;
  }, [editableBodies, savedBodies]);

  const anyDirty = Object.values(dirtyMap).some(Boolean);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateProposalAction(quoteId, combined);
      if (res.ok) {
        setSavedBodies({ ...editableBodies });
        setSavedAt(
          new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        );
      } else {
        setError(res.error);
      }
    });
  };

  const updateBody = (idx: number, body: string) => {
    setEditableBodies((prev) => ({ ...prev, [idx]: body }));
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
          {parsed.sections.length === 0 ? (
            <p className="text-sm text-stone-gray italic">
              No sections detected — preview tab shows the raw markdown.
            </p>
          ) : (
            parsed.sections.map((s, i) =>
              isScopePricingSection(s.title) ? (
                <DerivedScopeCard
                  key={i}
                  index={i}
                  title={s.title}
                  derivedMarkdown={derivedScope}
                />
              ) : isTermsSection(s.title) ? (
                <TermsCard
                  key={i}
                  index={i}
                  title={s.title}
                  derivedSchedule={derivedSchedule}
                  body={editableBodies[i] ?? ""}
                  dirty={!!dirtyMap[i]}
                  readOnly={readOnly}
                  onChange={(b) => updateBody(i, b)}
                />
              ) : (
                <SectionCard
                  key={i}
                  index={i}
                  title={s.title}
                  body={editableBodies[i] ?? s.body}
                  dirty={!!dirtyMap[i]}
                  readOnly={readOnly}
                  onChange={(b) => updateBody(i, b)}
                />
              )
            )
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

// --- Section card variants ----------------------------------------------

function SectionShell({
  index,
  title,
  badge,
  children,
  rightAccent,
}: {
  index: number;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  rightAccent?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      className={
        "border rounded-md transition-colors " +
        (rightAccent ? "border-mojave-green" : "border-adobe")
      }
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left bg-adobe/40 hover:bg-adobe/60 rounded-t-md"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-gray tnum shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-serif text-base text-saguaro-black truncate">{title}</span>
          {badge}
        </span>
        <span className="text-stone-gray text-xs shrink-0">{collapsed ? "Expand" : "Collapse"}</span>
      </button>
      {!collapsed && <div className="border-t border-adobe">{children}</div>}
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
  const rows = Math.max(4, Math.min(20, body.split("\n").length + 1));
  return (
    <SectionShell
      index={index}
      title={title}
      rightAccent={dirty}
      badge={
        dirty ? (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-mojave-green/15 text-mojave-green font-medium shrink-0">
            unsaved
          </span>
        ) : undefined
      }
    >
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
    </SectionShell>
  );
}

function DerivedScopeCard({
  index,
  title,
  derivedMarkdown,
}: {
  index: number;
  title: string;
  derivedMarkdown: string;
}) {
  return (
    <SectionShell
      index={index}
      title={title}
      badge={
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-info-sky/15 text-info-sky font-medium shrink-0">
          auto
        </span>
      }
    >
      <div className="px-4 py-3">
        <p className="text-xs text-stone-gray mb-3">
          Auto-derived from the Line items panel above. Edit items there to update this section
          and the project total.
        </p>
        <div className="prose-proposal bg-caliche-white border border-adobe rounded p-4 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{derivedMarkdown}</ReactMarkdown>
        </div>
      </div>
    </SectionShell>
  );
}

function TermsCard({
  index,
  title,
  derivedSchedule,
  body,
  dirty,
  readOnly,
  onChange,
}: {
  index: number;
  title: string;
  derivedSchedule: string;
  body: string;
  dirty: boolean;
  readOnly: boolean;
  onChange: (body: string) => void;
}) {
  const rows = Math.max(4, Math.min(20, body.split("\n").length + 1));
  return (
    <SectionShell
      index={index}
      title={title}
      rightAccent={dirty}
      badge={
        dirty ? (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-mojave-green/15 text-mojave-green font-medium shrink-0">
            unsaved
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-info-sky/15 text-info-sky font-medium shrink-0">
            partial auto
          </span>
        )
      }
    >
      <div className="px-4 py-3 space-y-3">
        <div>
          <p className="text-xs text-stone-gray mb-1.5">
            Payment schedule (auto-synced with project total):
          </p>
          <div className="prose-proposal bg-caliche-white border border-adobe rounded p-3 text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{derivedSchedule}</ReactMarkdown>
          </div>
        </div>
        <div>
          <p className="text-xs text-stone-gray mb-1.5">Other terms (editable):</p>
          {readOnly ? (
            <pre className="whitespace-pre-wrap text-sm text-saguaro-black font-sans">{body}</pre>
          ) : (
            <textarea
              value={body}
              onChange={(e) => onChange(e.target.value)}
              rows={rows}
              className="w-full px-3 py-2 text-sm font-mono bg-caliche-white border border-adobe rounded text-saguaro-black focus:outline-none focus:border-mojave-green resize-y"
              spellCheck={false}
              aria-label={`Edit other terms`}
              placeholder="Other terms, deadlines, closing notes…"
            />
          )}
        </div>
      </div>
    </SectionShell>
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
