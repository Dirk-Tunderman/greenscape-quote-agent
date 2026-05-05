/**
 * Thin wrapper around react-pdf's renderToBuffer. Returns a Node Buffer
 * suitable for Supabase Storage upload + Resend email attachment in one call.
 *
 * The element/Buffer dance is just to satisfy react-pdf's typing; the
 * runtime work is identical to JSX.
 */

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { ProposalPdf } from "./template";
import type { Customer, Quote, QuoteLineItem } from "@/lib/types";

export async function renderProposalPdf(
  args: { customer: Customer; quote: Quote; line_items: QuoteLineItem[] },
): Promise<Buffer> {
  const element = createElement(ProposalPdf, args) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
