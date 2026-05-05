"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { approveAndDownloadAction } from "./actions";

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

  const blocked = status !== "draft_ready";

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveAndDownloadAction(quoteId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Open the signed PDF in a new tab — Marcus reviews/saves from there.
      if (typeof window !== "undefined") {
        window.open(res.pdf_url, "_blank", "noopener,noreferrer");
      }
      setOpen(false);
      router.refresh();
    });
  };

  if (status === "sent" || status === "accepted" || status === "rejected" || status === "lost") {
    return null;
  }

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        disabled={blocked}
        title={blocked ? `Cannot approve while status is "${status}"` : undefined}
      >
        Approve & download PDF
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Generate proposal PDF"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? "Generating…" : "Generate & download"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-saguaro-black">
          <p>
            This will render the branded PDF for{" "}
            <span className="font-medium">{customerName}</span>, store it, and
            open it in a new tab so you can save or send it from there.
          </p>
          <p className="text-stone-gray">
            Project total at finalize:{" "}
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
