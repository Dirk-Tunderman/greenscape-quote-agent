/**
 * Single Anthropic SDK wrapper for the entire backend.
 *
 * Why a wrapper:
 * - One place to set the per-call timeout (60s — bumped from 30s after the
 *   Chen integration test on production)
 * - One place that prices a `Message.usage` into a USD cost so cost-tracking
 *   can never drift between skills
 * - One place to swap models (cost-aware split per docs/build-process/09-decision-log.md D14:
 *   Sonnet for quality-critical tasks, Haiku for classification/validation)
 *
 * Pricing (per million tokens) is hard-coded in PRICE_PER_MTOK. Update there
 * when Anthropic pricing changes.
 *
 * `parseJsonFromText` is a defensive parser for LLM output that may include
 * markdown code fences or trailing prose around the JSON. It finds the first
 * top-level { or [ and balances brackets to its match.
 */

import Anthropic from "@anthropic-ai/sdk";

// Per system info: Claude 4.X is the current family.
// Sonnet 4.5 for quality (extract / match / generate); Haiku 4.5 for cheap classification (flag / validate).
export const MODELS = {
  sonnet: "claude-sonnet-4-5-20250929",
  haiku: "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;

// Per-million-token prices (USD). Keep in sync with Anthropic pricing.
// These are inputs to per-quote cost tracking; if pricing shifts, update here only.
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  [MODELS.sonnet]: { input: 3.0, output: 15.0 },
  [MODELS.haiku]: { input: 1.0, output: 5.0 },
};

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  cached = new Anthropic({ apiKey: key });
  return cached;
}

export interface CostBreakdown {
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export function priceMessage(model: string, input_tokens: number, output_tokens: number): number {
  const p = PRICE_PER_MTOK[model];
  if (!p) return 0;
  return (input_tokens * p.input + output_tokens * p.output) / 1_000_000;
}

export interface CallOptions {
  model: ModelKey;
  system: string;
  messages: Anthropic.MessageParam[];
  max_tokens: number;
  temperature?: number;
  tools?: Anthropic.Tool[];
  /** Hard timeout (ms). Defaults to 30s per docs/04-agent-skills.md. */
  timeout_ms?: number;
}

export interface CallResult {
  message: Anthropic.Message;
  cost: CostBreakdown;
  duration_ms: number;
  model: string;
}

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const model = MODELS[opts.model];
  const t0 = Date.now();

  const reqBody: Anthropic.MessageCreateParams = {
    model,
    max_tokens: opts.max_tokens,
    system: opts.system,
    messages: opts.messages,
    temperature: opts.temperature,
    tools: opts.tools,
  };

  const message = (await client().messages.create(reqBody, {
    timeout: opts.timeout_ms ?? 60_000,
  })) as Anthropic.Message;

  const duration_ms = Date.now() - t0;
  const input_tokens = message.usage?.input_tokens ?? 0;
  const output_tokens = message.usage?.output_tokens ?? 0;

  return {
    message,
    cost: {
      input_tokens,
      output_tokens,
      cost_usd: priceMessage(model, input_tokens, output_tokens),
    },
    duration_ms,
    model,
  };
}

/** Extract concatenated text from a Claude message's content blocks. */
export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Pull the first valid JSON object from a string (LLMs sometimes wrap in markdown). */
export function parseJsonFromText<T>(raw: string): T {
  // Strip ```json fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Find the first top-level { or [ and balance to its match
  const start = cleaned.search(/[{[]/);
  if (start === -1) throw new Error("No JSON object/array found in response");

  const stack: string[] = [];
  let inStr = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") {
      stack.pop();
      if (stack.length === 0) {
        return JSON.parse(cleaned.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error("Unterminated JSON in response");
}
