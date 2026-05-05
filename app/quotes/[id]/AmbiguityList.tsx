import type { Ambiguity } from "@/lib/types";

const SEVERITY_STYLES: Record<Ambiguity["severity"], string> = {
  blocker: "border-error-brick bg-error-brick/10",
  warn: "border-warning-amber bg-warning-amber/10",
  info: "border-info-sky bg-info-sky/10",
};

const SEVERITY_LABEL: Record<Ambiguity["severity"], string> = {
  blocker: "Blocker",
  warn: "Needs clarification",
  info: "Worth noting",
};

export function AmbiguityList({
  items,
  scopeLabels,
}: {
  items: Ambiguity[];
  scopeLabels: string[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-stone-gray italic">
        No ambiguities flagged. The agent had enough to work with.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((a, idx) => {
        const ref = a.scope_item_index >= 0 ? scopeLabels[a.scope_item_index] : "Project-wide";
        return (
          <li
            key={idx}
            className={`border-l-4 ${SEVERITY_STYLES[a.severity]} px-4 py-3 rounded-r`}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-saguaro-black/80">
                {SEVERITY_LABEL[a.severity]}
              </span>
              <span className="text-xs text-stone-gray text-right">
                Affects: <span className="text-saguaro-black">{ref ?? `Item ${a.scope_item_index + 1}`}</span>
              </span>
            </div>
            <p className="text-sm text-saguaro-black">{a.question}</p>
            <p className="mt-1.5 text-xs text-stone-gray">{a.why_it_matters}</p>
          </li>
        );
      })}
    </ul>
  );
}
