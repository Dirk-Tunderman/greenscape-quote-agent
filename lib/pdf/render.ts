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
