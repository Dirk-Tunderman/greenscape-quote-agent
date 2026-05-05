import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-stone-gray/40 rounded-lg bg-caliche-white px-6 py-14 text-center",
        className
      )}
    >
      <p className="font-serif text-2xl text-saguaro-black">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-stone-gray max-w-md mx-auto">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
