"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input, Select } from "@/components/Input";
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/types";

const STATUSES: Array<{ value: QuoteStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft_ready", label: "Draft ready" },
  { value: "validation_failed", label: "Validation failed" },
  { value: "sending", label: "Sending" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "lost", label: "Lost" },
  { value: "drafting", label: "Drafting" },
];

export function QuotesFilterBar({
  initialStatus,
  initialSearch,
}: {
  initialStatus: string;
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end gap-3 md:gap-4",
        pending && "opacity-70"
      )}
    >
      <div className="flex-1 min-w-0">
        <label
          htmlFor="search"
          className="block text-xs uppercase tracking-[0.2em] text-stone-gray mb-1.5"
        >
          Search
        </label>
        <Input
          id="search"
          name="search"
          type="search"
          placeholder="Customer name, email, project type, quote ID"
          defaultValue={initialSearch}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>
      <div className="md:w-56">
        <label
          htmlFor="status"
          className="block text-xs uppercase tracking-[0.2em] text-stone-gray mb-1.5"
        >
          Status
        </label>
        <Select
          id="status"
          name="status"
          defaultValue={initialStatus}
          onChange={(e) => update("status", e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
