import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { listLineItems } from "@/data/store";
import { titleCase } from "@/lib/utils";
import type { LineItem } from "@/lib/types";
import { AddLineItemForm } from "./AddLineItemForm";
import { EditableLineItemRow } from "./EditableLineItemRow";

export const metadata = {
  title: "Catalog · Greenscape Quote Agent",
};

// Always re-fetch after a new item is added (router.refresh() in the form).
export const dynamic = "force-dynamic";

export default async function LineItemsPage() {
  const items = await listLineItems();
  const grouped = groupByCategory(items);
  const totalCount = items.length;
  const existingCategories = grouped.map((g) => g.category);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pricing catalog"
        title="Line items"
        description={`${totalCount} items across ${grouped.length} categories. New items become available to the agent on the next quote.`}
      />

      <AddLineItemForm existingCategories={existingCategories} />

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
                    <Th className="text-right w-44">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item, idx) => (
                    <EditableLineItemRow
                      key={item.id}
                      item={item}
                      existingCategories={existingCategories}
                      rowBgClass={idx % 2 === 0 ? "bg-caliche-white" : "bg-adobe/40"}
                    />
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

function groupByCategory(items: LineItem[]): Array<{ category: string; items: LineItem[] }> {
  const map = new Map<string, LineItem[]>();
  for (const it of items) {
    if (!map.has(it.category)) map.set(it.category, []);
    map.get(it.category)!.push(it);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}
