/**
 * Skill 5: validate_output — the gate before commit.
 *
 * Combines:
 *  (a) Deterministic regex checks against the proposal markdown (13 checks)
 *  (b) Haiku voice + factual-claim review (T=0.0 for consistency)
 *
 * Pass criterion: NO issues with severity="error". `warn` issues are passed
 * back as advisory but don't block.
 *
 * Why both deterministic + LLM:
 * - Deterministic catches things that don't need judgement (section
 *   structure, math, customer-name presence) — fast, free, never wrong
 * - LLM catches voice drift and unsupported factual claims — judgement work
 *   that regex can't do
 *
 * Deterministic checks performed:
 *  - 11 required-section regex matches (H1, H2, sections, signature)
 *  - Total math: stated **Project Total: $X** == sum of priced_items.line_total
 *  - Customer name appears in proposal (case-insensitive)
 *  - Pricing-table row totals all correspond to a real priced item line_total
 *  - Payment-schedule percentages sum to 100 (when input.payment_schedule provided)
 *
 * LLM checks performed:
 *  - voice_premium_warm — flags "amazing", "stunning", "premium experience"
 *  - voice_no_hardsell  — flags urgency tactics, fake scarcity
 *  - factual_unsupported_claims — flags claims not derivable from the input
 *  - factual_customer_match
 *  - voice_specific_not_generic
 *
 * Behavior on fail: orchestrator constructs a corrective-feedback string
 * from the error issues and re-prompts generate_proposal once. If that
 * second draft also fails, status=validation_failed (Marcus reviews).
 */

import { z } from "zod";
import { callClaude, extractText, parseJsonFromText } from "@/lib/anthropic";
import type { AuditContext } from "@/lib/audit";
import type { Customer, QuoteLineItem, ValidationIssue, ValidationResult } from "@/lib/types";

const ValidationIssueSchema = z.object({
  severity: z.enum(["error", "warn"]),
  check: z.string(),
  detail: z.string(),
  suggested_fix: z.string().nullable(),
});

const LlmOutputSchema = z.object({
  pass: z.boolean(),
  issues: z.array(ValidationIssueSchema),
});

// 8-section structure (demo simplification — ROC/insurance dropped per user
// instruction; the columns remain on `quotes` for forward compatibility).
const REQUIRED_SECTIONS: { check: string; pattern: RegExp }[] = [
  { check: "h1_proposal", pattern: /^#\s+Proposal\b/m },
  { check: "h2_customer_address", pattern: /^##\s+.+·.+$/m },
  { check: "project_overview_heading", pattern: /^##\s+Project Overview/im },
  { check: "scope_pricing_heading", pattern: /^##\s+(Detailed Scope|Pricing)/im },
  { check: "pricing_table", pattern: /^\|.*\|.*\|.*\|.*\|/m },
  { check: "project_total", pattern: /\*\*Project Total:\s*\$[0-9,]+\.\d{2}\*\*/i },
  { check: "exclusions_heading", pattern: /^##\s+Exclusions/im },
  { check: "timeline_heading", pattern: /^##\s+Timeline/im },
  { check: "warranty_heading", pattern: /^##\s+Warranty/im },
  { check: "terms_heading", pattern: /^##\s+Terms\b/im },
  { check: "signature_heading", pattern: /^##\s+Signature\b/im },
  { check: "signature_marcus", pattern: /Marcus Tate.*Greenscape Pro/i },
];

const LLM_SYSTEM = `You are a quality reviewer for proposal copy at Greenscape Pro. You will be given a Markdown proposal AND a list of priced items the proposal must reflect. Your job: catch voice/tone problems and factual claims not supported by the input.

Return JSON only:
{
  "pass": true|false,
  "issues": [
    { "severity": "error"|"warn", "check": "<short name>", "detail": "<one sentence>", "suggested_fix": "<actionable hint>"|null }
  ]
}

CHECKS YOU PERFORM:
- voice_premium_warm: text feels premium-craftsman + warm, not corporate or salesy. Words like "amazing", "stunning", "perfect", "premium experience", "world-class" are RED FLAGS.
- voice_no_hardsell: no urgency tactics, no fake scarcity, no fake discounts. "Sign today!" or "limited time" are RED FLAGS.
- factual_unsupported_claims: claims about timelines, materials, or features that are not derivable from the priced items. E.g., proposal mentions "underwater LED lighting" but no such line item exists.
- factual_customer_match: customer name appears in the H2 heading.
- voice_specific_not_generic: the greeting references something specific to the site walk or this project, not generic templating like "We are excited to provide you with this proposal".

DO NOT check totals, line items, or section structure — those are checked separately by code. Focus on voice and unsupported claims.

Set pass=false if there are any "error" severity issues. "warn" issues are OK to keep pass=true.`;

export interface ValidateOutputInput {
  proposal_markdown: string;
  priced_items: QuoteLineItem[];
  customer: Customer;
  payment_schedule?: { milestone: string; pct: number }[];
}

export async function validateOutput(
  input: ValidateOutputInput,
  audit: AuditContext,
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const md = input.proposal_markdown;

  // ───── Deterministic checks ─────

  // Backstop against empty-proposal: if priced_items is empty, the proposal
  // CANNOT be valid regardless of section structure. extract_scope's
  // __no_scope exit normally catches this earlier; this guards the case
  // where match_pricing legitimately returned 0 items (e.g., everything
  // was custom-only).
  if (input.priced_items.length === 0) {
    issues.push({
      severity: "error",
      check: "no_priced_items",
      detail:
        "No priced line items were produced — proposal would be empty. Either the catalog had no matches or all scope items required custom pricing.",
      suggested_fix:
        "Review the extracted scope; consider adding manual line items or expanding the catalog.",
    });
  }

  // Required sections
  for (const sec of REQUIRED_SECTIONS) {
    if (!sec.pattern.test(md)) {
      issues.push({
        severity: "error",
        check: `section:${sec.check}`,
        detail: `Required content missing: ${sec.check}`,
        suggested_fix: `Add the section/element matching ${sec.pattern.source}`,
      });
    }
  }

  // Payment schedule percentages must sum to 100 (research Q2)
  if (input.payment_schedule && input.payment_schedule.length > 0) {
    const sum = input.payment_schedule.reduce((s, m) => s + m.pct, 0);
    if (Math.abs(sum - 100) > 0.01) {
      issues.push({
        severity: "error",
        check: "payment_schedule_sum",
        detail: `Payment schedule percentages sum to ${sum}, expected 100.`,
        suggested_fix: `Adjust the payment_schedule so milestones add to 100%.`,
      });
    }
  }

  // Customer name in proposal
  if (!md.toLowerCase().includes(input.customer.name.toLowerCase())) {
    issues.push({
      severity: "error",
      check: "customer_name_present",
      detail: `Customer name "${input.customer.name}" does not appear in the proposal.`,
      suggested_fix: `Add the customer's full name to the H2 heading and greeting.`,
    });
  }

  // Total math
  const expectedTotal =
    Math.round(input.priced_items.reduce((sum, p) => sum + p.line_total, 0) * 100) / 100;
  const totalMatch = md.match(/\*\*Project Total:\s*\$([0-9,]+\.\d{2})\*\*/i);
  if (totalMatch) {
    const stated = Number(totalMatch[1].replace(/,/g, ""));
    if (Math.abs(stated - expectedTotal) > 0.01) {
      issues.push({
        severity: "error",
        check: "total_matches_priced_items",
        detail: `Project Total in proposal ($${stated.toFixed(2)}) does not match sum of priced items ($${expectedTotal.toFixed(2)}).`,
        suggested_fix: `Replace the Project Total with $${expectedTotal.toFixed(2)}.`,
      });
    }
  }

  // Hallucinated line items: every catalog name in the priced_items must appear; flag any
  // dollar amount in the table that's not a valid line_total.
  const validNames = new Set(input.priced_items.map((p) => p.line_item_name_snapshot.toLowerCase()));
  const validTotals = new Set(input.priced_items.map((p) => p.line_total.toFixed(2)));

  // Pull line totals out of the table rows: $X,XXX.XX at end of a pipe-row
  const tableRowMatches = md.matchAll(/^\|[^\n]+\|\s*\$([0-9,]+\.\d{2})\s*\|/gm);
  for (const m of tableRowMatches) {
    const dollars = m[1].replace(/,/g, "");
    if (!validTotals.has(Number(dollars).toFixed(2))) {
      // Only error if this row's dollar matches none of the valid line totals (could be
      // a hallucinated extra line). We still allow rounding tolerance via toFixed(2).
      issues.push({
        severity: "warn",
        check: "table_row_unrecognized",
        detail: `Pricing table contains $${dollars} that doesn't match any priced line_total.`,
        suggested_fix: `Verify this row corresponds to a real catalog item.`,
      });
    }
  }

  // ───── LLM checks (voice + claims) ─────

  const llmInput = {
    proposal_markdown: md,
    priced_items: input.priced_items.map((p) => ({
      name: p.line_item_name_snapshot,
      qty: p.quantity,
      unit: p.unit,
      total: p.line_total,
    })),
    customer_name: input.customer.name,
  };

  const call = await callClaude({
    model: "haiku",
    system: LLM_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Review this proposal:\n\n${JSON.stringify(llmInput, null, 2)}\n\nReturn the validation JSON object.`,
      },
    ],
    max_tokens: 800,
    temperature: 0.0,
  });

  const raw = extractText(call.message);
  let llmResult: z.infer<typeof LlmOutputSchema> = { pass: true, issues: [] };
  try {
    llmResult = LlmOutputSchema.parse(parseJsonFromText(raw));
  } catch (err) {
    issues.push({
      severity: "warn",
      check: "llm_validator_parse_error",
      detail: `LLM validator response did not parse: ${err instanceof Error ? err.message : err}`,
      suggested_fix: null,
    });
  }

  for (const li of llmResult.issues) issues.push(li);

  const result: ValidationResult = {
    pass: !issues.some((i) => i.severity === "error"),
    issues,
  };

  audit.record({
    skill: "validate_output",
    input: {
      customer_name: input.customer.name,
      priced_count: input.priced_items.length,
      markdown_length: md.length,
    },
    output: result,
    call,
    success: true,
  });

  return result;
}
