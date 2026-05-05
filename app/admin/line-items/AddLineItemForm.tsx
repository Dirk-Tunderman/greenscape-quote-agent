"use client";

/**
 * Inline form for adding a new line item to the catalog.
 *
 * Posts to /api/line-items. On success, refreshes the page (server-side)
 * so the new item appears in its category section. Categories that don't
 * yet exist are created on the fly — the agent's match_pricing skill
 * reads the live category list at run time, so a brand-new category is
 * available to the next quote with no code change. See decision log D38/D39.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Field, Input, Select, Textarea } from "@/components/Input";
import { Card } from "@/components/Card";
import { titleCase } from "@/lib/utils";
import type { LineItemUnit } from "@/lib/types";

const UNITS: LineItemUnit[] = ["sq_ft", "linear_ft", "each", "zone", "hour", "lump_sum"];

const UNIT_LABELS: Record<LineItemUnit, string> = {
  sq_ft: "Square feet",
  linear_ft: "Linear feet",
  each: "Each",
  zone: "Zone",
  hour: "Hour",
  lump_sum: "Lump sum",
};

const NEW_CATEGORY_SENTINEL = "__new__";

interface AddLineItemFormProps {
  existingCategories: string[];
}

interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export function AddLineItemForm({ existingCategories }: AddLineItemFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryChoice, setCategoryChoice] = useState<string>(existingCategories[0] ?? NEW_CATEGORY_SENTINEL);
  const [newCategory, setNewCategory] = useState("");

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          + Add line item
        </Button>
      </div>
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);

    const rawCategory =
      categoryChoice === NEW_CATEGORY_SENTINEL ? newCategory.trim() : categoryChoice;

    const body = {
      category: rawCategory,
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      unit: String(formData.get("unit") ?? "each"),
      unit_price: Number(formData.get("unit_price") ?? 0),
      item_type: String(formData.get("item_type") ?? "fixed"),
    };

    try {
      const res = await fetch("/api/line-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiError | null;
        if (errBody?.fieldErrors) {
          const flat = Object.entries(errBody.fieldErrors)
            .map(([k, v]) => `${k}: ${(v ?? []).join(", ")}`)
            .join(" · ");
          setError(flat || errBody.error || "Validation failed");
        } else {
          setError(errBody?.error ?? `Insert failed (${res.status})`);
        }
        return;
      }

      // Reset + close + refresh server data
      setOpen(false);
      setNewCategory("");
      setCategoryChoice(existingCategories[0] ?? NEW_CATEGORY_SENTINEL);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-saguaro-black">Add to catalog</h2>
        <button
          type="button"
          className="text-sm text-stone-gray hover:text-saguaro-black"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </header>

      <form
        action={handleSubmit}
        className="grid md:grid-cols-2 gap-5"
      >
        <Field label="Category" htmlFor="category" required>
          <Select
            id="category"
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value)}
          >
            {existingCategories.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
            <option value={NEW_CATEGORY_SENTINEL}>+ New category…</option>
          </Select>
          {categoryChoice === NEW_CATEGORY_SENTINEL && (
            <Input
              id="new_category"
              className="mt-2"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. outdoor lighting"
              autoFocus
            />
          )}
        </Field>

        <Field label="Unit" htmlFor="unit" required>
          <Select id="unit" name="unit" defaultValue="each">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Name" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Travertine paver patio — premium grade"
            required
          />
        </Field>

        <Field label="Item type" htmlFor="item_type">
          <Select id="item_type" name="item_type" defaultValue="fixed">
            <option value="fixed">Fixed</option>
            <option value="allowance">Allowance (known-unknown shown to customer)</option>
            <option value="custom">Custom (Marcus prices manually)</option>
          </Select>
        </Field>

        <div className="md:col-span-2">
          <Field label="Description" htmlFor="description" required>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="What it is, in 1 sentence — used by the agent to match scope items."
              required
            />
          </Field>
        </div>

        <Field label="Unit price (USD)" htmlFor="unit_price" required>
          <Input
            id="unit_price"
            name="unit_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            required
          />
        </Field>

        <div className="md:col-span-2 flex items-center justify-between gap-4 border-t border-adobe pt-5">
          <p className="text-xs text-stone-gray">
            Saved items become available to the agent on the next quote — no code change needed.
          </p>
          <Button type="submit" disabled={submitting || isPending}>
            {submitting || isPending ? "Saving…" : "Save line item"}
          </Button>
        </div>

        {error && (
          <p className="md:col-span-2 text-sm text-error-brick" role="alert">
            {error}
          </p>
        )}
      </form>
    </Card>
  );
}
