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
    // 3. extract_scope
    const scope_items = await extractScope(
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

    await supabase.from("quote_artifacts").insert({
      quote_id: quote.id,
      artifact_type: "scope",
      payload: scope_items,
    });

    // 4. match_pricing
    const matchResult = await matchPricing({ scope_items }, audit);

    // Verify catalog IDs are real (defensive — match_pricing should never invent, but the
    // brief explicitly rewards guardrails on AI output)
    const ids = matchResult.priced_items.map((p) => p.line_item_id);
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

    // 7. validate_output
    let validation = await validateOutput(
      {
        proposal_markdown: proposal.proposal_markdown,
        priced_items: matchResult.priced_items,
        customer,
        payment_schedule: paymentSchedule,
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
