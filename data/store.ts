/**
 * data/store.ts — frontend-side data adapter.
 *
 * Live wire-up to Chat A's backend (no more mocks). Every function is a thin
 * wrapper over an /api/* call so pages and server actions stay decoupled from
 * fetch semantics.
 *
 * Why call our own routes instead of going to Supabase directly: keeps the
 * agent-orchestrator + audit-log + storage pipeline in one place (the API),
 * and lets the frontend stay portable if the backend ever moves.
 *
 * Endpoint map:
 *   listQuotes     → GET   /api/quotes?status=...
 *   getQuote       → GET   /api/quotes/[id]
 *   listLineItems  → GET   /api/line-items
 *   cumulativeCost → derived from /api/quotes
 *   createDraft    → POST  /api/agent/draft   (60–180s — orchestrator runs the agent chain)
 *   patchQuote     → PATCH /api/quotes/[id]   (full-replacement on line_items; backend recomputes total)
 *   downloadPdf    → POST  /api/quotes/[id]/send (renders PDF + uploads to Storage; email step is removed)
 *   setOutcome     → PATCH /api/quotes/[id]   (status + outcome_notes)
 *
 * `apiBase()` returns a loopback URL so server-side fetch works without
 * needing absolute public URL config. PORT is set by the systemd unit
 * (3100) in prod and defaults to 3000 in dev.
 */

import type {
  Customer,
  DraftRequestBody,
  ItemCategory,
  LineItem,
  LineItemUnit,
  Quote,
  QuoteDetail,
  QuoteSummary,
  QuoteStatus,
} from "@/lib/types";

function apiBase(): string {
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} → ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// --- Read paths -----------------------------------------------------------

export async function listQuotes(opts: {
  status?: QuoteStatus | "all";
  search?: string;
} = {}): Promise<QuoteSummary[]> {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  const path = params.toString() ? `/api/quotes?${params}` : "/api/quotes";
  const { quotes } = await api<{ quotes: QuoteSummary[] }>(path);

  // Server filters by status; search is applied client-side so we don't need
  // to add a /api endpoint for it. List size is capped at 200 server-side.
  let rows = quotes.slice();
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
  return rows;
}

export async function getQuote(id: string): Promise<QuoteDetail | null> {
  try {
    return await api<QuoteDetail>(`/api/quotes/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes(" → 404")) return null;
    throw err;
  }
}

export async function listLineItems(): Promise<LineItem[]> {
  const { line_items } = await api<{ line_items: LineItem[] }>("/api/line-items");
  return line_items;
}

export async function cumulativeCost(): Promise<number> {
  const { quotes } = await api<{ quotes: QuoteSummary[] }>("/api/quotes");
  return quotes.reduce((s, q) => s + Number(q.total_cost_usd ?? 0), 0);
}

// --- Mutations (server-action targets) ------------------------------------

export interface CreateDraftResult {
  quote_id: string;
}

export async function createDraft(body: DraftRequestBody): Promise<CreateDraftResult> {
  const result = await api<{ quote_id: string }>("/api/agent/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { quote_id: result.quote_id };
}

export interface PatchQuoteInput {
  proposal_markdown?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Apply a non-line-item patch to a quote (proposal_markdown today; could
 * grow to handle other top-level fields). For line items use
 * `replaceLineItems` — the backend uses drop+insert semantics, so a full
 * list is the natural unit of edit.
 */
export async function patchQuote(quoteId: string, patch: PatchQuoteInput): Promise<{ total: number }> {
  const body: Record<string, unknown> = {};
  if (patch.proposal_markdown !== undefined) {
    body.proposal_markdown = patch.proposal_markdown;
  }
  const { quote } = await api<{ quote: Quote }>(`/api/quotes/${quoteId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return { total: Number(quote.total_amount) };
}

/**
 * The shape the client sends per row. `id` is optional — only valid UUIDs
 * are passed through (so client-only ids like `tmp_abc` are stripped and
 * the backend treats the row as a fresh insert).
 */
export interface ReplacementLineItem {
  id?: string;
  line_item_id: string | null;
  line_item_name_snapshot: string;
  category: ItemCategory;
  unit: LineItemUnit;
  quantity: number;
  unit_price_snapshot: number;
  notes: string;
}

/**
 * Replace the full line-items list for a quote. Backend drops the existing
 * rows and inserts the new ones; the quote's total_amount is recomputed
 * server-side. Empty list = all line items removed.
 *
 * Use this for any line-item change (edit, add, delete) — the client
 * always sends the full state, so we don't need diff logic.
 */
export async function replaceLineItems(
  quoteId: string,
  items: ReplacementLineItem[]
): Promise<{ total: number }> {
  const body = {
    line_items: items.map((li) => ({
      ...(li.id && UUID_RE.test(li.id) ? { id: li.id } : {}),
      line_item_id: li.line_item_id,
      line_item_name_snapshot: li.line_item_name_snapshot,
      category: li.category,
      unit: li.unit,
      quantity: li.quantity,
      unit_price_snapshot: li.unit_price_snapshot,
      line_total: Math.round(li.quantity * li.unit_price_snapshot * 100) / 100,
      notes: li.notes ?? "",
    })),
  };
  const { quote } = await api<{ quote: Quote }>(`/api/quotes/${quoteId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return { total: Number(quote.total_amount) };
}

export interface DownloadPdfResult {
  pdf_url: string;
  sent_at: string;
}

/**
 * Triggers PDF render + upload via the (former-send) endpoint.
 * The endpoint no longer emails — it just renders + stores + marks `sent`,
 * which we now treat as "finalized & ready to download".
 */
export async function downloadPdf(quoteId: string): Promise<DownloadPdfResult> {
  const result = await api<{ pdf_url: string; sent_at: string }>(
    `/api/quotes/${quoteId}/send`,
    { method: "POST" }
  );
  return { pdf_url: result.pdf_url, sent_at: result.sent_at };
}

export async function setOutcome(
  quoteId: string,
  outcome: "accepted" | "rejected" | "lost",
  notes: string
): Promise<void> {
  await api(`/api/quotes/${quoteId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: outcome, outcome_notes: notes }),
  });
}

export interface CustomerPatch {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string;
}

export async function updateCustomer(
  customerId: string,
  patch: CustomerPatch
): Promise<Customer> {
  const { customer } = await api<{ customer: Customer }>(
    `/api/customers/${customerId}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return customer;
}
