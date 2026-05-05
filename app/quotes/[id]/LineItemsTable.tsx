/**
 * LineItemsTable — inline-edit grid for quote line items.
 *
 * Pattern: optimistic-UI + server action.
 *   1. User clicks a price/qty cell → input renders in place (NumberCell)
 *   2. Blur or Enter commits the edit
 *   3. Local state updates immediately (line_total recomputed)
 *   4. updateLineItemsAction fires in a transition → server persists
 *   5. On error, error state is shown but the optimistic state stays so
 *      the user can retry without losing typing
 *
 * Items are grouped by category at render time with per-category subtotals.
 * Render-flag (>$30K) appears in tfoot.
 *
 * `readOnly=true` (sent/accepted/rejected/lost) renders cells as plain text
 * — no edit affordance, no NumberCell input.
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import type { QuoteLineItem } from "@/lib/types";
import { formatCurrency, formatCurrencyWhole, titleCase } from "@/lib/utils";
import { updateLineItemsAction, type UpdateLineItemPayload } from "./actions";

const UNIT_LABEL: Record<QuoteLineItem["unit"], string> = {
  sq_ft: "sq ft",
  linear_ft: "lin ft",
  each: "each",
  zone: "zone",
  hour: "hour",
  lump_sum: "lump",
};

export function LineItemsTable({
  quoteId,
  initialItems,
  readOnly,
}: {
  quoteId: string;
  initialItems: QuoteLineItem[];
  readOnly: boolean;
}) {
  const [items, setItems] = useState<QuoteLineItem[]>(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => items.reduce((s, li) => s + li.line_total, 0),
    [items]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, QuoteLineItem[]>();
    for (const li of items) {
      if (!map.has(li.category)) map.set(li.category, []);
      map.get(li.category)!.push(li);
    }
    return Array.from(map.entries()).map(([category, rows]) => ({
      category,
      rows,
      subtotal: rows.reduce((s, r) => s + r.line_total, 0),
    }));
  }, [items]);

  const onCommit = (id: string, patch: Omit<UpdateLineItemPayload, "id">) => {
    // Optimistic local update
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const quantity = patch.quantity ?? it.quantity;
        const unit_price = patch.unit_price_snapshot ?? it.unit_price_snapshot;
        return {
          ...it,
          quantity,
          unit_price_snapshot: unit_price,
          line_total: Math.round(quantity * unit_price * 100) / 100,
          notes: patch.notes ?? it.notes,
        };
      })
    );
    setError(null);
    startTransition(async () => {
      const res = await updateLineItemsAction(quoteId, [{ id, ...patch }]);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-6 md:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-adobe text-saguaro-black">
              <Th className="text-left">Item</Th>
              <Th className="text-right w-24">Qty</Th>
              <Th className="text-left w-20 hidden sm:table-cell">Unit</Th>
              <Th className="text-right w-32">Unit price</Th>
              <Th className="text-right w-32">Line total</Th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <FragmentBlock key={g.category}>
                <tr className="bg-caliche-white border-t-2 border-sandstone/40">
                  <td colSpan={5} className="px-4 pt-4 pb-2">
                    <span className="font-serif text-base text-saguaro-black">
                      {titleCase(g.category)}
                    </span>
                    <span className="ml-3 text-xs text-stone-gray">
                      {g.rows.length} {g.rows.length === 1 ? "item" : "items"}
                    </span>
                  </td>
                </tr>
                {g.rows.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? "bg-caliche-white" : "bg-adobe/40"}>
                    <Td>
                      <div className="font-medium text-saguaro-black">
                        {row.line_item_name_snapshot}
                      </div>
                      {row.notes ? (
                        <div className="text-xs text-stone-gray mt-0.5">{row.notes}</div>
                      ) : null}
                    </Td>
                    <Td className="text-right">
                      <NumberCell
                        value={row.quantity}
                        readOnly={readOnly}
                        step={row.unit === "each" || row.unit === "zone" ? 1 : 0.5}
                        onCommit={(v) => onCommit(row.id, { quantity: v })}
                        aria-label={`Quantity for ${row.line_item_name_snapshot}`}
                      />
                    </Td>
                    <Td className="text-stone-gray text-xs hidden sm:table-cell">
                      {UNIT_LABEL[row.unit]}
                    </Td>
                    <Td className="text-right">
                      <NumberCell
                        value={row.unit_price_snapshot}
                        readOnly={readOnly}
                        step={1}
                        money
                        onCommit={(v) => onCommit(row.id, { unit_price_snapshot: v })}
                        aria-label={`Unit price for ${row.line_item_name_snapshot}`}
                      />
                    </Td>
                    <Td className="text-right tnum font-medium text-saguaro-black">
                      {formatCurrency(row.line_total)}
                    </Td>
                  </tr>
                ))}
                <tr className="bg-adobe/30">
                  <td colSpan={4} className="px-4 py-2 text-right text-xs text-stone-gray">
                    Subtotal — {titleCase(g.category)}
                  </td>
                  <td className="px-4 py-2 text-right tnum text-sm text-saguaro-black border-b border-adobe">
                    {formatCurrency(g.subtotal)}
                  </td>
                </tr>
              </FragmentBlock>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="px-4 pt-5 pb-3 text-right">
                <span className="font-serif text-xl text-saguaro-black">Project total</span>
              </td>
              <td className="px-4 pt-5 pb-3 text-right">
                <span className="font-serif text-3xl text-saguaro-black tnum">
                  {formatCurrencyWhole(total)}
                </span>
              </td>
            </tr>
            {total > 30000 ? (
              <tr>
                <td colSpan={5} className="px-4 pb-2">
                  <div className="flex items-center justify-end gap-2 text-xs text-sunset-terracotta">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sunset-terracotta" aria-hidden />
                    Over $30K threshold — Carlos render brief recommended
                  </div>
                </td>
              </tr>
            ) : null}
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-stone-gray">
          {readOnly
            ? "Read-only — outcome is recorded."
            : pending
              ? "Saving…"
              : "Edits save automatically. Totals recompute as you type."}
        </span>
        {error ? <span className="text-error-brick">{error}</span> : null}
      </div>
    </div>
  );
}

// Tiny inline-edit number cell ---------------------------------------------

function NumberCell({
  value,
  readOnly,
  step = 1,
  money,
  onCommit,
  ...rest
}: {
  value: number;
  readOnly: boolean;
  step?: number;
  money?: boolean;
  onCommit: (v: number) => void;
  "aria-label"?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());

  if (readOnly) {
    return (
      <span className="tnum text-saguaro-black">
        {money ? formatCurrency(value) : formatCount(value)}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="tnum text-saguaro-black hover:bg-mojave-green/5 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 inline-flex items-center gap-1 group"
        onClick={() => {
          setDraft(value.toString());
          setEditing(true);
        }}
        aria-label={rest["aria-label"]}
      >
        {money ? formatCurrency(value) : formatCount(value)}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="opacity-0 group-hover:opacity-50 transition-opacity"
        >
          <path d="M7 1.5 L8.5 3 L3 8.5 L1 9 L1.5 7 Z" />
        </svg>
      </button>
    );
  }

  const commit = () => {
    const n = Number.parseFloat(draft);
    if (!Number.isFinite(n) || n < 0) {
      setEditing(false);
      return;
    }
    setEditing(false);
    if (n !== value) onCommit(Math.round(n * 100) / 100);
  };

  return (
    <input
      autoFocus
      type="number"
      step={step}
      min={0}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className="tnum text-right w-24 bg-caliche-white border border-mojave-green rounded px-1.5 py-0.5 text-sm text-saguaro-black focus:outline-none focus:ring-2 focus:ring-mojave-green/30"
      aria-label={rest["aria-label"]}
    />
  );
}

function formatCount(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(2).replace(/\.?0+$/, "");
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function FragmentBlock({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
