/**
 * CustomerCard — inline-editable customer details panel.
 *
 * Click any field (name, email, phone, address) to edit; blur or Enter to
 * commit. Each commit fires updateCustomerAction which PATCHes
 * /api/customers/[id] and revalidates the quote page.
 *
 * Optimistic UI: the new value renders immediately; on server error the
 * value reverts to the last committed state.
 *
 * `readOnly` (outcome states only — accepted/rejected/lost) renders all
 * fields as plain text.
 */
"use client";

import { useState, useTransition } from "react";
import type { Customer } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { updateCustomerAction } from "./actions";

export function CustomerCard({
  quoteId,
  customer,
  projectType,
  createdAt,
  readOnly,
}: {
  quoteId: string;
  customer: Customer;
  projectType: string;
  createdAt: string;
  readOnly: boolean;
}) {
  const [data, setData] = useState<Customer>(customer);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const commit = (field: keyof Customer, value: string) => {
    if (field === "phone") {
      // empty → null
      const next = value === "" ? null : value;
      if (next === data.phone) return;
      setData({ ...data, phone: next });
      setError(null);
      startTransition(async () => {
        const res = await updateCustomerAction(quoteId, data.id, { phone: next });
        if (!res.ok) {
          setError(res.error);
          setData({ ...data });
        }
      });
      return;
    }
    if ((data as unknown as Record<string, unknown>)[field] === value) return;
    if (value.trim() === "") {
      // name / email / address are required — ignore empty commits
      return;
    }
    const next = { ...data, [field]: value };
    setData(next);
    setError(null);
    startTransition(async () => {
      const res = await updateCustomerAction(quoteId, data.id, { [field]: value });
      if (!res.ok) {
        setError(res.error);
        setData(data);
      }
    });
  };

  return (
    <div className="space-y-1">
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <Field
          label="Name"
          value={data.name}
          readOnly={readOnly}
          onCommit={(v) => commit("name", v)}
        />
        <Field
          label="Email"
          value={data.email}
          readOnly={readOnly}
          onCommit={(v) => commit("email", v)}
          renderValue={(v) => (
            <a
              href={`mailto:${v}`}
              className="text-mojave-green hover:underline underline-offset-4"
              onClick={(e) => e.stopPropagation()}
            >
              {v}
            </a>
          )}
        />
        <Field
          label="Phone"
          value={data.phone ?? ""}
          readOnly={readOnly}
          onCommit={(v) => commit("phone", v)}
          placeholder="(602) 555-0148"
          allowEmpty
        />
        <Field
          label="Address"
          value={data.address}
          readOnly={readOnly}
          onCommit={(v) => commit("address", v)}
        />
        <Static label="Project title" value={projectType} />
        <Static label="Created" value={formatDate(createdAt)} />
      </div>
      <div className="text-xs h-4">
        {pending ? <span className="text-stone-gray">Saving…</span> : null}
        {error ? <span className="text-error-brick">{error}</span> : null}
      </div>
    </div>
  );
}

function Static({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-gray">{label}</p>
      <p className="mt-1 text-sm text-saguaro-black">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  readOnly,
  onCommit,
  renderValue,
  placeholder,
  allowEmpty,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onCommit: (v: string) => void;
  renderValue?: (v: string) => React.ReactNode;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const display = renderValue ? renderValue(value) : value || (
    <span className="text-stone-gray italic">—</span>
  );

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-gray">{label}</p>
      {readOnly ? (
        <p className="mt-1 text-sm text-saguaro-black">{display}</p>
      ) : editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const v = draft.trim();
            if (!allowEmpty && v === "") return;
            onCommit(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          placeholder={placeholder}
          className="mt-1 w-full text-sm bg-caliche-white border border-mojave-green rounded px-1.5 py-0.5 text-saguaro-black focus:outline-none focus:ring-2 focus:ring-mojave-green/30"
          aria-label={`Edit ${label}`}
        />
      ) : (
        <button
          type="button"
          className="mt-1 w-full text-left text-sm text-saguaro-black hover:bg-mojave-green/5 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          aria-label={`Edit ${label}`}
        >
          {display}
        </button>
      )}
    </div>
  );
}
