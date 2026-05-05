/**
 * Branded PDF template for the customer-facing proposal.
 *
 * react-pdf does not parse markdown — it renders React elements. We take
 * the parsed sections (same parser the on-screen editor uses) and walk
 * them, rendering each section's body as paragraphs and bullet lists.
 * Two sections carry structured data and are NOT taken from the markdown
 * body — they are re-derived from the live data so the PDF stays in
 * lockstep with the line items panel and the quote's payment schedule:
 *
 *   - Detailed Scope & Pricing → table from `line_items` + total
 *   - Terms & Next Steps      → payment schedule (%, no $) + LLM/edited
 *                                "rest" body
 *
 * The first parsed section is rendered as a greeting paragraph (no
 * heading) — the cover page already shows "Prepared for {customer.name}"
 * so a duplicate H2 right under it would look redundant.
 *
 * Sections (in render order):
 *   - Cover page
 *   - Greeting (section 0 body, no heading)
 *   - For each remaining section: heading + body, with the two structured
 *     sections re-derived as above
 *   - Signature block (fixed)
 *   - Page footer (fixed)
 *
 * Fonts: react-pdf's bundled Helvetica + Times-Roman (no network fetch).
 * Brand colors mirror tailwind.config.ts.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Customer, PaymentScheduleItem, Quote, QuoteLineItem } from "@/lib/types";
import { DEFAULT_PAYMENT_SCHEDULE } from "@/lib/types";
import {
  isScopePricingSection,
  isSignatureSection,
  isTermsSection,
  parsePdfBody,
  parseSections,
  stripPaymentSchedule,
  type Section,
} from "@/lib/proposal/sections";

const COLORS = {
  mojaveGreen: "#2C4A3A",
  sandstone: "#D4B896",
  caliche: "#F8F4ED",
  adobe: "#E8DFD2",
  terracotta: "#B8623E",
  saguaro: "#1A1F1A",
  stone: "#6B7064",
  mesa: "#9B9F98",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 45,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: COLORS.saguaro,
    backgroundColor: "#ffffff",
    lineHeight: 1.55,
  },

  // Cover
  coverPage: {
    paddingTop: 100,
    paddingBottom: 54,
    paddingHorizontal: 45,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: COLORS.saguaro,
    backgroundColor: COLORS.caliche,
  },
  coverTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: COLORS.mojaveGreen,
  },
  coverWordmark: {
    fontFamily: "Times-Roman",
    fontSize: 56,
    fontWeight: 600,
    color: COLORS.mojaveGreen,
    marginBottom: 14,
  },
  coverPreparedFor: {
    fontFamily: "Helvetica",
    fontSize: 13,
    color: COLORS.stone,
    marginBottom: 4,
  },
  coverCustomerName: {
    fontFamily: "Times-Roman",
    fontSize: 28,
    fontWeight: 500,
    marginBottom: 16,
  },
  coverMeta: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.stone,
    marginBottom: 4,
  },
  coverFooter: {
    position: "absolute",
    bottom: 54,
    left: 45,
    right: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverLogoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coverLogoMark: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.mojaveGreen,
    color: COLORS.caliche,
    fontFamily: "Times-Roman",
    fontSize: 16,
    fontWeight: 600,
    textAlign: "center",
    paddingTop: 5,
    marginRight: 10,
  },
  coverLogoText: {
    fontFamily: "Times-Roman",
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.mojaveGreen,
  },
  coverFooterTagline: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.stone,
  },

  // Body
  sectionHeading: {
    fontFamily: "Times-Roman",
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.mojaveGreen,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sandstone,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletDot: {
    width: 12,
    color: COLORS.mojaveGreen,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
  },

  // Pricing table
  table: {
    marginTop: 6,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.adobe,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sandstone,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica",
    fontWeight: 600,
    fontSize: 9.5,
    color: COLORS.saguaro,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.adobe,
  },
  tableRowAlt: {
    backgroundColor: "#fafaf6",
  },
  cellDescription: { width: "55%", fontSize: 10 },
  cellQty: { width: "12%", fontSize: 10, textAlign: "right" },
  cellUnit: { width: "10%", fontSize: 10, color: COLORS.stone },
  cellPrice: { width: "12%", fontSize: 10, textAlign: "right" },
  cellTotal: { width: "11%", fontSize: 10, textAlign: "right", fontWeight: 600 },

  // Total
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.terracotta,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Times-Roman",
    fontSize: 16,
    fontWeight: 600,
    color: COLORS.saguaro,
    marginRight: 14,
  },
  totalAmount: {
    fontFamily: "Times-Roman",
    fontSize: 22,
    fontWeight: 600,
    color: COLORS.mojaveGreen,
  },

  // Render flag
  renderBadge: {
    marginTop: 12,
    padding: 8,
    backgroundColor: COLORS.adobe,
    color: COLORS.saguaro,
    fontSize: 9.5,
  },

  // Signature
  signatureBlock: {
    marginTop: 28,
    flexDirection: "row",
    gap: 28,
  },
  signatureCol: {
    flex: 1,
  },
  signatureLine: {
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.saguaro,
    marginBottom: 5,
  },
  signatureCaption: {
    fontSize: 9,
    color: COLORS.stone,
  },

  // Footer
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 45,
    right: 45,
    fontSize: 8,
    color: COLORS.mesa,
    textAlign: "center",
  },
});

interface ProposalPdfProps {
  customer: Customer;
  quote: Quote;
  line_items: QuoteLineItem[];
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2).replace(/\.?0+$/, "");
}

function formatDate(s: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(s),
  );
}

// -- Body fragments -------------------------------------------------------

/**
 * Render a section body (paragraphs + bullet lists) using react-pdf
 * primitives. Bold/italic/code is stripped to plain text inside the parser.
 */
function BodyBlocks({ body }: { body: string }) {
  const blocks = parsePdfBody(body);
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "para") {
          return (
            <Text key={i} style={styles.paragraph}>
              {b.text}
            </Text>
          );
        }
        return (
          <View key={i} style={{ marginBottom: 8 }}>
            {b.items.map((item, j) => (
              <View key={j} style={styles.bullet} wrap={false}>
                <Text style={styles.bulletDot}>·</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

function PricingTable({
  line_items,
  total,
}: {
  line_items: QuoteLineItem[];
  total: number;
}) {
  return (
    <>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cellDescription, styles.tableHeaderCell]}>Description</Text>
          <Text style={[styles.cellQty, styles.tableHeaderCell]}>Qty</Text>
          <Text style={[styles.cellUnit, styles.tableHeaderCell]}>Unit</Text>
          <Text style={[styles.cellPrice, styles.tableHeaderCell]}>Unit price</Text>
          <Text style={[styles.cellTotal, styles.tableHeaderCell]}>Total</Text>
        </View>
        {line_items.map((li, i) => (
          <View key={li.id || i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={styles.cellDescription}>{li.line_item_name_snapshot}</Text>
            <Text style={styles.cellQty}>{formatNumber(Number(li.quantity))}</Text>
            <Text style={styles.cellUnit}>{li.unit.replace("_", " ")}</Text>
            <Text style={styles.cellPrice}>{formatCurrency(Number(li.unit_price_snapshot))}</Text>
            <Text style={styles.cellTotal}>{formatCurrency(Number(li.line_total))}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Project total</Text>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
      </View>
    </>
  );
}

function PaymentScheduleBullets({ schedule }: { schedule: PaymentScheduleItem[] }) {
  const items = schedule.length > 0 ? schedule : DEFAULT_PAYMENT_SCHEDULE;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[styles.paragraph, { fontWeight: 600, marginBottom: 4 }]}>Payment schedule:</Text>
      {items.map((s, i) => (
        <View key={i} style={styles.bullet} wrap={false}>
          <Text style={styles.bulletDot}>·</Text>
          <Text style={styles.bulletText}>
            {s.pct}% {s.milestone}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SignatureGrid({ customerName }: { customerName: string }) {
  return (
    <View style={styles.signatureBlock} wrap={false}>
      <View style={styles.signatureCol}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureCaption}>Customer signature · {customerName}</Text>
        <View style={[styles.signatureLine, { height: 18, marginTop: 12 }]} />
        <Text style={styles.signatureCaption}>Date</Text>
      </View>
      <View style={styles.signatureCol}>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureCaption}>Marcus Tate · Greenscape Pro</Text>
        <View style={[styles.signatureLine, { height: 18, marginTop: 12 }]} />
        <Text style={styles.signatureCaption}>Date</Text>
      </View>
    </View>
  );
}

// -- Main -----------------------------------------------------------------

export function ProposalPdf({ customer, quote, line_items }: ProposalPdfProps) {
  const total = line_items.reduce((s, li) => s + Number(li.line_total), 0);
  const proposalNumber = `GP-${quote.id.slice(0, 8).toUpperCase()}`;
  const dateStr = formatDate(quote.created_at);
  const paymentSchedule = (quote.payment_schedule ?? DEFAULT_PAYMENT_SCHEDULE) as PaymentScheduleItem[];

  const { sections } = parseSections(quote.proposal_markdown ?? "");
  const greetingSection: Section | null = sections.length > 0 ? sections[0] : null;
  const restSections = sections.slice(1);
  // If the LLM produced its own signature section we render the structured
  // signature block under that section's heading; otherwise we append one.
  const hasSignatureSection = restSections.some((s) => isSignatureSection(s.title));

  return (
    <Document
      title={`Greenscape Pro Proposal — ${customer.name}`}
      author="Greenscape Pro"
      subject={`Proposal for ${customer.name}`}
    >
      {/* Cover page */}
      <Page size="LETTER" style={styles.coverPage}>
        <View style={styles.coverTopBar} />
        <Text style={styles.coverWordmark}>Proposal</Text>
        <Text style={styles.coverPreparedFor}>Prepared for</Text>
        <Text style={styles.coverCustomerName}>{customer.name}</Text>
        <Text style={styles.coverMeta}>{customer.address}</Text>
        <Text style={styles.coverMeta}>Proposal {proposalNumber} · {dateStr}</Text>

        <View style={styles.coverFooter}>
          <View style={styles.coverLogoRow}>
            <Text style={styles.coverLogoMark}>GP</Text>
            <Text style={styles.coverLogoText}>Greenscape Pro</Text>
          </View>
          <Text style={styles.coverFooterTagline}>Phoenix · hardscape & landscape design-build</Text>
        </View>
      </Page>

      {/* Body */}
      <Page size="LETTER" style={styles.page}>
        {/* Greeting (no heading — cover already shows the customer name) */}
        {greetingSection ? <BodyBlocks body={greetingSection.body} /> : null}

        {/* Remaining sections */}
        {restSections.map((s, i) => {
          if (isScopePricingSection(s.title)) {
            return (
              <View key={i} wrap={false}>
                <Text style={styles.sectionHeading}>{s.title}</Text>
                <PricingTable line_items={line_items} total={total} />
                {quote.needs_render && (
                  <Text style={styles.renderBadge}>
                    This project includes a 3D render from Carlos so you can see the design before
                    fabrication.
                  </Text>
                )}
              </View>
            );
          }
          if (isTermsSection(s.title)) {
            const restBody = stripPaymentSchedule(s.body);
            return (
              <View key={i}>
                <Text style={styles.sectionHeading}>{s.title}</Text>
                <PaymentScheduleBullets schedule={paymentSchedule} />
                <BodyBlocks body={restBody} />
              </View>
            );
          }
          if (isSignatureSection(s.title)) {
            // Use the LLM's heading but render our structured signature
            // block — the LLM's body is just placeholder lines for the
            // same fields (Customer / Date / Greenscape Pro / Date).
            return (
              <View key={i}>
                <Text style={styles.sectionHeading}>{s.title}</Text>
                <SignatureGrid customerName={customer.name} />
              </View>
            );
          }
          return (
            <View key={i}>
              <Text style={styles.sectionHeading}>{s.title}</Text>
              <BodyBlocks body={s.body} />
            </View>
          );
        })}

        {/* Append our signature block only if the LLM didn't already produce one */}
        {!hasSignatureSection ? (
          <>
            <Text style={styles.sectionHeading}>Signature</Text>
            <SignatureGrid customerName={customer.name} />
          </>
        ) : null}

        <Text style={styles.pageFooter} fixed>
          Greenscape Pro · Phoenix, AZ · Proposal {proposalNumber}
        </Text>
      </Page>
    </Document>
  );
}
