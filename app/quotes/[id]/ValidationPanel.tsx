import type { ValidationResult } from "@/lib/types";

export function ValidationPanel({ result }: { result: ValidationResult | null }) {
  if (!result) {
    return (
      <p className="text-sm text-stone-gray italic">No validation result yet.</p>
    );
  }

  if (result.pass) {
    return (
      <div className="border-l-4 border-success-green bg-success-green/10 px-4 py-3 rounded-r">
        <p className="text-sm font-medium text-saguaro-black">Validation passed</p>
        <p className="text-xs text-stone-gray mt-1">
          All checks cleared — totals match line items, all required sections present, no hallucinated items.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border-l-4 border-error-brick bg-error-brick/10 px-4 py-3 rounded-r">
        <p className="text-sm font-medium text-error-brick">Validation flagged {result.issues.length} issue{result.issues.length === 1 ? "" : "s"}</p>
        <p className="text-xs text-stone-gray mt-1">
          The agent retried once. Review and resolve before sending.
        </p>
      </div>
      <ul className="space-y-2">
        {result.issues.map((issue, idx) => (
          <li
            key={idx}
            className="border border-adobe rounded-md px-4 py-3 bg-caliche-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-saguaro-black/80">
                  {issue.severity === "error" ? "Error" : "Warning"} · {issue.check}
                </p>
                <p className="text-sm text-saguaro-black mt-1">{issue.detail}</p>
                {issue.suggested_fix ? (
                  <p className="text-xs text-stone-gray mt-1.5">
                    <span className="font-medium text-stone-gray">Suggested fix —</span> {issue.suggested_fix}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
