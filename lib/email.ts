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
