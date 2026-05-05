import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { listLineItems } from "@/data/store";
import { formatCurrency, titleCase } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

export const metadata = {
  title: "Catalog · Greenscape Quote Agent",
};

export default async function LineItemsPage() {
  const items = await listLineItems();
  const grouped = groupByCategory(items);
  const totalCount = items.length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Pricing catalog"
        title="Line items"
        description={`${totalCount} items across ${grouped.length} categories. Read-only — edits land in Phase 2.`}
      />

      <div className="space-y-10">
        {grouped.map(({ category, items: catItems }) => (
          <section key={category} className="space-y-4">
            <header className="flex items-baseline justify-between gap-4 border-b border-adobe pb-3">
              <h2 className="font-serif text-2xl text-saguaro-black">
                {titleCase(category)}
              </h2>
              <span className="text-xs uppercase tracking-[0.2em] text-stone-gray">
                {catItems.length} items
              </span>
            </header>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-adobe text-saguaro-black">
                    <Th className="text-left">Name</Th>
                    <Th className="text-left hidden md:table-cell">Description</Th>
                    <Th className="text-right">Unit</Th>
                    <Th className="text-right">Unit price</Th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={
                        idx % 2 === 0
                          ? "bg-caliche-white"
                          : "bg-adobe/40"
                      }
                    >
                      <Td className="font-medium text-saguaro-black">{item.name}</Td>
                      <Td className="text-stone-gray hidden md:table-cell">
                        {item.description}
                      </Td>
                      <Td className="text-right text-stone-gray whitespace-nowrap">
                        {formatUnit(item.unit)}
                      </Td>
                      <Td className="text-right tnum text-saguaro-black font-medium">
                        {item.unit_price === 0 && item.name.includes("overhead")
                          ? "incl."
                          : formatCurrency(item.unit_price)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 border-b border-adobe last:border-b-0 ${className}`}>
      {children}
    </td>
  );
}

function formatUnit(unit: LineItem["unit"]): string {
  return (
    {
      sq_ft: "sq ft",
      linear_ft: "linear ft",
      each: "each",
      zone: "zone",
      hour: "hour",
      lump_sum: "lump",
    } as Record<LineItem["unit"], string>
  )[unit];
}

function groupByCategory(items: LineItem[]): Array<{ category: string; items: LineItem[] }> {
  const map = new Map<string, LineItem[]>();
  for (const it of items) {
    if (!map.has(it.category)) map.set(it.category, []);
    map.get(it.category)!.push(it);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}
