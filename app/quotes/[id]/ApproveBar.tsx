"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { approveAndDownloadAction } from "./actions";

/**
 * Approve & download PDF button + confirm modal.
 *
 * PDF generation is no longer terminal — Marcus can edit line items or
 * sections, re-click this button, and get a fresh PDF. The button label
 * adapts:
 *   - first time (`draft_ready` / `validation_failed`): "Approve & download PDF"
 *   - subsequent (`sent`): "Re-generate PDF"
 *
 * Hidden only on outcome states (accepted/rejected/lost) — those are
 * locked because the customer signed.
 */
export function ApproveBar({
  quoteId,
  customerName,
  total,
  status,
}: {
  quoteId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Outcome-locked states hide the button entirely.
  if (status === "accepted" || status === "rejected" || status === "lost") {
    return null;
  }
  // In-flight states block re-entry but keep the button visible (disabled).
  const blocked = status === "drafting" || status === "sending";
  const isReGenerate = status === "sent";

  const buttonLabel = isReGenerate ? "Re-generate PDF" : "Approve & download PDF";
  const modalTitle = isReGenerate ? "Re-generate proposal PDF" : "Generate proposal PDF";
  const ctaPending = pending ? (isReGenerate ? "Regenerating…" : "Generating…") : null;
  const ctaIdle = isReGenerate ? "Re-generate & download" : "Generate & download";

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveAndDownloadAction(quoteId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (typeof window !== "undefined") {
        window.open(res.pdf_url, "_blank", "noopener,noreferrer");
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        disabled={blocked}
        title={blocked ? `Cannot generate while status is "${status}"` : undefined}
      >
        {buttonLabel}
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={modalTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {ctaPending ?? ctaIdle}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-saguaro-black">
          <p>
            {isReGenerate
              ? "This regenerates the PDF for "
              : "This renders the branded PDF for "}
            <span className="font-medium">{customerName}</span>
            {isReGenerate
              ? ", replaces the stored copy, and opens it in a new tab. The previous URL is invalidated."
              : ", stores it, and opens it in a new tab so you can save or send it from there."}
          </p>
          <p className="text-stone-gray">
            Project total at generation:{" "}
            <span className="tnum text-saguaro-black font-medium">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(total)}
            </span>
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
