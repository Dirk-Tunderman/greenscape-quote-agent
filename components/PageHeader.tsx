import type { ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.2em] text-stone-gray font-medium">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-4xl text-saguaro-black leading-tight tracking-tightest-display">
          {title}
        </h1>
        <div className="rule" />
        {description ? (
          <p className="text-stone-gray text-base max-w-2xl pt-1">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
