/**
 * LineItemsTable — inline edit + add + delete grid for quote line items.
 *
 * Save model: every change (cell edit, add, delete) sends the FULL items
 * array via saveLineItemsAction. Backend does drop+insert and recomputes
 * the quote total. Optimistic UI on every interaction; on server error
 * the optimistic state stays so the user can retry without losing input.
 *
 * Why full-list-replacement (instead of partial patches): adds and deletes
 * already need the full picture to round-trip cleanly, and putting all
 * three operations through one path removes diffing complexity.
 *
 * `readOnly=true` (outcome states only — accepted/rejected/lost) renders
 * cells as plain text and hides the add row + delete affordances. PDF
 * generation does NOT trigger readOnly — Marcus iterates freely until
 * outcome is recorded.
 */
"use client";

import { useMemo, useState, useTransition } from "react";
import type { ItemCategory, LineItemUnit, QuoteLineItem } from "@/lib/types";
import { formatCurrency, formatCurrencyWhole, titleCase } from "@/lib/utils";
import { saveLineItemsAction, type LineItemReplacement } from "./actions";

const UNIT_LABEL: Record<LineItemUnit, string> = {
  sq_ft: "sq ft",
  linear_ft: "lin ft",
  each: "each",
  zone: "zone",
  hour: "hour",
  lump_sum: "lump",
};

const UNIT_OPTIONS: LineItemUnit[] = ["each", "sq_ft", "linear_ft", "zone", "hour", "lump_sum"];

const CATEGORY_OPTIONS: ItemCategory[] = [
  "patio",
  "pergola",
  "fire_pit",
  "water_feature",
  "artificial_turf",
  "irrigation",
  "outdoor_kitchen",
  "retaining_wall",
  "universal",
];

function makeBlankItem(quoteId: string): QuoteLineItem {
  // tmp_ id signals "new row" — replaceLineItems strips it before sending,
  // so the server inserts it as a fresh row with a real UUID.
  const tmpId =
    "tmp_" +
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));
  return {
    id: tmpId,
    quote_id: quoteId,
    line_item_id: null,
    line_item_name_snapshot: "",
    category: "universal" as ItemCategory,
    unit: "each" as LineItemUnit,
    quantity: 1,
    unit_price_snapshot: 0,
    line_total: 0,
    notes: "",
  };
}

function toReplacement(it: QuoteLineItem): LineItemReplacement {
  return {
    id: it.id,
    line_item_id: it.line_item_id,
    line_item_name_snapshot: it.line_item_name_snapshot,
    category: it.category,
    unit: it.unit,
    quantity: it.quantity,
    unit_price_snapshot: it.unit_price_snapshot,
    notes: it.notes ?? "",
  };
}

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

  const persist = (next: QuoteLineItem[]) => {
    setItems(next);
    setError(null);
    // Skip the round-trip if a row has no name — that's a half-edited new
    // row; the server's zod schema doesn't reject empty strings, but it'd
    // pollute the table. Wait until the user types a name.
    if (next.some((li) => li.line_item_name_snapshot.trim() === "")) return;
    startTransition(async () => {
      const res = await saveLineItemsAction(quoteId, next.map(toReplacement));
      if (!res.ok) setError(res.error);
    });
  };

  const onCommit = (id: string, patch: Partial<QuoteLineItem>) => {
    const next = items.map((it) => {
      if (it.id !== id) return it;
      const merged = { ...it, ...patch };
      merged.line_total =
        Math.round(merged.quantity * merged.unit_price_snapshot * 100) / 100;
      return merged;
    });
    persist(next);
  };

  const onDelete = (id: string) => {
    persist(items.filter((it) => it.id !== id));
  };

  const onAdd = () => {
    persist([...items, makeBlankItem(quoteId)]);
  };

  const hasUnsavedNew = items.some((li) => li.line_item_name_snapshot.trim() === "");

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-6 md:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-adobe text-saguaro-black">
              <Th className="text-left">Item</Th>
              <Th className="text-right w-24">Qty</Th>
              <Th className="text-left w-24 hidden sm:table-cell">Unit</Th>
              <Th className="text-right w-32">Unit price</Th>
              <Th className="text-right w-32">Line total</Th>
              {!readOnly && <Th className="w-10" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <FragmentBlock key={g.category}>
                <tr className="bg-caliche-white border-t-2 border-sandstone/40">
                  <td colSpan={readOnly ? 5 : 6} className="px-4 pt-4 pb-2">
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
                      <TextCell
                        value={row.line_item_name_snapshot}
                        readOnly={readOnly}
                        placeholder="Description (e.g. Custom decorative coping)"
                        onCommit={(v) => onCommit(row.id, { line_item_name_snapshot: v })}
                        ariaLabel={`Description for line item`}
                      />
                      {row.notes ? (
                        <div className="text-xs text-stone-gray mt-0.5">{row.notes}</div>
                      ) : null}
                      {!readOnly && (
                        <div className="mt-1.5">
                          <select
                            value={row.category}
                            onChange={(e) =>
                              onCommit(row.id, { category: e.target.value as ItemCategory })
                            }
                            className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-adobe/60 hover:bg-mojave-green/15 text-stone-gray hover:text-saguaro-black focus:outline-none focus:ring-1 focus:ring-mojave-green/40 cursor-pointer border-0 transition-colors"
                            aria-label={`Category for ${row.line_item_name_snapshot || "line item"}`}
                            title="Move this item to a different category"
                          >
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {titleCase(c)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </Td>
                    <Td className="text-right">
                      <NumberCell
                        value={row.quantity}
                        readOnly={readOnly}
                        step={row.unit === "each" || row.unit === "zone" ? 1 : 0.5}
                        onCommit={(v) => onCommit(row.id, { quantity: v })}
                        aria-label={`Quantity for ${row.line_item_name_snapshot || "line item"}`}
                      />
                    </Td>
                    <Td className="text-stone-gray text-xs hidden sm:table-cell">
                      {readOnly ? (
                        UNIT_LABEL[row.unit]
                      ) : (
                        <select
                          value={row.unit}
                          onChange={(e) => onCommit(row.id, { unit: e.target.value as LineItemUnit })}
                          className="text-xs bg-transparent border-0 text-stone-gray hover:text-saguaro-black focus:outline-none focus:text-saguaro-black cursor-pointer"
                          aria-label={`Unit for ${row.line_item_name_snapshot || "line item"}`}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {UNIT_LABEL[u]}
                            </option>
                          ))}
                        </select>
                      )}
                    </Td>
                    <Td className="text-right">
                      <NumberCell
                        value={row.unit_price_snapshot}
                        readOnly={readOnly}
                        step={1}
                        money
                        onCommit={(v) => onCommit(row.id, { unit_price_snapshot: v })}
                        aria-label={`Unit price for ${row.line_item_name_snapshot || "line item"}`}
                      />
                    </Td>
                    <Td className="text-right tnum font-medium text-saguaro-black">
                      {formatCurrency(row.line_total)}
                    </Td>
                    {!readOnly && (
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => onDelete(row.id)}
                          className="text-stone-gray hover:text-error-brick text-lg leading-none px-1 py-0.5 rounded hover:bg-error-brick/10 transition-colors"
                          title="Remove this line item"
                          aria-label={`Remove ${row.line_item_name_snapshot || "line item"}`}
                        >
                          ×
                        </button>
                      </Td>
                    )}
                  </tr>
                ))}
                <tr className="bg-adobe/30">
                  <td
                    colSpan={readOnly ? 4 : 5}
                    className="px-4 py-2 text-right text-xs text-stone-gray"
                  >
                    Subtotal — {titleCase(g.category)}
                  </td>
                  <td className="px-4 py-2 text-right tnum text-sm text-saguaro-black border-b border-adobe">
                    {formatCurrency(g.subtotal)}
                  </td>
                  {!readOnly && <td className="border-b border-adobe" />}
                </tr>
              </FragmentBlock>
            ))}
            {!readOnly && (
              <tr>
                <td colSpan={6} className="px-4 pt-3 pb-2">
                  <button
                    type="button"
                    onClick={onAdd}
                    className="text-sm text-mojave-green hover:text-saguaro-black inline-flex items-center gap-2 px-3 py-1.5 border border-dashed border-mojave-green/40 hover:border-mojave-green rounded-md transition-colors"
                  >
                    <span className="text-base leading-none">+</span> Add line item
                  </button>
                  {hasUnsavedNew && (
                    <span className="ml-3 text-xs text-stone-gray italic">
                      New row needs a description before it saves.
                    </span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={readOnly ? 4 : 5} className="px-4 pt-5 pb-3 text-right">
                <span className="font-serif text-xl text-saguaro-black">Project total</span>
              </td>
              <td className="px-4 pt-5 pb-3 text-right">
                <span className="font-serif text-3xl text-saguaro-black tnum">
                  {formatCurrencyWhole(total)}
                </span>
              </td>
              {!readOnly && <td />}
            </tr>
            {total > 30000 ? (
              <tr>
                <td colSpan={readOnly ? 5 : 6} className="px-4 pb-2">
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

// Inline-edit cells -------------------------------------------------------

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

function TextCell({
  value,
  readOnly,
  placeholder,
  onCommit,
  ariaLabel,
}: {
  value: string;
  readOnly: boolean;
  placeholder?: string;
  onCommit: (v: string) => void;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (readOnly) {
    return <span className="font-medium text-saguaro-black">{value || "—"}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="text-left font-medium text-saguaro-black hover:bg-mojave-green/5 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 w-full"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label={ariaLabel}
      >
        {value || (
          <span className="text-stone-gray italic font-normal">{placeholder ?? "Click to edit"}</span>
        )}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft.trim());
  };

  return (
    <input
      autoFocus
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      placeholder={placeholder}
      className="w-full bg-caliche-white border border-mojave-green rounded px-1.5 py-0.5 text-sm text-saguaro-black focus:outline-none focus:ring-2 focus:ring-mojave-green/30"
      aria-label={ariaLabel}
    />
  );
}

function formatCount(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(2).replace(/\.?0+$/, "");
}

function Th({ children, className = "", ...rest }: { children?: React.ReactNode; className?: string; "aria-label"?: string }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${className}`} {...rest}>
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
