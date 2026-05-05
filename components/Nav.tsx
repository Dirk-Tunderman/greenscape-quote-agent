import Link from "next/link";
import { Brand } from "./Brand";
import { cumulativeCost } from "@/data/store";
import { formatCurrency } from "@/lib/utils";

export async function Nav() {
  const cost = await cumulativeCost();
  return (
    <header className="border-b border-adobe bg-caliche-white">
      <div className="mx-auto max-w-6xl px-6 md:px-8 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Brand />
          <nav aria-label="Primary" className="hidden sm:flex items-center gap-1 text-sm">
            <NavItem href="/quotes">Quotes</NavItem>
            <NavItem href="/quotes/new">New quote</NavItem>
            <NavItem href="/admin/line-items">Catalog</NavItem>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-xs text-stone-gray">
          <span className="hidden sm:inline">Session API spend</span>
          <span className="tnum text-saguaro-black font-medium">
            {formatCurrency(cost)}
          </span>
        </div>
      </div>
      <nav aria-label="Primary mobile" className="sm:hidden border-t border-adobe">
        <div className="mx-auto max-w-6xl px-6 flex items-center gap-1 text-sm overflow-x-auto">
          <NavItem href="/quotes">Quotes</NavItem>
          <NavItem href="/quotes/new">New</NavItem>
          <NavItem href="/admin/line-items">Catalog</NavItem>
        </div>
      </nav>
    </header>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-stone-gray hover:text-saguaro-black hover:bg-adobe/60 rounded-md transition-colors"
    >
      {children}
    </Link>
  );
}
