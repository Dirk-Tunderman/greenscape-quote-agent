"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import type { AuditLogEntry } from "@/lib/types";
import { formatCurrency, formatDateTime, formatDuration, titleCase } from "@/lib/utils";

export function AuditLogModal({ entries }: { entries: AuditLogEntry[] }) {
  const [open, setOpen] = useState(false);

  const totalCost = entries.reduce((s, e) => s + e.cost_usd, 0);
  const totalDuration = entries.reduce((s, e) => s + e.duration_ms, 0);
  const totalTokensIn = entries.reduce((s, e) => s + e.input_tokens, 0);
  const totalTokensOut = entries.reduce((s, e) => s + e.output_tokens, 0);
  const failures = entries.filter((e) => !e.success).length;

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        View audit log
        <span className="ml-1.5 text-stone-gray">
          ({entries.length} call{entries.length === 1 ? "" : "s"})
        </span>
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Agent audit log" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Calls" value={entries.length.toString()} />
            <Metric label="Total cost" value={formatCurrency(totalCost)} highlight />
            <Metric label="Total duration" value={formatDuration(totalDuration)} />
            <Metric
              label="Tokens (in / out)"
              value={`${totalTokensIn.toLocaleString()} / ${totalTokensOut.toLocaleString()}`}
            />
          </div>
          {failures > 0 ? (
            <div className="border-l-4 border-error-brick bg-error-brick/10 px-4 py-2.5 text-sm text-error-brick">
              {failures} call{failures === 1 ? "" : "s"} failed validation — see "Result" column.
            </div>
          ) : null}

          <div className="overflow-x-auto -mx-6 md:mx-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-adobe text-saguaro-black">
                  <Th>#</Th>
                  <Th>Skill</Th>
                  <Th>Model</Th>
                  <Th className="text-right">Tokens</Th>
                  <Th className="text-right">Duration</Th>
                  <Th className="text-right">Cost</Th>
                  <Th>Result</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.id} className={idx % 2 === 0 ? "bg-caliche-white" : "bg-adobe/40"}>
                    <Td className="text-stone-gray tnum">{idx + 1}</Td>
                    <Td className="text-saguaro-black font-medium">
                      {titleCase(e.skill_name)}
                    </Td>
                    <Td className="font-mono text-[10px] text-stone-gray">{e.model}</Td>
                    <Td className="text-right tnum text-stone-gray">
                      {e.input_tokens.toLocaleString()} / {e.output_tokens.toLocaleString()}
                    </Td>
                    <Td className="text-right tnum text-stone-gray">
                      {formatDuration(e.duration_ms)}
                    </Td>
                    <Td className="text-right tnum text-saguaro-black">
                      {formatCurrency(e.cost_usd)}
                    </Td>
                    <Td>
                      {e.success ? (
                        <span className="text-success-green">OK</span>
                      ) : (
                        <span className="text-error-brick" title={e.error ?? ""}>
                          Failed
                        </span>
                      )}
                    </Td>
                    <Td className="text-stone-gray whitespace-nowrap">
                      {formatDateTime(e.created_at)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-adobe rounded-md px-3 py-2.5 bg-caliche-white">
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-gray">{label}</p>
      <p
        className={
          "mt-1 tnum " +
          (highlight ? "text-saguaro-black font-serif text-lg" : "text-saguaro-black text-sm font-medium")
        }
      >
        {value}
      </p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-3 py-2.5 border-b border-adobe last:border-b-0 align-top ${className}`}>
      {children}
    </td>
  );
}
