/**
 * AuditContext — accumulates per-skill records during one orchestrator run
 * and flushes them as a batched insert into greenscape.audit_log at the end.
 *
 * Why batched (not per-call):
 * - One DB roundtrip instead of 5–9 (every quote logs that many skill calls)
 * - If the run dies mid-chain, the orchestrator's catch block still calls
 *   flush() so partial audits are preserved
 *
 * Cost-cap guardrail: orchestrator reads `audit.cost()` to decide whether
 * to spend the corrective retry of generate_proposal (only if total <
 * PER_QUOTE_BUDGET_USD).
 *
 * Storage: input + output payloads are JSON-stringified, truncated to
 * MAX_JSON_BYTES so the audit_log.input/output columns don't get bloated
 * by long markdown bodies. Truncated payloads are wrapped as
 * { __truncated: true, preview: "..." }.
 */

import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { CallResult } from "@/lib/anthropic";

export type SkillName =
  | "check_input_relevance"
  | "extract_scope"
  | "match_pricing"
  | "flag_ambiguity"
  | "generate_proposal"
  | "validate_output";

interface PendingEntry {
  skill_name: SkillName;
  model: string;
  input: unknown;
  output: unknown;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number;
  success: boolean;
  error: string | null;
}

const MAX_JSON_BYTES = 4_500;

function truncate(value: unknown): unknown {
  try {
    const s = JSON.stringify(value);
    if (s.length <= MAX_JSON_BYTES) return value;
    return { __truncated: true, preview: s.slice(0, MAX_JSON_BYTES) + "…" };
  } catch {
    return { __unserializable: true };
  }
}

export class AuditContext {
  private quoteId: string | null;
  private entries: PendingEntry[] = [];
  private totalCost = 0;

  constructor(quoteId: string | null) {
    this.quoteId = quoteId;
  }

  setQuoteId(id: string) {
    this.quoteId = id;
  }

  /** Total cost so far (USD). Used for $0.50 cap enforcement. */
  cost(): number {
    return this.totalCost;
  }

  record(args: {
    skill: SkillName;
    input: unknown;
    output: unknown;
    call: CallResult;
    success: boolean;
    error?: string | null;
  }): void {
    this.totalCost += args.call.cost.cost_usd;
    this.entries.push({
      skill_name: args.skill,
      model: args.call.model,
      input: truncate(args.input),
      output: truncate(args.output),
      input_tokens: args.call.cost.input_tokens,
      output_tokens: args.call.cost.output_tokens,
      cost_usd: args.call.cost.cost_usd,
      duration_ms: args.call.duration_ms,
      success: args.success,
      error: args.error ?? null,
    });
  }

  async flush(): Promise<void> {
    if (this.entries.length === 0) return;
    const supabase = getSupabaseAdmin();
    const rows = this.entries.map((e) => ({ quote_id: this.quoteId, ...e }));
    const { error } = await supabase.from("audit_log").insert(rows);
    if (error) {
      // Audit logging failure is non-fatal; surface but don't crash the run.
      // eslint-disable-next-line no-console
      console.error("audit_log insert failed:", error.message);
    }
    this.entries = [];
  }
}
