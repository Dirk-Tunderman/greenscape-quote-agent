/**
 * POST /api/agent/draft — orchestrator entry.
 *
 * Request: DraftRequestBody (see lib/types.ts and BodySchema below).
 *
 * Response (200):
 * {
 *   quote_id, status ("draft_ready" | "validation_failed"),
 *   total_amount, cost_usd, budget_exceeded,
 *   validation: ValidationResult,
 *   ambiguities: Ambiguity[]
 * }
 *
 * Caller then GET /api/quotes/[id] for the full QuoteDetail.
 *
 * Errors:
 * - 400 — body fails zod parse
 * - 500 — orchestrator throws. Quote row may exist at validation_failed.
 *
 * maxDuration=240s covers worst-case 16-line-item runs (~160s observed).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { runDraft } from "@/lib/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 240;

const BodySchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().default(""),
    address: z.string().min(1),
  }),
  project_type: z.string().default(""),
  raw_notes: z.string().min(1, "raw_notes cannot be empty"),
  hoa: z.boolean().default(false),
  budget_tier: z.string().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues : err;
    return NextResponse.json({ error: "Invalid request body", detail: msg }, { status: 400 });
  }

  try {
    const result = await runDraft(body);
    return NextResponse.json({
      quote_id: result.quote.id,
      status: result.quote.status,
      total_amount: result.quote.total_amount,
      cost_usd: result.cost_usd,
      budget_exceeded: result.budget_exceeded,
      validation: result.validation,
      ambiguities: result.ambiguities,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Draft failed", detail: msg }, { status: 500 });
  }
}
