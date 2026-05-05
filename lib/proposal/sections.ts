/**
 * Shared section parsing + auto-derivation for the proposal markdown.
 *
 * Used by both the on-screen editor (ProposalEditor.tsx) and the PDF
 * renderer (lib/pdf/template.tsx) so the two surfaces can never drift on
 * how sections are split or how the auto-derived Detailed Scope & Pricing
 * and Terms payment-schedule blocks are produced.
 *
 * The proposal_markdown column is the single source of truth for the
 * narrative sections. Pricing data (line items, total, payment schedule)
 * is the source of truth for the structured bits, and gets re-derived
 * here at render time. This means edits to line items or the payment
 * schedule propagate to both the editor preview and the PDF without
 * waiting for a "save" step.
 */
import { DEFAULT_PAYMENT_SCHEDULE, type PaymentScheduleItem, type QuoteLineItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface Section {
  title: string;
  body: string;
}

export interface Parsed {
  prefix: string;
  sections: Section[];
}

/** Split markdown on `## ` H2 headers. Anything before the first H2 is `prefix`. */
export function parseSections(md: string): Parsed {
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

/** Re-emit markdown from prefix + sections. */
export function recombineSections(prefix: string, sections: Section[]): string {
  if (sections.length === 0) return prefix;
  const parts = sections.map((s) => `## ${s.title}\n${s.body}`);
  return prefix + parts.join("\n");
}

export function isScopePricingSection(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("scope") && t.includes("pricing");
}

export function isTermsSection(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("terms") || t.includes("next steps");
}

export function isSignatureSection(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("signature") || t.includes("sign-off") || t.includes("sign off");
}

/** Render the Detailed Scope & Pricing section as a markdown table. */
export function generateScopePricingBody(items: QuoteLineItem[], total: number): string {
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

/**
 * Render the payment schedule block. Percentages only — no dollar amounts.
 * The Project Total in the Detailed Scope & Pricing table already shows the
 * absolute amount, so duplicating it in the schedule is noise that drifts
 * out of sync if line items change between schedule renderings.
 */
export function generatePaymentSchedule(schedule: PaymentScheduleItem[]): string {
  const items = schedule.length > 0 ? schedule : DEFAULT_PAYMENT_SCHEDULE;
  const lines = items.map((s) => `- ${s.pct}% ${s.milestone}`);
  return `**Payment schedule:**\n${lines.join("\n")}`;
}

/**
 * Strip the existing payment-schedule block from a Terms-section body so
 * we can re-render the percentages from live data without duplicating.
 *
 * Tolerant of variations in the LLM's output:
 *   - matches "Payment schedule:" header
 *   - eats following blank, bulleted (- / *), or "%-leading" lines
 */
export function stripPaymentSchedule(body: string): string {
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

// -- PDF body rendering helpers ------------------------------------------

export type PdfBlock =
  | { kind: "para"; text: string }
  | { kind: "bullets"; items: string[] };

/**
 * Convert a section body into a flat list of blocks the PDF can render.
 * react-pdf doesn't parse markdown, so we do a minimal pass: split on
 * blank lines into blocks; if every line in a block is bulleted, emit
 * a bullet list, else emit a paragraph (joined with spaces).
 *
 * Markdown bold/italic/code is stripped to plain text — we don't need
 * inline emphasis in the PDF body and rendering it would require nested
 * <Text> with style overrides per fragment.
 */
export function parsePdfBody(body: string): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  const paragraphs = body.trim().split(/\n\s*\n+/);
  for (const para of paragraphs) {
    const lines = para.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;
    const isAllBullet = lines.every((l) => /^[-*]\s/.test(l));
    if (isAllBullet) {
      blocks.push({
        kind: "bullets",
        items: lines.map((l) => stripInlineMd(l.replace(/^[-*]\s+/, "").trim())),
      });
    } else {
      blocks.push({ kind: "para", text: stripInlineMd(lines.join(" ")) });
    }
  }
  return blocks;
}

export function stripInlineMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}
