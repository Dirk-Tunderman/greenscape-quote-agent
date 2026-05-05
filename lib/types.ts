// Types derived from docs/03-architecture.md (data model)
// and docs/04-agent-skills.md (agent output schemas).
// These are the contract between frontend and Chat A's API.

export type QuoteStatus =
  | "drafting"
  | "draft_ready"
  | "validation_failed"
  | "sending"
  | "sent"
  | "accepted"
  | "rejected"
  | "lost";

export type LineItemUnit =
  | "sq_ft"
  | "linear_ft"
  | "each"
  | "zone"
  | "hour"
  | "lump_sum";

// As of D39, category is plain text in the DB so Marcus can add new
// categories at runtime via POST /api/line-items. The literal union below
// is kept ONLY as documentation of the seeded set — at runtime any
// non-empty string is accepted.
export type ItemCategory = string;

export const SEEDED_CATEGORIES = [
  "patio",
  "pergola",
  "fire_pit",
  "water_feature",
  "artificial_turf",
  "irrigation",
  "outdoor_kitchen",
  "retaining_wall",
  "universal",
] as const;

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  created_at: string;
}

export type LineItemType = "fixed" | "allowance" | "custom";

export interface LineItem {
  id: string;
  category: ItemCategory;
  name: string;
  description: string;
  unit: LineItemUnit;
  unit_price: number;
  material_cost_pct: number;
  active: boolean;
  created_at: string;
  item_type: LineItemType;
}

export interface PaymentScheduleItem {
  milestone: string;
  pct: number;
}

// 50/50 matches Marcus's stated practice (onboarding line 71: "Stripe deposit
// invoice sent (50%)"). Reverted from research-recommended 30/30/30/10 — see
// docs/09-decision-log.md D26 (original research recommendation) and D37
// (reversal to match assignment). Per-quote configurable via quotes.payment_schedule.
export const DEFAULT_PAYMENT_SCHEDULE: PaymentScheduleItem[] = [
  { milestone: "deposit", pct: 50 },
  { milestone: "completion", pct: 50 },
];

export interface Quote {
  id: string;
  customer_id: string;
  project_type: string;
  raw_notes: string;
  status: QuoteStatus;
  total_amount: number;
  needs_render: boolean;
  proposal_markdown: string;
  pdf_url: string | null;
  sent_at: string | null;
  outcome_at: string | null;
  outcome_notes: string | null;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
  // Research-driven additions (D26-D30):
  payment_schedule: PaymentScheduleItem[];
  roc_license_number: string | null;
  insurance_carrier: string | null;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  // Nullable: rows added by Marcus manually (custom items) have no
  // catalog FK. Agent-emitted rows reference greenscape.line_items.
  line_item_id: string | null;
  line_item_name_snapshot: string;
  category: ItemCategory;
  unit: LineItemUnit;
  quantity: number;
  unit_price_snapshot: number;
  line_total: number;
  notes: string;
}

// Agent artifact payloads (per docs/04-agent-skills.md)

export interface ScopeItem {
  category: ItemCategory | "other";
  description: string;
  dimensions: { quantity: number | null; unit: LineItemUnit } | null;
  material_notes: string | null;
  certainty: "high" | "medium" | "low";
  needs_clarification: string | null;
}

export interface Ambiguity {
  scope_item_index: number;
  question: string;
  why_it_matters: string;
  severity: "blocker" | "warn" | "info";
}

export interface ValidationIssue {
  severity: "error" | "warn";
  check: string;
  detail: string;
  suggested_fix: string | null;
}

export interface ValidationResult {
  pass: boolean;
  issues: ValidationIssue[];
}

export interface AuditLogEntry {
  id: string;
  quote_id: string;
  skill_name:
    | "extract_scope"
    | "match_pricing"
    | "flag_ambiguity"
    | "generate_proposal"
    | "validate_output";
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number;
  success: boolean;
  error: string | null;
  created_at: string;
}

export interface QuoteDetail {
  quote: Quote;
  customer: Customer;
  line_items: QuoteLineItem[];
  artifacts: {
    scope: ScopeItem[];
    ambiguities: Ambiguity[];
    validation: ValidationResult | null;
  };
  audit_log: AuditLogEntry[];
}

// Form payloads

export interface DraftRequestBody {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  project_type: string;
  raw_notes: string;
  hoa: boolean;
  budget_tier?: string;
}

export interface QuoteSummary {
  id: string;
  customer_name: string;
  customer_email: string;
  project_type: string;
  status: QuoteStatus;
  total_amount: number;
  needs_render: boolean;
  total_cost_usd: number;
  created_at: string;
  sent_at: string | null;
}
