/**
 * Orchestrator — the single entry point that turns a `DraftRequestBody`
 * (customer info + raw site walk notes) into a fully priced, validated quote
 * with persisted artifacts and a complete audit trail.
 *
 * Flow (sequential; one corrective retry of generate_proposal on validate fail):
 *
 *   1. Resolve customer (find by email or insert)
 *   2. Insert quotes row at status='drafting'
 *   3. extract_scope     (Sonnet)         → ScopeItem[]
 *   4. match_pricing     (Sonnet w/ tools) → priced QuoteLineItem[]
 *      verifyCatalogIds                   → reject hallucinated UUIDs
 *   5. flag_ambiguity    (Haiku)          → Ambiguity[] (max 5)
 *   6. generate_proposal (Sonnet)         → markdown
 *   7. validate_output   (Haiku + regex)  → {pass, issues}
 *      if !pass and budget remaining → retry generate_proposal once with
 *      corrective feedback, then re-validate
 *   8. Persist quote_line_items, update quotes row (status, total, markdown,
 *      total_cost_usd), flush audit_log
 *
 * Cost guardrail: PER_QUOTE_BUDGET_USD = $0.50, checked before the retry. If
 * the run fails mid-chain, the quotes row is marked validation_failed and
 * whatever audit entries exist are still flushed.
 *
 * Integration points:
 * - Calls Anthropic via lib/anthropic.ts (single SDK wrapper)
 * - Reads + writes Supabase via lib/db/supabase.ts (greenscape schema)
 * - Records every LLM call via lib/audit.ts → audit_log table
 *
 * Failure modes:
 * - Anthropic timeout (60s per call) → throws → status=validation_failed
 * - LLM returns malformed JSON → skill itself retries once, then throws
 * - match_pricing returns IDs not in catalog → throws
 * - validate_output rejects twice → status=validation_failed (Marcus reviews)
 */

import { checkInputRelevance } from "@/lib/skills/check_input_relevance";
import { extractScope } from "@/lib/skills/extract_scope";
import { matchPricing, verifyCatalogIds } from "@/lib/skills/match_pricing";
import { flagAmbiguity } from "@/lib/skills/flag_ambiguity";
import { generateProposal } from "@/lib/skills/generate_proposal";
import { validateOutput } from "@/lib/skills/validate_output";
import { AuditContext } from "@/lib/audit";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import type {
  Ambiguity,
  Customer,
  DraftRequestBody,
  Quote,
  QuoteLineItem,
  ScopeItem,
  ValidationResult,
} from "@/lib/types";

export const PER_QUOTE_BUDGET_USD = 0.5;

/**
 * Thrown when input quality gating rejects the draft request before any
 * quote row is created. The API route catches this and returns 400 with
 * the user-facing reason. No quote, no customer row, no audit cost beyond
 * the ~$0.001 of the relevance check (which IS audited with quote_id=null).
 *
 * Two trigger points:
 *  - Skill 0 (check_input_relevance) returns is_relevant=false + confidence=high
 *  - extract_scope returns the __no_scope exit
 */
export class InputRejectedError extends Error {
  reason_code: string;
  user_message: string;
  constructor(user_message: string, reason_code: string) {
    super(user_message);
    this.name = "InputRejectedError";
    this.reason_code = reason_code;
    this.user_message = user_message;
  }
}

export interface DraftResult {
  quote: Quote;
  customer: Customer;
  scope_items: ScopeItem[];
  priced_items: QuoteLineItem[];
  ambiguities: Ambiguity[];
  validation: ValidationResult;
  cost_usd: number;
  budget_exceeded: boolean;
}

export async function runDraft(body: DraftRequestBody): Promise<DraftResult> {
  const supabase = getSupabaseAdmin();
  const audit = new AuditContext(null);

  // 0. Pre-flight relevance check (Haiku, ~$0.001) — cheapest possible defense
  // against accidental garbage input. Catches "wrong content type" (recipe,
  // mom conversation, lorem ipsum) BEFORE we burn Sonnet tokens or create a
  // quote row. See docs/09-decision-log.md D41.
  const relevance = await checkInputRelevance(
    {
      raw_notes: body.raw_notes,
      project_type: body.project_type,
    },
    audit,
  );
  if (!relevance.is_relevant && relevance.confidence === "high") {
    await audit.flush();
    throw new InputRejectedError(
      `This doesn't look like site walk notes — ${relevance.reason} (detected: ${relevance.detected_content}). Did you paste the wrong text?`,
      `not_site_walk:${relevance.detected_content}`,
    );
  }

  // 1. Resolve customer (find by email or insert)
  let customer: Customer;
  {
    const { data: existing } = await supabase
      .from("customers")
      .select("*")
      .eq("email", body.customer.email)
      .maybeSingle();

    if (existing) {
      customer = existing as Customer;
    } else {
      const { data: inserted, error } = await supabase
        .from("customers")
        .insert({
          name: body.customer.name,
          email: body.customer.email,
          phone: body.customer.phone || null,
          address: body.customer.address,
        })
        .select("*")
        .single();
      if (error || !inserted) throw new Error(`Customer insert failed: ${error?.message}`);
      customer = inserted as Customer;
    }
  }

  // 2. Create draft quote shell
  const { data: quoteRow, error: quoteErr } = await supabase
    .from("quotes")
    .insert({
      customer_id: customer.id,
      project_type: body.project_type,
      raw_notes: body.raw_notes,
      status: "drafting",
    })
    .select("*")
    .single();
  if (quoteErr || !quoteRow) throw new Error(`Quote insert failed: ${quoteErr?.message}`);
  const quote = quoteRow as Quote;
  audit.setQuoteId(quote.id);

  try {
    // 3. extract_scope (may early-exit with __no_scope)
    const scopeResult = await extractScope(
      {
        raw_notes: body.raw_notes,
        project_metadata: {
          project_type: body.project_type,
          hoa: body.hoa,
          budget_tier: body.budget_tier,
        },
      },
      audit,
    );

    if (scopeResult.kind === "no_scope") {
      // Backstop for inputs that pass Skill 0 relevance but contain nothing
      // extractable (e.g., "I want to do something in my backyard"). Persist
      // the reason as an artifact + audit, then throw so the API surfaces
      // the message and the quote row is marked as failed input.
      await supabase.from("quote_artifacts").insert({
        quote_id: quote.id,
        artifact_type: "scope",
        payload: { __no_scope: true, reason: scopeResult.reason },
      });
      await supabase
        .from("quotes")
        .update({ status: "validation_failed", total_cost_usd: audit.cost() })
        .eq("id", quote.id);
      await audit.flush();
      throw new InputRejectedError(
        `We couldn't extract any scope from your notes — ${scopeResult.reason} Try adding what work you want done (e.g., "patio, ~16x20 travertine; pergola; irrigation refresh").`,
        "no_scope_extractable",
      );
    }

    const scope_items: ScopeItem[] = scopeResult.scope_items;

    await supabase.from("quote_artifacts").insert({
      quote_id: quote.id,
      artifact_type: "scope",
      payload: scope_items,
    });

    // 4. match_pricing
    const matchResult = await matchPricing({ scope_items }, audit);

    // Verify catalog IDs are real (defensive — match_pricing should never invent, but the
    // brief explicitly rewards guardrails on AI output). Agent-emitted rows always
    // have a line_item_id; the null-filter is a type guard for the shared interface
    // which now allows null for user-added custom rows.
    const ids = matchResult.priced_items
      .map((p) => p.line_item_id)
      .filter((id): id is string => id !== null);
    const missing = await verifyCatalogIds(ids);
    if (missing.length > 0) {
      throw new Error(
        `match_pricing returned line_item_ids not in catalog: ${missing.join(", ")}`,
      );
    }

    await supabase.from("quote_artifacts").insert({
      quote_id: quote.id,
      artifact_type: "priced_items",
      payload: matchResult,
    });

    // 5. flag_ambiguity (Haiku, runs in parallel with generate_proposal? — not yet:
    //    keeping sequential per docs/04-agent-skills.md flow.)
    const ambiguities = await flagAmbiguity(
      {
        raw_notes: body.raw_notes,
        scope_items,
        priced_items: matchResult.priced_items,
        custom_item_requests: matchResult.custom_item_requests,
      },
      audit,
    );

    await supabase.from("quote_artifacts").insert({
      quote_id: quote.id,
      artifact_type: "ambiguities",
      payload: ambiguities,
    });

    // 6. generate_proposal (with up to 1 corrective retry on validate fail)
    const paymentSchedule = (quote.payment_schedule as { milestone: string; pct: number }[]) ?? undefined;

    let proposal = await generateProposal(
      {
        customer,
        project_type: body.project_type,
        raw_notes: body.raw_notes,
        scope_items,
        priced_items: matchResult.priced_items,
        custom_item_requests: matchResult.custom_item_requests,
        payment_schedule: paymentSchedule,
      },
      audit,
    );

    // 7. validate_output (D42: pass custom_item_requests so the validator can
    // enforce the Items Requiring Custom Pricing section + bleed boundary)
    let validation = await validateOutput(
      {
        proposal_markdown: proposal.proposal_markdown,
        priced_items: matchResult.priced_items,
        customer,
        payment_schedule: paymentSchedule,
        custom_item_requests: matchResult.custom_item_requests,
      },
      audit,
    );

    if (!validation.pass && audit.cost() < PER_QUOTE_BUDGET_USD) {
      const correctiveFeedback = validation.issues
        .filter((i) => i.severity === "error")
        .map(
          (i) => `- ${i.check}: ${i.detail}${i.suggested_fix ? ` (fix: ${i.suggested_fix})` : ""}`,
        )
        .join("\n");

      proposal = await generateProposal(
        {
          customer,
          project_type: body.project_type,
          raw_notes: body.raw_notes,
          scope_items,
          priced_items: matchResult.priced_items,
          custom_item_requests: matchResult.custom_item_requests,
          payment_schedule: paymentSchedule,
          corrective_feedback: correctiveFeedback,
        },
        audit,
      );

      validation = await validateOutput(
        {
          proposal_markdown: proposal.proposal_markdown,
          priced_items: matchResult.priced_items,
          customer,
          payment_schedule: paymentSchedule,
          custom_item_requests: matchResult.custom_item_requests,
        },
        audit,
      );
    }

    await supabase.from("quote_artifacts").insert({
      quote_id: quote.id,
      artifact_type: "validation_result",
      payload: validation,
    });

    // 8. Commit priced items + finalize quote row
    if (matchResult.priced_items.length > 0) {
      const rows = matchResult.priced_items.map((p) => ({
        quote_id: quote.id,
        line_item_id: p.line_item_id,
        line_item_name_snapshot: p.line_item_name_snapshot,
        category: p.category,
        unit: p.unit,
        quantity: p.quantity,
        unit_price_snapshot: p.unit_price_snapshot,
        line_total: p.line_total,
        notes: p.notes,
      }));
      const { error } = await supabase.from("quote_line_items").insert(rows);
      if (error) throw new Error(`quote_line_items insert failed: ${error.message}`);
    }

    const finalStatus = validation.pass ? "draft_ready" : "validation_failed";
    const { data: updated, error: updErr } = await supabase
      .from("quotes")
      .update({
        status: finalStatus,
        total_amount: proposal.total_amount,
        proposal_markdown: proposal.proposal_markdown,
        total_cost_usd: audit.cost(),
      })
      .eq("id", quote.id)
      .select("*")
      .single();
    if (updErr || !updated) throw new Error(`quote update failed: ${updErr?.message}`);

    await audit.flush();

    // Reload customer to get id-fresh shape (insert path used .single())
    const { data: c } = await supabase.from("customers").select("*").eq("id", customer.id).single();
    const customerFinal = (c ?? customer) as Customer;

    // Reload quote_line_items so caller sees DB ids
    const { data: lines } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quote.id)
      .order("created_at");

    return {
      quote: updated as Quote,
      customer: customerFinal,
      scope_items,
      priced_items: (lines ?? []) as QuoteLineItem[],
      ambiguities,
      validation,
      cost_usd: audit.cost(),
      budget_exceeded: audit.cost() > PER_QUOTE_BUDGET_USD,
    };
  } catch (err) {
    // Mark quote as validation_failed and persist whatever audit we have.
    await supabase
      .from("quotes")
      .update({
        status: "validation_failed",
        total_cost_usd: audit.cost(),
      })
      .eq("id", quote.id);
    await audit.flush();
    throw err;
  }
}
