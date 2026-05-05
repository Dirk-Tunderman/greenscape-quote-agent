import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { QuotesFilterBar } from "./QuotesFilterBar";
import { DeleteQuoteButton } from "./DeleteQuoteButton";
import { listQuotes } from "@/data/store";
import { formatCurrency, formatCurrencyWhole, formatDate } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/types";

export const metadata = { title: "Quotes · Greenscape Quote Agent" };

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const search = sp.search ?? "";
  const quotes = await listQuotes({ status: status as QuoteStatus | "all", search });

  const totalSent = quotes.filter((q) => ["sent", "accepted", "rejected", "lost"].includes(q.status)).length;
  const totalQuoteValue = quotes
    .filter((q) => ["sent", "accepted"].includes(q.status))
    .reduce((sum, q) => sum + q.total_amount, 0);
  const cumulativeApiCost = quotes.reduce((s, q) => s + q.total_cost_usd, 0);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Quote history"
        title="Quotes"
        description="Every draft, every send, every outcome. Filter by status to focus."
        actions={
          <Link href="/quotes/new">
            <Button size="md">New quote</Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Quotes in view" value={quotes.length.toString()} />
        <Stat label="Total sent value" value={formatCurrencyWhole(totalQuoteValue)} hint={`${totalSent} sent or closed`} />
        <Stat label="Cumulative API cost" value={formatCurrency(cumulativeApiCost)} hint="Across visible quotes" />
      </div>

      <Card className="p-5 md:p-6">
        <QuotesFilterBar initialStatus={status} initialSearch={search} />
      </Card>

      {quotes.length === 0 ? (
        <EmptyState
          title="No quotes match"
          description={
            search || status !== "all"
              ? "Try clearing the filter, or start fresh with a new quote."
              : "No quotes yet. Create one to get started."
          }
          action={
            <Link href="/quotes/new">
              <Button>Create the first quote</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-adobe text-saguaro-black">
                  <Th>Quote</Th>
                  <Th>Customer</Th>
                  <Th className="hidden lg:table-cell">Project</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right hidden md:table-cell">API cost</Th>
                  <Th className="text-right">Created</Th>
                  <Th className="w-8"><span className="sr-only">Delete</span></Th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q, idx) => (
                  <tr
                    key={q.id}
                    className={idx % 2 === 0 ? "bg-caliche-white" : "bg-adobe/40"}
                  >
                    <Td>
                      <Link
                        href={`/quotes/${q.id}`}
                        className="font-mono text-xs text-mojave-green hover:underline underline-offset-4"
                      >
                        {q.id}
                      </Link>
                      {q.needs_render ? (
                        <span
                          className="ml-2 inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sunset-terracotta/15 text-sunset-terracotta font-medium"
                          title="Project total > $30K — render workflow recommended"
                        >
                          Render
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <div className="text-saguaro-black font-medium">{q.customer_name}</div>
                      <div className="text-xs text-stone-gray">{q.customer_email}</div>
                    </Td>
                    <Td className="text-stone-gray hidden lg:table-cell max-w-xs truncate">
                      {q.project_type}
                    </Td>
                    <Td>
                      <StatusBadge status={q.status} size="sm" />
                    </Td>
                    <Td className="text-right tnum font-medium">
                      {formatCurrencyWhole(q.total_amount)}
                    </Td>
                    <Td className="text-right tnum text-stone-gray hidden md:table-cell">
                      {formatCurrency(q.total_cost_usd)}
                    </Td>
                    <Td className="text-right text-stone-gray whitespace-nowrap">
                      {formatDate(q.created_at)}
                    </Td>
                    <Td className="text-right pl-2 pr-3">
                      <DeleteQuoteButton
                        quoteId={q.id}
                        customerName={q.customer_name}
                        projectTitle={q.project_type}
                        total={q.total_amount}
                        status={q.status}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-stone-gray">{label}</p>
      <p className="mt-2 font-serif text-3xl text-saguaro-black tnum">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-gray">{hint}</p> : null}
    </Card>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 border-b border-adobe last:border-b-0 align-top ${className}`}>
      {children}
    </td>
  );
}
