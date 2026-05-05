"use client";

/**
 * One catalog row with view/edit/delete state.
 *
 * View mode: text cells with "Edit" + "Delete" buttons in the actions column.
 * Edit mode: cells become inputs, Save/Cancel replace Edit/Delete.
 * Delete: confirm dialog → DELETE /api/line-items/[id] (soft delete, sets active=false).
 *
 * Soft delete keeps quote_line_items snapshots intact. The catalog query
 * filters active=true so the row disappears here on next refresh; the agent's
 * lookup_line_items also filters active=true so future quotes won't see it.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input, Select, Textarea } from "@/components/Input";
import { Button } from "@/components/Button";
import { formatCurrency } from "@/lib/utils";
import type { LineItem, LineItemUnit } from "@/lib/types";

const UNITS: LineItemUnit[] = ["sq_ft", "linear_ft", "each", "zone", "hour", "lump_sum"];

const UNIT_LABELS: Record<LineItemUnit, string> = {
  sq_ft: "sq ft",
  linear_ft: "linear ft",
  each: "each",
  zone: "zone",
  hour: "hour",
  lump_sum: "lump",
};

const ITEM_TYPES: LineItem["item_type"][] = ["fixed", "allowance", "custom"];

interface EditableLineItemRowProps {
  item: LineItem;
  /** Existing categories for the optional category-change dropdown */
  existingCategories: string[];
  /** Background utility from the parent for striping consistency */
  rowBgClass: string;
}

interface FormState {
  name: string;
  description: string;
  unit: LineItemUnit;
  unit_price: string; // string so the input doesn't fight controlled-number parsing
  item_type: LineItem["item_type"];
  category: string;
}

function toFormState(item: LineItem): FormState {
  return {
    name: item.name,
    description: item.description,
    unit: item.unit,
    unit_price: String(item.unit_price),
    item_type: item.item_type,
    category: item.category,
  };
}

export function EditableLineItemRow({
  item,
  existingCategories,
  rowBgClass,
}: EditableLineItemRowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => toFormState(item));

  function refreshList() {
    startTransition(() => router.refresh());
  }

  async function handleSave() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/line-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          unit: form.unit,
          unit_price: Number(form.unit_price),
          item_type: form.item_type,
          category: form.category,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `Update failed (${res.status})`);
        return;
      }
      setEditing(false);
      refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${item.name}" from the catalog? Existing quotes are unaffected (snapshot fields preserve history).`)) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/line-items/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `Delete failed (${res.status})`);
        return;
      }
      refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  function cancelEdit() {
    setForm(toFormState(item));
    setEditing(false);
    setError(null);
  }

  if (!editing) {
    return (
      <tr className={rowBgClass}>
        <td className="px-4 py-3 border-b border-adobe last:border-b-0 font-medium text-saguaro-black">
          {item.name}
          {item.item_type !== "fixed" && (
            <span className="ml-2 text-xs uppercase tracking-wider text-stone-gray">
              {item.item_type}
            </span>
          )}
        </td>
        <td className="px-4 py-3 border-b border-adobe last:border-b-0 text-stone-gray hidden md:table-cell">
          {item.description}
        </td>
        <td className="px-4 py-3 border-b border-adobe last:border-b-0 text-right text-stone-gray whitespace-nowrap">
          {UNIT_LABELS[item.unit]}
        </td>
        <td className="px-4 py-3 border-b border-adobe last:border-b-0 text-right tnum text-saguaro-black font-medium">
          {formatCurrency(item.unit_price)}
        </td>
        <td className="px-4 py-3 border-b border-adobe last:border-b-0 text-right whitespace-nowrap">
          <button
            type="button"
            className="text-sm text-mojave-green hover:underline disabled:opacity-50"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            Edit
          </button>
          <span className="text-stone-gray mx-2">·</span>
          <button
            type="button"
            className="text-sm text-error-brick hover:underline disabled:opacity-50"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "…" : "Remove"}
          </button>
          {error && (
            <p className="mt-1 text-xs text-error-brick" role="alert">
              {error}
            </p>
          )}
        </td>
      </tr>
    );
  }

  // Edit mode — full-width row replaces the standard row
  return (
    <tr className={rowBgClass}>
      <td colSpan={5} className="px-4 py-4 border-b border-adobe last:border-b-0">
        <div className="grid md:grid-cols-12 gap-3 items-start">
          <div className="md:col-span-4">
            <label className="block text-xs uppercase tracking-wider text-stone-gray mb-1">
              Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs uppercase tracking-wider text-stone-gray mb-1">
              Category
            </label>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {existingCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {!existingCategories.includes(form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-stone-gray mb-1">
              Unit
            </label>
            <Select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value as LineItemUnit })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-stone-gray mb-1">
              Unit price
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
            />
          </div>
          <div className="md:col-span-1 flex md:flex-col gap-1 md:items-end">
            <Button onClick={handleSave} disabled={pending} className="w-full">
              {pending ? "…" : "Save"}
            </Button>
            <button
              type="button"
              className="text-xs text-stone-gray hover:text-saguaro-black"
              onClick={cancelEdit}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
          <div className="md:col-span-9">
            <label className="block text-xs uppercase tracking-wider text-stone-gray mb-1">
              Description
            </label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Used by the agent to match scope items"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs uppercase tracking-wider text-stone-gray mb-1">
              Item type
            </label>
            <Select
              value={form.item_type}
              onChange={(e) =>
                setForm({ ...form, item_type: e.target.value as LineItem["item_type"] })
              }
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-error-brick" role="alert">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
