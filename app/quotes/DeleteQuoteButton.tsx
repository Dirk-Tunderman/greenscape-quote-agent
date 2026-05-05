/**
 * DeleteQuoteButton — trash icon in each quotes-list row, opens a
 * confirmation modal, calls deleteQuoteAction, refreshes the page on
 * success.
 *
 * Sits on a server-rendered list, but is its own client island so the
 * surrounding table stays a server component. The modal uses the shared
 * <Modal> primitive (portal-based) so it always lands in the viewport.
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { deleteQuoteAction } from "./actions";

interface DeleteQuoteButtonProps {
  quoteId: string;
  customerName: string;
  projectTitle: string;
  total: number;
  status: string;
}

const LOCKED_STATUSES = new Set(["drafting", "sending", "accepted"]);

export function DeleteQuoteButton({
  quoteId,
  customerName,
  projectTitle,
  total,
  status,
}: DeleteQuoteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const locked = LOCKED_STATUSES.has(status);

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteQuoteAction(quoteId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => !locked && setOpen(true)}
        disabled={locked}
        title={
          locked
            ? status === "accepted"
              ? "Accepted quotes are locked"
              : `Cannot delete while ${status}`
            : "Delete quote"
        }
        aria-label="Delete quote"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-stone-gray hover:text-error-brick hover:bg-error-brick/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <TrashIcon />
      </button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Delete quote?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={pending}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-saguaro-black">
          <p>
            This permanently deletes the quote, its line items, audit log, and stored
            PDF. This cannot be undone.
          </p>
          <div className="rounded-md border border-adobe bg-adobe/30 px-4 py-3 space-y-1">
            <p>
              <span className="text-stone-gray">Customer: </span>
              <span className="font-medium">{customerName}</span>
            </p>
            <p>
              <span className="text-stone-gray">Project: </span>
              <span className="font-medium">{projectTitle}</span>
            </p>
            <p>
              <span className="text-stone-gray">Total: </span>
              <span className="font-medium tnum">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(total)}
              </span>
            </p>
          </div>
          <p className="text-xs text-stone-gray">
            The customer record is kept — they may have other quotes or be reused later.
          </p>
          {error ? (
            <p className="text-error-brick text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
