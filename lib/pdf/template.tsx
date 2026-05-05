/**
 * Branded PDF template for the customer-facing proposal.
 *
 * react-pdf does not parse markdown — it renders React elements. We build
 * the page tree directly from the structured data (priced_items, customer,
 * quote.payment_schedule, etc.) — the proposal markdown stored on the quote
 * is the admin-facing edit surface; THIS template is what the customer sees.
 *
 * Both surfaces are rendered from the same source data, so they should
 * always match in content. If Marcus edits the markdown the PDF still
 * regenerates from line items, not from the markdown — keeping the PDF
 * structurally consistent with the priced_items table.
 *
 * Sections (in render order):
 *   - Cover page (proposal #, customer name, address, date, brand mark)
 *   - Greeting (synthesized; PDF doesn't yet pull markdown's greeting line)
 *   - Scope summary (auto-generated from line item categories)
 *   - Detailed Scope & Pricing table (grouped by category; tabular numerals)
 *   - Project total (terracotta accent line)
 *   - Render badge if needs_render (>$30K)
 *   - Exclusions
 *   - Timeline
 *   - Warranty
 *   - Terms (per-quote payment schedule)
 *   - Signature
 *
 * Fonts: react-pdf's bundled Helvetica + Times-Roman to avoid depending on
 * a network fetch at render time. (We tried Google Fonts CDN URLs; they
 * 404'd on Inter weight 600.) Day-1 swap to local Inter/Cormorant via
 * `Font.register({ src: "/fonts/Inter-Regular.ttf" })` once a font asset
 * pipeline lands.
 *
 * Brand colors mirror tailwind.config.ts: Mojave Green / Sandstone /
 * Caliche White / Adobe / Sunset Terracotta.
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Customer, Quote, QuoteLineItem } from "@/lib/types";

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
    fontSize: 20,
    fontWeight: 600,
    color: COLORS.mojaveGreen,
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.sandstone,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 4,
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
    marginTop: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 2,
    borderTopColor: COLORS.terracotta,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Times-Roman",
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.saguaro,
    marginRight: 14,
  },
  totalAmount: {
    fontFamily: "Times-Roman",
    fontSize: 24,
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
  termsText: {
    fontSize: 9,
    color: COLORS.stone,
    marginBottom: 4,
    lineHeight: 1.5,
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
  /** Optional greeting paragraph; if omitted we synthesize a short one. */
  greeting?: string;
  /** Optional scope summary bullets; if omitted we synthesize from line items. */
  scope_summary?: string[];
  /** Bullets for "what's NOT included" — kills dispute risk per research Q4. */
  exclusions?: string[];
}

const DEFAULT_EXCLUSIONS = [
  "HOA submission fees beyond what's noted in the line items",
  "Plant material outside any explicit allowance",
  "Demolition or repair of items not listed in the scope",
  "Site work outside the defined project zones",
  "Permit fees beyond Phoenix municipal standard",
];

const DEFAULT_WARRANTY = [
  "2-year workmanship warranty on hardscape installation",
  "1-year warranty on irrigation components",
  "90-day warranty on plant material",
  "All manufacturer warranties pass through to you",
];

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

function defaultScopeSummary(line_items: QuoteLineItem[]): string[] {
  // Group by category, summarize.
  const byCat = new Map<string, QuoteLineItem[]>();
  for (const li of line_items) {
    const arr = byCat.get(li.category) ?? [];
    arr.push(li);
    byCat.set(li.category, arr);
  }
  const lines: string[] = [];
  for (const [cat, items] of byCat) {
    if (cat === "universal") continue;
    const main = items[0];
    if (main.unit === "sq_ft" || main.unit === "linear_ft") {
      lines.push(`${main.line_item_name_snapshot} — ${formatNumber(main.quantity)} ${main.unit.replace("_", " ")}`);
    } else {
      lines.push(main.line_item_name_snapshot);
    }
    for (const sub of items.slice(1)) {
      lines.push(`  · ${sub.line_item_name_snapshot}`);
    }
  }
  return lines;
}

export function ProposalPdf({
  customer,
  quote,
  line_items,
  greeting,
  scope_summary,
  exclusions,
}: ProposalPdfProps) {
  const total = line_items.reduce((s, li) => s + Number(li.line_total), 0);
  const proposalNumber = `GP-${quote.id.slice(0, 8).toUpperCase()}`;
  const dateStr = formatDate(quote.created_at);
  const summary = scope_summary ?? defaultScopeSummary(line_items);
  const exclusionList = exclusions ?? DEFAULT_EXCLUSIONS;
  const greetingText =
    greeting ??
    `Thanks for walking the yard. The scope below reflects what we discussed — clear pricing, premium materials, no surprises. Any questions, call me directly.`;
  const paymentSchedule =
    (quote.payment_schedule as { milestone: string; pct: number }[] | undefined) ?? [
      { milestone: "deposit", pct: 30 },
      { milestone: "mobilization", pct: 30 },
      { milestone: "midpoint", pct: 30 },
      { milestone: "completion", pct: 10 },
    ];

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
        {/* Greeting */}
        <Text style={styles.sectionHeading}>{customer.name}</Text>
        <Text style={styles.paragraph}>{greetingText}</Text>

        {/* Scope summary */}
        <Text style={styles.sectionHeading}>Scope summary</Text>
        {summary.map((line, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}

        {/* Pricing */}
        <Text style={styles.sectionHeading}>Pricing</Text>
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

        {quote.needs_render && (
          <Text style={styles.renderBadge}>
            This project includes a 3D render from Carlos so you can see the design before fabrication.
          </Text>
        )}

        {/* Exclusions */}
        <Text style={styles.sectionHeading}>Exclusions</Text>
        {exclusionList.map((line, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}

        {/* Timeline */}
        <Text style={styles.sectionHeading}>Timeline</Text>
        <Text style={styles.paragraph}>
          We&apos;re currently booking ~6 weeks out. Once the deposit is in, the build runs in
          phases. Phoenix heat means crews work 7-hour days; we plan around it. You&apos;ll get a
          weekly update every Friday until completion.
        </Text>

        {/* Warranty */}
        <Text style={styles.sectionHeading}>Warranty</Text>
        {DEFAULT_WARRANTY.map((line, i) => (
          <View key={i} style={styles.bullet}>
            <Text style={styles.bulletDot}>·</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}

        {/* Terms */}
        <Text style={styles.sectionHeading}>Terms & next steps</Text>
        {paymentSchedule.map((m, i) => (
          <Text key={i} style={styles.termsText}>
            · {m.pct}% at {m.milestone}
          </Text>
        ))}
        <Text style={styles.termsText}>· Proposal valid for 30 days from the date above.</Text>
        <Text style={styles.termsText}>· Change orders are priced and signed before any change in scope.</Text>
        <Text style={styles.termsText}>· See Warranty section above for coverage details.</Text>

        {/* Signature */}
        <Text style={styles.sectionHeading}>Signature</Text>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureCol}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureCaption}>Customer signature · {customer.name}</Text>
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

        <Text style={styles.pageFooter} fixed>
          Greenscape Pro · Phoenix, AZ · Proposal {proposalNumber}
        </Text>
      </Page>
    </Document>
  );
}
