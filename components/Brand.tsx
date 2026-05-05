import Link from "next/link";

export function Brand({ as = "link" }: { as?: "link" | "div" }) {
  const inner = (
    <span className="inline-flex items-center gap-3">
      <span className="brand-mark">GP</span>
      <span className="font-serif text-lg leading-none text-saguaro-black">
        Greenscape Pro
      </span>
    </span>
  );
  if (as === "div") return inner;
  return (
    <Link href="/quotes" className="hover:opacity-90 transition-opacity">
      {inner}
    </Link>
  );
}
