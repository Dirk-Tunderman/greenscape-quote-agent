/**
 * data/store.ts — frontend-side data adapter (the API seam).
 *
 * This is the ONE module pages + server actions read/mutate through. It
 * exists so that swapping mock fixtures for Chat A's real backend is a
 * single-file change instead of a sprawl edit across every page.
 *
 * Current implementation: in-memory state seeded from data/mocks/, mutated
 * directly. Module-level state survives across server-component re-renders
 * within the same Node dev process (enough to demo edits + approvals
 * without a DB).
 *
 * To wire real backend (Chat A's routes already exist at app/api/...):
 *   - listQuotes()        → GET  /api/quotes?status=...&search=...
 *   - getQuote(id)        → GET  /api/quotes/[id]
 *   - listLineItems()     → GET  /api/line-items
 *   - cumulativeCost()    → derive from listQuotes() OR add a dedicated endpoint
 *   - createDraft(body)   → POST /api/agent/draft
 *   - patchQuote(id, ...) → PATCH /api/quotes/[id]
 *   - sendQuote(id)       → POST /api/quotes/[id]/send
 *   - setOutcome(...)     → PATCH /api/quotes/[id] (status + outcome_notes)
 *
 * The function signatures above are the contract — pages depend on them, not
 * on the implementation. Keep them stable when swapping.
 *
 * See docs/13-frontend-internals.md for the full data-flow diagram.
 */

import type {
  DraftRequestBody,
  LineItem,
  QuoteDetail,
  QuoteLineItem,
  QuoteStatus,
  QuoteSummary,
} from "@/lib/types";
import { MOCK_CATALOG } from "@/data/mocks/catalog";
import {
  MOCK_QUOTE_SUMMARIES,
  MOCK_CUSTOMERS,
  getMockQuoteDetail,
  listMockQuoteDetails,
  totalCumulativeCost,
} from "@/data/mocks/quotes";

// --- In-memory mutable state (mock-only) ---------------------------------
//
// Module-level state survives across server-component re-renders in the same
// Node process — enough to demo edits, approvals, and new draft creation
// without needing a database. Real persistence is Chat A's domain.

interface MutableState {
  quotes: Map<string, QuoteDetail>;
  summaries: QuoteSummary[];
}

const STATE: MutableState = (() => {
  const quotes = new Map<string, QuoteDetail>();
  for (const q of listMockQuoteDetails()) {
    // Clone so mutations don't mutate the seed module exports.
    quotes.set(q.quote.id, structuredClone(q));
  }
  return {
    quotes,
    summaries: structuredClone(MOCK_QUOTE_SUMMARIES),
  };
})();

// --- Read paths -----------------------------------------------------------

export async function listQuotes(opts: { status?: QuoteStatus | "all"; search?: string } = {}): Promise<QuoteSummary[]> {
  let rows = STATE.summaries.slice();
  if (opts.status && opts.status !== "all") {
    rows = rows.filter((r) => r.status === opts.status);
  }
  if (opts.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.customer_name.toLowerCase().includes(q) ||
        r.customer_email.toLowerCase().includes(q) ||
        r.project_type.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return rows;
}

export async function getQuote(id: string): Promise<QuoteDetail | null> {
  return STATE.quotes.get(id) ?? null;
}

export async function listLineItems(): Promise<LineItem[]> {
  return MOCK_CATALOG.slice();
}

export async function cumulativeCost(): Promise<number> {
  // Sum from current state so newly-drafted quotes contribute.
  let total = 0;
  for (const q of STATE.quotes.values()) total += q.quote.total_cost_usd;
  return total;
}

// --- Mutations (server-action targets) ------------------------------------

export interface CreateDraftResult {
  quote_id: string;
}

export async function createDraft(body: DraftRequestBody): Promise<CreateDraftResult> {
  // Mock implementation: pick a representative existing quote as the "fresh
  // draft" so the review page has plausible content to render. Real Chat A
  // implementation will run the agent chain.
  const seed = getMockQuoteDetail("q_2026_0042");
  if (!seed) throw new Error("mock seed missing");

  const newId = `q_demo_${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const cloned: QuoteDetail = structuredClone(seed);
  cloned.quote.id = newId;
  cloned.quote.created_at = now;
  cloned.quote.updated_at = now;
  cloned.quote.raw_notes = body.raw_notes;
  cloned.quote.project_type = body.project_type || cloned.quote.project_type;
  cloned.quote.status = "draft_ready";
  cloned.quote.sent_at = null;
  cloned.quote.outcome_at = null;
  cloned.quote.outcome_notes = null;
  cloned.quote.pdf_url = null;
  cloned.customer = {
    id: `cust_demo_${Date.now().toString(36)}`,
    name: body.customer.name,
    email: body.customer.email,
    phone: body.customer.phone || null,
    address: body.customer.address,
    created_at: now,
  };
  cloned.quote.customer_id = cloned.customer.id;
  cloned.line_items = cloned.line_items.map((li) => ({ ...li, quote_id: newId }));
  cloned.audit_log = cloned.audit_log.map((entry, idx) => ({
    ...entry,
    id: `al_${newId}_${idx + 1}`,
    quote_id: newId,
    created_at: new Date(Date.now() - (cloned.audit_log.length - idx) * 1500).toISOString(),
  }));

  STATE.quotes.set(newId, cloned);
  STATE.summaries.unshift({
    id: cloned.quote.id,
    customer_name: cloned.customer.name,
    customer_email: cloned.customer.email,
    project_type: cloned.quote.project_type,
    status: cloned.quote.status,
    total_amount: cloned.quote.total_amount,
    needs_render: cloned.quote.needs_render,
    total_cost_usd: cloned.quote.total_cost_usd,
    created_at: cloned.quote.created_at,
    sent_at: null,
  });

  return { quote_id: newId };
}

export interface PatchLineItemInput {
  id: string;
  quantity?: number;
  unit_price_snapshot?: number;
  notes?: string;
}

export interface PatchQuoteInput {
  proposal_markdown?: string;
  line_items?: PatchLineItemInput[];
}

export async function patchQuote(quoteId: string, patch: PatchQuoteInput): Promise<QuoteDetail> {
  const detail = STATE.quotes.get(quoteId);
  if (!detail) throw new Error(`Quote not found: ${quoteId}`);

  if (patch.line_items) {
    detail.line_items = detail.line_items.map((li) => {
      const incoming = patch.line_items!.find((p) => p.id === li.id);
      if (!incoming) return li;
      const quantity = incoming.quantity ?? li.quantity;
      const unit_price = incoming.unit_price_snapshot ?? li.unit_price_snapshot;
      const notes = incoming.notes ?? li.notes;
      return {
        ...li,
        quantity,
        unit_price_snapshot: unit_price,
        line_total: Math.round(quantity * unit_price * 100) / 100,
        notes,
      };
    });
    detail.quote.total_amount = sumLineItems(detail.line_items);
    detail.quote.needs_render = detail.quote.total_amount > 30000;
  }

  if (patch.proposal_markdown !== undefined) {
    detail.quote.proposal_markdown = patch.proposal_markdown;
  }

  detail.quote.updated_at = new Date().toISOString();
  syncSummary(detail);

  return detail;
}

export interface SendResult {
  pdf_url: string;
  sent_at: string;
}

export async function sendQuote(quoteId: string): Promise<SendResult> {
  const detail = STATE.quotes.get(quoteId);
  if (!detail) throw new Error(`Quote not found: ${quoteId}`);

  const sent_at = new Date().toISOString();
  const pdf_url = `https://example.com/proposals/${quoteId}.pdf`;

  detail.quote.status = "sent";
  detail.quote.sent_at = sent_at;
  detail.quote.pdf_url = pdf_url;
  detail.quote.updated_at = sent_at;
  syncSummary(detail);

  return { pdf_url, sent_at };
}

export async function setOutcome(
  quoteId: string,
  outcome: "accepted" | "rejected" | "lost",
  notes: string
): Promise<QuoteDetail> {
  const detail = STATE.quotes.get(quoteId);
  if (!detail) throw new Error(`Quote not found: ${quoteId}`);
  detail.quote.status = outcome;
  detail.quote.outcome_at = new Date().toISOString();
  detail.quote.outcome_notes = notes;
  detail.quote.updated_at = detail.quote.outcome_at;
  syncSummary(detail);
  return detail;
}

// --- Helpers --------------------------------------------------------------

function sumLineItems(items: QuoteLineItem[]): number {
  return Math.round(items.reduce((sum, li) => sum + li.line_total, 0) * 100) / 100;
}

function syncSummary(detail: QuoteDetail): void {
  const idx = STATE.summaries.findIndex((s) => s.id === detail.quote.id);
  const summary: QuoteSummary = {
    id: detail.quote.id,
    customer_name: detail.customer.name,
    customer_email: detail.customer.email,
    project_type: detail.quote.project_type,
    status: detail.quote.status,
    total_amount: detail.quote.total_amount,
    needs_render: detail.quote.needs_render,
    total_cost_usd: detail.quote.total_cost_usd,
    created_at: detail.quote.created_at,
    sent_at: detail.quote.sent_at,
  };
  if (idx >= 0) STATE.summaries[idx] = summary;
  else STATE.summaries.unshift(summary);
}

// Re-export so tests / scripts can poke directly if needed.
export const _internals = { STATE, MOCK_CUSTOMERS, totalCumulativeCost };
