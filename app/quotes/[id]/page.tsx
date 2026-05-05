/**
 * /quotes/[id] — review · edit · approve · audit a single quote.
 *
 * Most complex page in the app. This file is a Server Component that fetches
 * the QuoteDetail and composes ~7 smaller pieces:
 *
 *   ValidationPanel ── shown only when validation_failed (with retry hints)
 *   AmbiguityList   ── flag_ambiguity output, severity-coloured callouts
 *   LineItemsTable  ── inline-edit cells, optimistic UI, server-action save
 *   ProposalEditor  ── tabbed preview/markdown editor
 *   ApproveBar      ── header + sticky-bottom; opens send confirmation modal
 *   AuditLogModal   ── per-skill cost/duration/tokens/status table
 *   OutcomePanel    ── shown after sent; records accepted/rejected/lost
 *
 * `readOnly` is computed once from quote.status — sent/accepted/rejected/lost
 * locks all editing surfaces. Keep that as the single rule; don't duplicate
 * the check inside child components.
 *
 * `dynamic = "force-dynamic"` because the in-memory store mutates and we want
 * fresh reads. Once Chat A's API is wired in, this stays — fetching from a
 * real DB still benefits from no-store semantics on a per-quote view.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { getQuote } from "@/data/store";
import { formatCurrency, formatCurrencyWhole, formatDateTime, titleCase } from "@/lib/utils";
import { AmbiguityList } from "./AmbiguityList";
import { LineItemsTable } from "./LineItemsTable";
import { ProposalEditor } from "./ProposalEditor";
import { ApproveBar } from "./ApproveBar";
import { AuditLogModal } from "./AuditLogModal";
import { ValidationPanel } from "./ValidationPanel";
import { OutcomePanel } from "./OutcomePanel";
import { CustomerCard } from "./CustomerCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `${id} · Greenscape Quote Agent` };
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getQuote(id);
  if (!detail) notFound();

  const { quote, customer, line_items, artifacts, audit_log } = detail;
  // Editing is locked only after Marcus marks an outcome (accepted / rejected /
  // lost). Generating a PDF (status=sent) is not terminal — Marcus can keep
  // editing line items, sections, anything, and re-export the PDF as needed.
  const readOnly =
    quote.status === "accepted" ||
    quote.status === "rejected" ||
    quote.status === "lost";
  const pdfGenerated = quote.status === "sent" || !!quote.pdf_url;

  const scopeLabels = artifacts.scope.map(
    (s, i) => `${i + 1}. ${titleCase(s.category)} — ${s.description.slice(0, 50)}${s.description.length > 50 ? "…" : ""}`
  );

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Link
          href="/quotes"
          className="text-xs text-stone-gray hover:text-saguaro-black inline-flex items-center gap-1"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M6 2 L2 5 L6 8" />
          </svg>
          All quotes
        </Link>
        <PageHeader
          eyebrow={`Quote ${quote.id}`}
          title={customer.name}
          description={`${quote.project_type} · ${customer.address}`}
          actions={
            <div className="flex items-center gap-3">
              <StatusBadge status={quote.status} />
              <ApproveBar
                quoteId={quote.id}
                customerName={customer.name}
                customerEmail={customer.email}
                total={quote.total_amount}
                status={quote.status}
              />
            </div>
          }
        />
      </div>

      {pdfGenerated && quote.sent_at ? (
        <div className="border-l-4 border-success-green bg-success-green/10 px-4 py-3 rounded-r text-sm">
          PDF generated{" "}
          <span className="text-saguaro-black">{formatDateTime(quote.sent_at)}</span>
          {quote.pdf_url ? (
            <>
              {" · "}
              <a
                href={quote.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="text-mojave-green hover:underline underline-offset-4"
              >
                Download last PDF
              </a>
            </>
          ) : null}
          {!readOnly ? (
            <span className="ml-2 text-stone-gray">— edits below regenerate the PDF on next download.</span>
          ) : null}
        </div>
      ) : null}

      {/* Top grid: customer info + agent summary */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Customer"
            subtitle={readOnly ? undefined : "Click any field to edit."}
          />
          <CardBody>
            <CustomerCard
              quoteId={quote.id}
              customer={customer}
              projectType={quote.project_type}
              createdAt={quote.created_at}
              readOnly={readOnly}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Agent run" />
          <CardBody className="space-y-3 text-sm">
            <Detail label="API cost" value={<span className="tnum">{formatCurrency(quote.total_cost_usd)}</span>} />
            <Detail label="Skill calls" value={audit_log.length.toString()} />
            <Detail
              label="Validation"
              value={
                artifacts.validation
                  ? artifacts.validation.pass
                    ? <span className="text-success-green">Passed</span>
                    : <span className="text-error-brick">{artifacts.validation.issues.length} issues</span>
                  : "—"
              }
            />
            <div className="pt-2">
              <AuditLogModal entries={audit_log} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Validation panel — only show if there's a result */}
      {artifacts.validation && !artifacts.validation.pass ? (
        <Card>
          <CardHeader title="Validation issues" />
          <CardBody>
            <ValidationPanel result={artifacts.validation} />
          </CardBody>
        </Card>
      ) : null}

      {/* Two-column: scope + ambiguities | raw notes */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Extracted scope"
            subtitle="What the agent pulled out of the site walk notes."
          />
          <CardBody className="space-y-3">
            {artifacts.scope.length === 0 ? (
              <p className="text-sm text-stone-gray italic">No scope items extracted.</p>
            ) : (
              <ul className="divide-y divide-adobe -my-2">
                {artifacts.scope.map((s, idx) => (
                  <li key={idx} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-stone-gray uppercase tracking-wider mb-0.5">
                        {idx + 1}. {titleCase(s.category)}
                      </p>
                      <p className="text-sm text-saguaro-black">{s.description}</p>
                      {s.material_notes ? (
                        <p className="text-xs text-stone-gray mt-0.5">{s.material_notes}</p>
                      ) : null}
                    </div>
                    <div className="text-right shrink-0">
                      {s.dimensions ? (
                        <p className="text-sm tnum text-saguaro-black">
                          {s.dimensions.quantity ?? "—"}{" "}
                          <span className="text-xs text-stone-gray">{s.dimensions.unit.replace("_", " ")}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-stone-gray">no dimension</p>
                      )}
                      <CertaintyChip certainty={s.certainty} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Ambiguities"
            subtitle={`${artifacts.ambiguities.length} flagged`}
          />
          <CardBody>
            <AmbiguityList items={artifacts.ambiguities} scopeLabels={scopeLabels} />
          </CardBody>
        </Card>
      </div>

      {/* Line items + total */}
      <Card>
        <CardHeader
          title="Line items"
          subtitle="Edit any cell inline. Add or remove items as needed. Totals recompute on save."
          action={
            <span className="text-xs text-stone-gray">
              {line_items.length} item{line_items.length === 1 ? "" : "s"}
              {quote.needs_render ? (
                <span className="ml-3 inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sunset-terracotta/15 text-sunset-terracotta font-medium">
                  &gt; $30K
                </span>
              ) : null}
            </span>
          }
        />
        <CardBody>
          <LineItemsTable
            quoteId={quote.id}
            initialItems={line_items}
            readOnly={readOnly}
          />
        </CardBody>
      </Card>

      {/* Raw notes */}
      <Card>
        <CardHeader title="Site walk notes" subtitle="Marcus's input — kept for reference." />
        <CardBody>
          <pre className="whitespace-pre-wrap text-sm text-stone-gray leading-relaxed font-sans">
            {quote.raw_notes}
          </pre>
        </CardBody>
      </Card>

      {/* Proposal editor */}
      <Card>
        <CardHeader
          title="Proposal draft"
          subtitle={readOnly ? "Read-only — outcome is recorded." : "Each section is editable. Click Save proposal to commit your edits."}
        />
        <CardBody>
          <ProposalEditor
            quoteId={quote.id}
            initialMarkdown={quote.proposal_markdown}
            readOnly={readOnly}
            lineItems={line_items}
            total={Number(quote.total_amount)}
            paymentSchedule={quote.payment_schedule}
          />
        </CardBody>
      </Card>

      {/* Outcome (only after sent) */}
      {(quote.status === "sent" || quote.status === "accepted" || quote.status === "rejected" || quote.status === "lost") ? (
        <Card>
          <CardHeader title="Outcome" />
          <CardBody>
            <OutcomePanel quoteId={quote.id} status={quote.status} outcomeNotes={quote.outcome_notes} />
          </CardBody>
        </Card>
      ) : null}

      {/* Bottom action bar */}
      {!readOnly ? (
        <div className="sticky bottom-0 -mx-6 md:-mx-8 px-6 md:px-8 py-4 bg-caliche-white/95 backdrop-blur border-t border-adobe flex items-center justify-between gap-3 z-30">
          <div className="text-sm">
            <span className="text-stone-gray">Total</span>
            <span className="ml-3 font-serif text-2xl text-saguaro-black tnum">
              {formatCurrencyWhole(quote.total_amount)}
            </span>
          </div>
          <ApproveBar
            quoteId={quote.id}
            customerName={customer.name}
            customerEmail={customer.email}
            total={quote.total_amount}
            status={quote.status}
          />
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-gray">{label}</p>
      <p className="mt-1 text-sm text-saguaro-black">{value}</p>
    </div>
  );
}

function CertaintyChip({ certainty }: { certainty: "high" | "medium" | "low" }) {
  const cls =
    certainty === "high"
      ? "text-success-green"
      : certainty === "medium"
        ? "text-warning-amber"
        : "text-error-brick";
  return (
    <p className={`text-xs ${cls} mt-1`}>
      {certainty} certainty
    </p>
  );
}
