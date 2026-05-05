/**
 * StatusBadge — pill with semantic color, dot, and text label.
 *
 * Color is never the only signal (WCAG): the dot is decorative,
 * the label carries the meaning. Text matches the status enum from
 * lib/types.ts; if you add a status there, add a STYLES entry here
 * — TypeScript will fail loudly until you do.
 */
import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/types";

const STYLES: Record<QuoteStatus, { bg: string; fg: string; label: string }> = {
  drafting: { bg: "bg-info-sky/15", fg: "text-info-sky", label: "Drafting" },
  draft_ready: { bg: "bg-warning-amber/15", fg: "text-warning-amber", label: "Draft Ready" },
  validation_failed: { bg: "bg-error-brick/15", fg: "text-error-brick", label: "Validation Failed" },
  sending: { bg: "bg-info-sky/15", fg: "text-info-sky", label: "Sending" },
  sent: { bg: "bg-success-green/15", fg: "text-success-green", label: "Sent" },
  accepted: { bg: "bg-success-green", fg: "text-caliche-white", label: "Accepted" },
  rejected: { bg: "bg-error-brick", fg: "text-caliche-white", label: "Rejected" },
  lost: { bg: "bg-lost-gray/15", fg: "text-lost-gray", label: "Lost" },
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: QuoteStatus;
  size?: "sm" | "md";
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium tracking-tight rounded-full whitespace-nowrap",
        s.bg,
        s.fg,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
      )}
    >
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {s.label}
    </span>
  );
}
