/**
 * Resend client + transactional send for proposal emails.
 *
 * DEPRECATED for v1 demo (Phase 2 candidate) — Marcus finalizes the PDF and
 * sends it to customers himself. The customer-facing email step was cut to
 * keep the human-in-the-loop control crisp; this function is retained as
 * working code for when the workflow expands. No live route imports it.
 *
 * From: `RESEND_FROM_EMAIL` (verified domain notifications.tunderman.io).
 * Subject: "Your Greenscape Pro proposal — {proposalNumber}"
 * Body: short plain-text in Marcus's voice (no HTML — keeps deliverability simple)
 * Attachment: the rendered PDF buffer
 */

import { Resend } from "resend";

let cached: Resend | null = null;
function client(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  cached = new Resend(key);
  return cached;
}

export interface SendQuoteEmailArgs {
  to: string;
  customerName: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
  proposalNumber: string;
  totalUsd: number;
}

const FROM_DEFAULT = "Greenscape Pro <quotes@greenscape.example>";

function plainBody(args: SendQuoteEmailArgs): string {
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(args.totalUsd);
  return [
    `Hi ${args.customerName.split(" ")[0]},`,
    "",
    `Attached is your Greenscape Pro proposal (${args.proposalNumber}). Total: ${total}.`,
    "",
    `Take your time reviewing — any questions, just reply to this email or call me directly.`,
    "",
    "— Marcus Tate",
    "Greenscape Pro",
  ].join("\n");
}

export async function sendQuoteEmail(args: SendQuoteEmailArgs): Promise<{ id: string }> {
  const from = process.env.RESEND_FROM_EMAIL || FROM_DEFAULT;
  const result = await client().emails.send({
    from,
    to: args.to,
    subject: `Your Greenscape Pro proposal — ${args.proposalNumber}`,
    text: plainBody(args),
    attachments: [
      {
        filename: args.pdfFilename,
        content: args.pdfBuffer,
      },
    ],
  });
  if (result.error) throw new Error(`Resend send failed: ${result.error.message}`);
  return { id: result.data?.id ?? "" };
}
