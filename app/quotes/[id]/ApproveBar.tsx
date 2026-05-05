"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { approveAndSendAction } from "./actions";

export function ApproveBar({
  quoteId,
  customerName,
  customerEmail,
  total,
  status,
}: {
  quoteId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const blocked = status !== "draft_ready";

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        await approveAndSendAction(quoteId);
      } catch (err) {
        // redirect throws — only real errors land here
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          setError(err.message);
        }
      }
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
        Approve and send
      </Button>

      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Send proposal to customer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={pending}>
              {pending ? "Sending…" : "Send now"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-saguaro-black">
          <p>
            This will generate the PDF and email{" "}
            <span className="font-medium">{customerName}</span> at{" "}
            <span className="font-mono text-xs bg-adobe/60 px-1.5 py-0.5 rounded">
              {customerEmail}
            </span>
            .
          </p>
          <p className="text-stone-gray">
            Project total at send:{" "}
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
