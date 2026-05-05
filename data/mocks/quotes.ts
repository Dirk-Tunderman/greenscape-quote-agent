/**
 * data/mocks/quotes.ts — fixture quotes for the demo.
 *
 * Five quotes covering every UI state Marcus can see:
 *   draft_ready · sent · accepted · lost · validation_failed
 *
 * Each MockQuoteSeed becomes a fully-built QuoteDetail (customer + line
 * items + scope artifacts + ambiguities + validation result + audit log)
 * via the build helpers below. Line items reference the catalog by NAME
 * (findItemByName) so we don't hand-author fragile li_NNN ids.
 *
 * Mock proposal markdown follows the 9-section template from D29 (industry
 * research): Greeting · Overview · Scope+Pricing · Exclusions · Timeline ·
 * Warranty · Terms · Signature · License & Insurance.
 *
 * To add a new fixture: append a MockQuoteSeed and the build loop at the
 * bottom does the rest. Keep the status spread covering every enum so the
 * UI states stay demoable.
 */
import type {
  AuditLogEntry,
  Customer,
  Quote,
  QuoteDetail,
  QuoteLineItem,
  QuoteSummary,
  ScopeItem,
  Ambiguity,
  ValidationResult,
} from "@/lib/types";
import { DEFAULT_PAYMENT_SCHEDULE } from "@/lib/types";
import { findItemByName } from "@/data/mocks/catalog";

export const MOCK_CUSTOMERS: Customer[] = [
  { id: "cust_001", name: "Claire Henderson", email: "claire.henderson@example.com", phone: "(602) 555-0148", address: "4421 E Camelback Rd, Phoenix, AZ 85018", created_at: "2026-04-22T15:13:00.000Z" },
  { id: "cust_002", name: "David & Marisol Ortega", email: "d.ortega@example.com", phone: "(480) 555-0192", address: "11820 N 86th Pl, Scottsdale, AZ 85260", created_at: "2026-04-25T11:02:00.000Z" },
  { id: "cust_003", name: "Greg Whitfield", email: "g.whitfield@example.com", phone: null, address: "8930 W Sahuaro Dr, Peoria, AZ 85345", created_at: "2026-04-29T09:41:00.000Z" },
  { id: "cust_004", name: "Priya & Anil Subramanian", email: "subramanian.family@example.com", phone: "(602) 555-0210", address: "2104 N Mountain View Rd, Phoenix, AZ 85016", created_at: "2026-05-01T17:25:00.000Z" },
  { id: "cust_005", name: "The Bowen Residence", email: "bowen.j@example.com", phone: "(480) 555-0167", address: "6240 E Calle Bonita, Paradise Valley, AZ 85253", created_at: "2026-05-03T10:11:00.000Z" },
];

interface MockQuoteSeed {
  id: string;
  customer_id: string;
  project_type: string;
  status: Quote["status"];
  raw_notes: string;
  proposal_summary: string;
  line_items: Array<{ match: string; quantity: number; notes?: string }>;
  total_cost_usd: number;
  created_at: string;
  sent_at?: string | null;
  outcome_at?: string | null;
  outcome_notes?: string | null;
  scope: ScopeItem[];
  ambiguities: Ambiguity[];
  validation: ValidationResult | null;
  audit_log: Omit<AuditLogEntry, "id" | "quote_id">[];
}

const SEEDS: MockQuoteSeed[] = [
  {
    id: "q_2026_0042",
    customer_id: "cust_001",
    project_type: "Backyard patio + pergola refresh",
    status: "draft_ready",
    raw_notes:
      "Site walk Mon morning — Claire wants travertine patio replacing the existing concrete slab, roughly 16x20. Cedar pergola over the dining area, lighting package. Mentioned a small bubbling fountain near the kitchen window. Existing irrigation controller is shot, replace with Rachio. HOA paperwork required. Budget feel: mid-30s. No timeline pressure.",
    proposal_summary:
      "Travertine patio (320 sq ft) replacing existing concrete, 12×12 cedar pergola with lighting, bubbling rock fountain, and a Rachio smart controller swap. HOA package included.",
    line_items: [
      { match: "Existing concrete demo", quantity: 320, notes: "Existing concrete demo" },
      { match: "Caliche-resistant base prep", quantity: 320, notes: "Caliche-resistant base prep" },
      { match: "Travertine paver patio", quantity: 320, notes: "Premium-grade travertine, sand-set" },
      { match: "Cedar pergola 12×12", quantity: 1, notes: "Cedar 12×12 over dining area" },
      { match: "Pergola lighting package", quantity: 1, notes: "Lighting package" },
      { match: "Bubbling rock fountain", quantity: 1, notes: "Bubbling rock fountain near kitchen" },
      { match: "Smart controller — Rachio", quantity: 1, notes: "Rachio smart controller" },
      { match: "HOA submission package", quantity: 1, notes: "HOA submission" },
      { match: "Phoenix permit pull", quantity: 1, notes: "Phoenix permit" },
      { match: "Final cleanup + haul", quantity: 1, notes: "Final cleanup" },
    ],
    total_cost_usd: 0.124,
    created_at: "2026-05-04T16:42:11.000Z",
    scope: [
      { category: "patio", description: "Travertine patio replacing existing concrete, ~16×20", dimensions: { quantity: 320, unit: "sq_ft" }, material_notes: "Premium-grade travertine, sand-set", certainty: "high", needs_clarification: null },
      { category: "pergola", description: "Cedar pergola over dining area, lighting", dimensions: { quantity: 1, unit: "each" }, material_notes: "Cedar, 12×12", certainty: "high", needs_clarification: null },
      { category: "water_feature", description: "Bubbling rock fountain near kitchen window", dimensions: { quantity: 1, unit: "each" }, material_notes: "Basalt column preferred", certainty: "medium", needs_clarification: null },
      { category: "irrigation", description: "Replace existing controller with Rachio", dimensions: { quantity: 1, unit: "each" }, material_notes: null, certainty: "high", needs_clarification: null },
    ],
    ambiguities: [
      { scope_item_index: 2, question: "Confirm fountain stone preference — basalt column vs. natural boulder?", why_it_matters: "Affects material sourcing and installation time.", severity: "warn" },
      { scope_item_index: 0, question: "Pergola finish — natural seal or stained cedar?", why_it_matters: "Stain adds ~$400 and affects timeline by a day.", severity: "info" },
    ],
    validation: { pass: true, issues: [] },
    audit_log: [
      { skill_name: "extract_scope", model: "claude-sonnet-4-x", input_tokens: 2840, output_tokens: 612, cost_usd: 0.0182, duration_ms: 4112, success: true, error: null, created_at: "2026-05-04T16:42:13.000Z" },
      { skill_name: "match_pricing", model: "claude-sonnet-4-x", input_tokens: 4920, output_tokens: 1840, cost_usd: 0.0451, duration_ms: 6802, success: true, error: null, created_at: "2026-05-04T16:42:21.000Z" },
      { skill_name: "flag_ambiguity", model: "claude-haiku-4-x", input_tokens: 2110, output_tokens: 384, cost_usd: 0.0011, duration_ms: 1822, success: true, error: null, created_at: "2026-05-04T16:42:25.000Z" },
      { skill_name: "generate_proposal", model: "claude-sonnet-4-x", input_tokens: 5680, output_tokens: 1924, cost_usd: 0.0489, duration_ms: 9241, success: true, error: null, created_at: "2026-05-04T16:42:36.000Z" },
      { skill_name: "validate_output", model: "claude-haiku-4-x", input_tokens: 2960, output_tokens: 412, cost_usd: 0.0019, duration_ms: 1612, success: true, error: null, created_at: "2026-05-04T16:42:39.000Z" },
    ],
  },
  {
    id: "q_2026_0041",
    customer_id: "cust_002",
    project_type: "Outdoor kitchen + turf + pondless waterfall",
    status: "sent",
    raw_notes:
      "Ortega site walk — they want a full outdoor kitchen along the back wall, linear 10 ft with stone veneer, granite top, built-in grill + fridge + sink. Replacing front lawn with premium turf, ~1100 sq ft. Pondless waterfall ~6 ft against the side wall. They want renders. Budget signal $80K-ish, flexible.",
    proposal_summary:
      "10-ft stone-veneer outdoor kitchen with built-in grill, refrigerator, sink and granite countertop. Premium 75oz turf replacing 1,100 sq ft of front lawn. Mid-scale 6-ft pondless waterfall against the side wall.",
    line_items: [
      { match: "Linear 10 ft — stone veneer", quantity: 1, notes: "Linear 10 ft stone-veneer island" },
      { match: "Built-in grill insert", quantity: 1, notes: "Built-in grill insert" },
      { match: "Granite countertop", quantity: 10, notes: "Granite countertop, 10 linear ft" },
      { match: "Outdoor refrigerator", quantity: 1, notes: "Outdoor refrigerator" },
      { match: "Sink + plumbing", quantity: 1, notes: "Sink + plumbing" },
      { match: "Premium 75oz pet/play turf", quantity: 1100, notes: "Front lawn replacement" },
      { match: "Grass removal + haul", quantity: 1100, notes: "Grass removal" },
      { match: "Caliche-resistant base prep (turf)", quantity: 1100, notes: "Base prep" },
      { match: "Pondless waterfall — medium", quantity: 1, notes: "Mid-scale pondless waterfall" },
      { match: "Phoenix permit pull", quantity: 1, notes: "Phoenix permit" },
      { match: "3D rendering for >$30K", quantity: 1, notes: "Render brief" },
      { match: "Final cleanup + haul", quantity: 1, notes: "Final cleanup" },
    ],
    total_cost_usd: 0.142,
    created_at: "2026-05-02T11:18:42.000Z",
    sent_at: "2026-05-03T08:31:00.000Z",
    scope: [
      { category: "outdoor_kitchen", description: "Linear 10 ft stone-veneer island along back wall", dimensions: { quantity: 10, unit: "linear_ft" }, material_notes: "Stone veneer, granite top", certainty: "high", needs_clarification: null },
      { category: "artificial_turf", description: "Premium 75oz turf replacing front lawn", dimensions: { quantity: 1100, unit: "sq_ft" }, material_notes: "75oz, pet/play grade", certainty: "high", needs_clarification: null },
      { category: "water_feature", description: "Mid-scale pondless waterfall, side wall", dimensions: { quantity: 1, unit: "each" }, material_notes: "6-ft", certainty: "high", needs_clarification: null },
    ],
    ambiguities: [],
    validation: { pass: true, issues: [] },
    audit_log: [
      { skill_name: "extract_scope", model: "claude-sonnet-4-x", input_tokens: 2540, output_tokens: 712, cost_usd: 0.0182, duration_ms: 4302, success: true, error: null, created_at: "2026-05-02T11:18:44.000Z" },
      { skill_name: "match_pricing", model: "claude-sonnet-4-x", input_tokens: 5140, output_tokens: 2120, cost_usd: 0.0498, duration_ms: 7811, success: true, error: null, created_at: "2026-05-02T11:18:53.000Z" },
      { skill_name: "flag_ambiguity", model: "claude-haiku-4-x", input_tokens: 2280, output_tokens: 198, cost_usd: 0.0009, duration_ms: 1422, success: true, error: null, created_at: "2026-05-02T11:18:55.000Z" },
      { skill_name: "generate_proposal", model: "claude-sonnet-4-x", input_tokens: 6120, output_tokens: 2202, cost_usd: 0.0521, duration_ms: 10120, success: true, error: null, created_at: "2026-05-02T11:19:07.000Z" },
      { skill_name: "validate_output", model: "claude-haiku-4-x", input_tokens: 3040, output_tokens: 388, cost_usd: 0.0018, duration_ms: 1521, success: true, error: null, created_at: "2026-05-02T11:19:11.000Z" },
    ],
  },
  {
    id: "q_2026_0040",
    customer_id: "cust_003",
    project_type: "Retaining wall + drainage",
    status: "validation_failed",
    raw_notes:
      "Whitfield — needs a retaining wall along the back slope, maybe 40 ft long. Drainage failing during monsoons. Timeline tight, wants it before July rains. Mentioned existing concrete patio is staying. Did not give wall height clearly — said 'maybe 3 feet, maybe a bit taller.'",
    proposal_summary:
      "40-ft engineered block retaining wall with drainage. Height TBD pending Marcus's call.",
    line_items: [
      { match: "Block wall 36\" tall", quantity: 40, notes: "Block wall 36\" — assumed height pending confirmation" },
      { match: "Cap stones", quantity: 40, notes: "Cap stones" },
      { match: "Drainage behind wall", quantity: 40, notes: "Drainage behind wall" },
      { match: "Phoenix permit pull", quantity: 1, notes: "Phoenix permit" },
    ],
    total_cost_usd: 0.158,
    created_at: "2026-05-04T13:55:18.000Z",
    scope: [
      { category: "retaining_wall", description: "Retaining wall along back slope, ~40 ft", dimensions: { quantity: 40, unit: "linear_ft" }, material_notes: "Engineered block", certainty: "low", needs_clarification: "Wall height — '3 feet, maybe a bit taller'" },
    ],
    ambiguities: [
      { scope_item_index: 0, question: "Confirm wall height — under 36\" vs. 36-48\" changes pricing tier and triggers engineering stamp.", why_it_matters: "48\" tier is ~$60/ft more and adds an $850 engineering stamp.", severity: "blocker" },
    ],
    validation: {
      pass: false,
      issues: [
        { severity: "error", check: "missing_dimension", detail: "Retaining wall height not specified — pricing tier indeterminate.", suggested_fix: "Confirm with customer; if >36\" add engineering stamp line." },
        { severity: "warn", check: "missing_drainage_detail", detail: "Drainage failure mode not characterized — surface water vs. sub-grade.", suggested_fix: "Add site photos and re-extract." },
      ],
    },
    audit_log: [
      { skill_name: "extract_scope", model: "claude-sonnet-4-x", input_tokens: 2120, output_tokens: 488, cost_usd: 0.0144, duration_ms: 3922, success: true, error: null, created_at: "2026-05-04T13:55:20.000Z" },
      { skill_name: "match_pricing", model: "claude-sonnet-4-x", input_tokens: 4180, output_tokens: 1320, cost_usd: 0.0322, duration_ms: 5908, success: true, error: null, created_at: "2026-05-04T13:55:27.000Z" },
      { skill_name: "flag_ambiguity", model: "claude-haiku-4-x", input_tokens: 1890, output_tokens: 322, cost_usd: 0.0010, duration_ms: 1612, success: true, error: null, created_at: "2026-05-04T13:55:30.000Z" },
      { skill_name: "generate_proposal", model: "claude-sonnet-4-x", input_tokens: 5120, output_tokens: 1820, cost_usd: 0.0461, duration_ms: 8810, success: true, error: null, created_at: "2026-05-04T13:55:40.000Z" },
      { skill_name: "validate_output", model: "claude-haiku-4-x", input_tokens: 2880, output_tokens: 612, cost_usd: 0.0024, duration_ms: 1722, success: false, error: "Validation issues: missing_dimension, missing_drainage_detail", created_at: "2026-05-04T13:55:42.000Z" },
      { skill_name: "generate_proposal", model: "claude-sonnet-4-x", input_tokens: 5780, output_tokens: 1980, cost_usd: 0.0510, duration_ms: 9442, success: true, error: null, created_at: "2026-05-04T13:55:53.000Z" },
      { skill_name: "validate_output", model: "claude-haiku-4-x", input_tokens: 2960, output_tokens: 644, cost_usd: 0.0026, duration_ms: 1820, success: false, error: "Validation issues: missing_dimension", created_at: "2026-05-04T13:55:55.000Z" },
    ],
  },
  {
    id: "q_2026_0039",
    customer_id: "cust_004",
    project_type: "Fire pit + pergola + irrigation refresh",
    status: "accepted",
    raw_notes:
      "Subramanians — gas fire pit (rectangular), 12×14 steel pergola adjacent, full irrigation rezone (4 zones). Standard finish on everything.",
    proposal_summary: "Linear gas fire pit, 12×14 steel pergola, four-zone irrigation rezone.",
    line_items: [
      { match: "Gas fire pit 48\"×24\"", quantity: 1, notes: "48\"×24\" rectangular gas fire pit" },
      { match: "Steel powder-coat 12×14", quantity: 1, notes: "12×14 steel pergola" },
      { match: "Drip zone install", quantity: 4, notes: "4 irrigation zones — drip" },
      { match: "Phoenix permit pull", quantity: 1, notes: "Permit" },
      { match: "Final cleanup + haul", quantity: 1, notes: "Cleanup" },
    ],
    total_cost_usd: 0.118,
    created_at: "2026-04-28T09:21:00.000Z",
    sent_at: "2026-04-28T15:42:00.000Z",
    outcome_at: "2026-05-01T11:14:00.000Z",
    outcome_notes: "Signed; deposit invoice sent.",
    scope: [
      { category: "fire_pit", description: "Rectangular gas fire pit", dimensions: { quantity: 1, unit: "each" }, material_notes: null, certainty: "high", needs_clarification: null },
      { category: "pergola", description: "12×14 steel pergola adjacent to fire pit", dimensions: { quantity: 1, unit: "each" }, material_notes: "Powder-coat steel", certainty: "high", needs_clarification: null },
      { category: "irrigation", description: "Full irrigation rezone, 4 zones", dimensions: { quantity: 4, unit: "zone" }, material_notes: "Drip", certainty: "high", needs_clarification: null },
    ],
    ambiguities: [],
    validation: { pass: true, issues: [] },
    audit_log: [
      { skill_name: "extract_scope", model: "claude-sonnet-4-x", input_tokens: 1820, output_tokens: 412, cost_usd: 0.0124, duration_ms: 3422, success: true, error: null, created_at: "2026-04-28T09:21:02.000Z" },
      { skill_name: "match_pricing", model: "claude-sonnet-4-x", input_tokens: 4080, output_tokens: 1422, cost_usd: 0.0344, duration_ms: 5912, success: true, error: null, created_at: "2026-04-28T09:21:09.000Z" },
      { skill_name: "flag_ambiguity", model: "claude-haiku-4-x", input_tokens: 1980, output_tokens: 184, cost_usd: 0.0008, duration_ms: 1322, success: true, error: null, created_at: "2026-04-28T09:21:11.000Z" },
      { skill_name: "generate_proposal", model: "claude-sonnet-4-x", input_tokens: 5320, output_tokens: 1820, cost_usd: 0.0467, duration_ms: 8612, success: true, error: null, created_at: "2026-04-28T09:21:21.000Z" },
      { skill_name: "validate_output", model: "claude-haiku-4-x", input_tokens: 2820, output_tokens: 388, cost_usd: 0.0017, duration_ms: 1488, success: true, error: null, created_at: "2026-04-28T09:21:23.000Z" },
    ],
  },
  {
    id: "q_2026_0038",
    customer_id: "cust_005",
    project_type: "Full backyard rebuild",
    status: "lost",
    raw_notes:
      "Bowen — full rebuild. Patio, pergola, outdoor kitchen, putting green, water feature. Premium everything.",
    proposal_summary: "Full premium backyard rebuild — patio, pergola, kitchen, putting green, water feature.",
    line_items: [
      { match: "Flagstone patio", quantity: 480, notes: "Flagstone patio" },
      { match: "Caliche-resistant base prep", quantity: 480, notes: "Base prep" },
      { match: "Cedar pergola 16×16", quantity: 1, notes: "16×16 cedar pergola" },
      { match: "Linear 10 ft — stone veneer", quantity: 1, notes: "Linear 10 ft outdoor kitchen" },
      { match: "Built-in grill insert", quantity: 1, notes: "Built-in grill" },
      { match: "Granite countertop", quantity: 10, notes: "Granite top" },
      { match: "Putting green", quantity: 600, notes: "Putting green" },
      { match: "Pondless waterfall — medium", quantity: 1, notes: "Pondless waterfall" },
      { match: "Phoenix permit pull", quantity: 1, notes: "Permit" },
      { match: "HOA submission package", quantity: 1, notes: "HOA" },
      { match: "3D rendering for >$30K", quantity: 1, notes: "Render" },
      { match: "Final cleanup + haul", quantity: 1, notes: "Cleanup" },
    ],
    total_cost_usd: 0.162,
    created_at: "2026-04-15T08:42:00.000Z",
    sent_at: "2026-04-16T10:18:00.000Z",
    outcome_at: "2026-04-25T13:00:00.000Z",
    outcome_notes: "Customer chose competitor on price.",
    scope: [
      { category: "patio", description: "Flagstone patio, ~480 sq ft", dimensions: { quantity: 480, unit: "sq_ft" }, material_notes: "Natural-cut flagstone", certainty: "high", needs_clarification: null },
      { category: "pergola", description: "16×16 cedar pergola", dimensions: { quantity: 1, unit: "each" }, material_notes: "Cedar", certainty: "high", needs_clarification: null },
      { category: "outdoor_kitchen", description: "Linear 10 ft kitchen", dimensions: { quantity: 10, unit: "linear_ft" }, material_notes: "Stone veneer", certainty: "high", needs_clarification: null },
      { category: "artificial_turf", description: "Putting green, ~600 sq ft", dimensions: { quantity: 600, unit: "sq_ft" }, material_notes: "Putting nylon", certainty: "high", needs_clarification: null },
      { category: "water_feature", description: "Pondless waterfall", dimensions: { quantity: 1, unit: "each" }, material_notes: null, certainty: "high", needs_clarification: null },
    ],
    ambiguities: [],
    validation: { pass: true, issues: [] },
    audit_log: [
      { skill_name: "extract_scope", model: "claude-sonnet-4-x", input_tokens: 3120, output_tokens: 812, cost_usd: 0.0224, duration_ms: 4922, success: true, error: null, created_at: "2026-04-15T08:42:03.000Z" },
      { skill_name: "match_pricing", model: "claude-sonnet-4-x", input_tokens: 5820, output_tokens: 2240, cost_usd: 0.0531, duration_ms: 8222, success: true, error: null, created_at: "2026-04-15T08:42:12.000Z" },
      { skill_name: "flag_ambiguity", model: "claude-haiku-4-x", input_tokens: 2440, output_tokens: 222, cost_usd: 0.0010, duration_ms: 1592, success: true, error: null, created_at: "2026-04-15T08:42:14.000Z" },
      { skill_name: "generate_proposal", model: "claude-sonnet-4-x", input_tokens: 6280, output_tokens: 2380, cost_usd: 0.0541, duration_ms: 10221, success: true, error: null, created_at: "2026-04-15T08:42:25.000Z" },
      { skill_name: "validate_output", model: "claude-haiku-4-x", input_tokens: 3120, output_tokens: 412, cost_usd: 0.0019, duration_ms: 1612, success: true, error: null, created_at: "2026-04-15T08:42:27.000Z" },
    ],
  },
];

// Build helpers --------------------------------------------------------------

function buildLineItems(quoteId: string, seeds: MockQuoteSeed["line_items"]): QuoteLineItem[] {
  return seeds.map((s, idx) => {
    const catalog = findItemByName(s.match);
    return {
      id: `qli_${quoteId}_${idx + 1}`,
      quote_id: quoteId,
      line_item_id: catalog.id,
      line_item_name_snapshot: catalog.name,
      category: catalog.category,
      unit: catalog.unit,
      quantity: s.quantity,
      unit_price_snapshot: catalog.unit_price,
      line_total: Math.round(catalog.unit_price * s.quantity * 100) / 100,
      notes: s.notes ?? "",
    };
  });
}

function buildProposalMarkdown(seed: MockQuoteSeed, customer: Customer, lineItems: QuoteLineItem[], total: number): string {
  const today = new Date(seed.created_at);
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const grouped = new Map<string, QuoteLineItem[]>();
  for (const li of lineItems) {
    const key = li.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(li);
  }
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const tableRows = lineItems
    .map((li) => `| ${li.line_item_name_snapshot} | ${li.quantity} | ${li.unit.replace("_", " ")} | ${fmt(li.unit_price_snapshot)} | ${fmt(li.line_total)} |`)
    .join("\n");

  return `# Proposal for ${customer.name}

**${customer.address}**
${dateStr} · Proposal ${seed.id}

## Greeting

Thank you for the time on the walk earlier this week. The notes below reflect what we discussed and what we'd recommend for the space — written so you can see exactly what's being priced and why.

## Project overview

${seed.proposal_summary}

We've kept the scope tight to the work that matters and priced each line transparently. If anything below needs adjusting, we'd rather know before we start than after.

## Detailed scope & pricing

| Item | Qty | Unit | Unit price | Line total |
|---|---|---|---|---|
${tableRows}

**Project total: ${fmt(total)}**

## Exclusions

The following are not included in this proposal and would be priced separately if needed:

- Permit fees beyond the Phoenix municipal pull listed above
- Repairs to existing structures, plumbing, or electrical outside the documented scope
- Plant material or softscape replacement beyond what's specifically listed
- Custom decorative items not in our standard catalog (priced individually on request)

## Timeline

We can typically begin within 3-4 weeks of signed approval. Most projects of this scope complete inside 4-6 weeks of on-site work, weather permitting.

## Warranty

All workmanship is covered by Greenscape Pro's standard one-year warranty from substantial completion. Manufacturer warranties (pavers, equipment, smart controllers) pass through to you per their terms.

## Terms & next steps

- 30% deposit on signing, 30% at mobilization, 30% at midpoint, 10% on completion
- Proposal valid for 30 days from issue date
- Change orders priced separately and approved before work begins

## Signature

Customer signature: ____________________     Date: __________

Marcus Tate, Greenscape Pro: ____________________     Date: __________

## License & insurance

ROC #338712 (Arizona Registrar of Contractors) · Insured through Old Republic Surety Company.
`;
}

const QUOTE_DETAIL_INDEX = new Map<string, QuoteDetail>();
const SUMMARY_INDEX: QuoteSummary[] = [];

for (const seed of SEEDS) {
  const customer = MOCK_CUSTOMERS.find((c) => c.id === seed.customer_id)!;
  const lineItems = buildLineItems(seed.id, seed.line_items);
  const total = lineItems.reduce((sum, li) => sum + li.line_total, 0);
  const proposalMarkdown = buildProposalMarkdown(seed, customer, lineItems, total);

  const quote: Quote = {
    id: seed.id,
    customer_id: seed.customer_id,
    project_type: seed.project_type,
    raw_notes: seed.raw_notes,
    status: seed.status,
    total_amount: total,
    needs_render: total > 30000,
    proposal_markdown: proposalMarkdown,
    pdf_url: seed.status === "sent" || seed.status === "accepted" || seed.status === "lost" ? `https://example.com/proposals/${seed.id}.pdf` : null,
    sent_at: seed.sent_at ?? null,
    outcome_at: seed.outcome_at ?? null,
    outcome_notes: seed.outcome_notes ?? null,
    total_cost_usd: seed.total_cost_usd,
    created_at: seed.created_at,
    updated_at: seed.created_at,
    payment_schedule: DEFAULT_PAYMENT_SCHEDULE,
    roc_license_number: "ROC #338712",
    insurance_carrier: "Old Republic Surety Company",
  };

  const auditLog: AuditLogEntry[] = seed.audit_log.map((entry, idx) => ({
    id: `al_${seed.id}_${idx + 1}`,
    quote_id: seed.id,
    ...entry,
  }));

  QUOTE_DETAIL_INDEX.set(seed.id, {
    quote,
    customer,
    line_items: lineItems,
    artifacts: { scope: seed.scope, ambiguities: seed.ambiguities, validation: seed.validation, custom_item_requests: [] },
    audit_log: auditLog,
  });

  SUMMARY_INDEX.push({
    id: quote.id,
    customer_name: customer.name,
    customer_email: customer.email,
    project_type: quote.project_type,
    status: quote.status,
    total_amount: quote.total_amount,
    needs_render: quote.needs_render,
    total_cost_usd: quote.total_cost_usd,
    created_at: quote.created_at,
    sent_at: quote.sent_at,
  });
}

export const MOCK_QUOTE_SUMMARIES: QuoteSummary[] = SUMMARY_INDEX.sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

export function getMockQuoteDetail(id: string): QuoteDetail | undefined {
  return QUOTE_DETAIL_INDEX.get(id);
}

export function listMockQuoteDetails(): QuoteDetail[] {
  return Array.from(QUOTE_DETAIL_INDEX.values());
}

export function totalCumulativeCost(): number {
  return MOCK_QUOTE_SUMMARIES.reduce((sum, q) => sum + q.total_cost_usd, 0);
}
