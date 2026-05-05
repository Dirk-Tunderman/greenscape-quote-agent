import type { LineItem } from "@/lib/types";

// Synthetic Phoenix-market pricing catalog per docs/06-assumptions.md.
// ~80 items across 8 categories + universal. Chat A's seed migration replaces this.

const now = "2026-05-01T10:00:00.000Z";
const make = (
  n: number,
  partial: Omit<LineItem, "id" | "active" | "created_at" | "material_cost_pct" | "item_type"> &
    Partial<Pick<LineItem, "item_type">>
): LineItem => ({
  id: `li_${String(n).padStart(3, "0")}`,
  active: true,
  created_at: now,
  material_cost_pct: 0.45,
  item_type: "fixed",
  ...partial,
});

let i = 0;
const next = () => ++i;

export const MOCK_CATALOG: LineItem[] = [
  // Patio
  make(next(), { category: "patio", name: "Travertine paver patio — premium grade", description: "Premium-grade travertine pavers; sand-set on compacted base.", unit: "sq_ft", unit_price: 22 }),
  make(next(), { category: "patio", name: "Flagstone patio — natural cut", description: "Natural-cut flagstone, mortared joints.", unit: "sq_ft", unit_price: 28 }),
  make(next(), { category: "patio", name: "Concrete paver patio", description: "Standard concrete pavers, sand-set.", unit: "sq_ft", unit_price: 14 }),
  make(next(), { category: "patio", name: "Stamped concrete patio", description: "Poured + stamped concrete with color stain.", unit: "sq_ft", unit_price: 12 }),
  make(next(), { category: "patio", name: "Caliche-resistant base prep", description: "Sub-grade prep including caliche removal.", unit: "sq_ft", unit_price: 4 }),
  make(next(), { category: "patio", name: "Existing concrete demo + haul", description: "Demolition and disposal of existing slab.", unit: "sq_ft", unit_price: 3.5 }),
  make(next(), { category: "patio", name: "Patio drainage install", description: "French drain or trench drain for patio runoff.", unit: "lump_sum", unit_price: 850 }),
  make(next(), { category: "patio", name: "Decorative paver border", description: "Soldier-course paver border.", unit: "linear_ft", unit_price: 18 }),

  // Pergola
  make(next(), { category: "pergola", name: "Cedar pergola 12×12", description: "Western red cedar, sealed.", unit: "each", unit_price: 7800 }),
  make(next(), { category: "pergola", name: "Cedar pergola 16×16", description: "Western red cedar, sealed.", unit: "each", unit_price: 12500 }),
  make(next(), { category: "pergola", name: "Aluminum pergola 12×12", description: "Powder-coat aluminum frame.", unit: "each", unit_price: 6200 }),
  make(next(), { category: "pergola", name: "Steel powder-coat 12×14", description: "Heavy-gauge steel, powder-coat finish.", unit: "each", unit_price: 11500 }),
  make(next(), { category: "pergola", name: "Pergola lighting package", description: "Low-voltage LED downlights and string-light wiring.", unit: "each", unit_price: 1800 }),
  make(next(), { category: "pergola", name: "Retractable canopy add-on", description: "Manual retractable canopy.", unit: "each", unit_price: 2400 }),
  make(next(), { category: "pergola", name: "Pergola privacy screen", description: "Slatted side panels.", unit: "linear_ft", unit_price: 95 }),

  // Fire pit
  make(next(), { category: "fire_pit", name: "Gas fire pit 36\" round", description: "Stainless ring burner, river rock fill.", unit: "each", unit_price: 3400 }),
  make(next(), { category: "fire_pit", name: "Gas fire pit 48\"×24\" rectangular", description: "Linear gas burner, glass beads.", unit: "each", unit_price: 4800 }),
  make(next(), { category: "fire_pit", name: "Wood-burning flagstone pit", description: "Dry-stack flagstone surround.", unit: "each", unit_price: 2200 }),
  make(next(), { category: "fire_pit", name: "Linear gas feature 6 ft", description: "6-ft linear burner with fire glass.", unit: "each", unit_price: 5600 }),
  make(next(), { category: "fire_pit", name: "Wood→gas conversion", description: "Convert existing wood pit to gas.", unit: "each", unit_price: 1400 }),
  make(next(), { category: "fire_pit", name: "Fire pit gas line trench", description: "Trench + line from manifold.", unit: "linear_ft", unit_price: 32 }),

  // Water feature
  make(next(), { category: "water_feature", name: "Pondless waterfall — small (3-5 ft)", description: "Self-contained pondless waterfall.", unit: "each", unit_price: 4800 }),
  make(next(), { category: "water_feature", name: "Pondless waterfall — medium (6-8 ft)", description: "Mid-scale pondless waterfall.", unit: "each", unit_price: 7500 }),
  make(next(), { category: "water_feature", name: "Pond w/ waterfall", description: "Lined pond, biofilter, waterfall.", unit: "each", unit_price: 9200 }),
  make(next(), { category: "water_feature", name: "Bubbling rock fountain", description: "Disappearing fountain over basalt column.", unit: "each", unit_price: 1200 }),
  make(next(), { category: "water_feature", name: "Sheer descent water wall 4 ft", description: "Stainless sheer descent over stone wall.", unit: "each", unit_price: 3400 }),

  // Artificial turf
  make(next(), { category: "artificial_turf", name: "Premium 75oz pet/play turf", description: "Heat-rated 75oz face weight, infill incl.", unit: "sq_ft", unit_price: 9.5 }),
  make(next(), { category: "artificial_turf", name: "Standard 50oz turf", description: "Heat-rated 50oz face weight, infill incl.", unit: "sq_ft", unit_price: 7.25 }),
  make(next(), { category: "artificial_turf", name: "Putting green", description: "Nylon putting surface w/ cup.", unit: "sq_ft", unit_price: 13 }),
  make(next(), { category: "artificial_turf", name: "Caliche-resistant base prep (turf)", description: "Compacted decomposed granite base.", unit: "sq_ft", unit_price: 2.5 }),
  make(next(), { category: "artificial_turf", name: "Grass removal + haul", description: "Sod / weed removal and disposal.", unit: "sq_ft", unit_price: 1.8 }),

  // Irrigation
  make(next(), { category: "irrigation", name: "Drip zone install", description: "Per-zone drip line + emitters.", unit: "zone", unit_price: 450 }),
  make(next(), { category: "irrigation", name: "Pop-up sprinkler zone", description: "Per-zone rotor pop-ups.", unit: "zone", unit_price: 380 }),
  make(next(), { category: "irrigation", name: "Smart controller — Rachio", description: "WiFi-enabled smart controller.", unit: "each", unit_price: 480 }),
  make(next(), { category: "irrigation", name: "Rain sensor", description: "Wireless rain sensor.", unit: "each", unit_price: 180 }),
  make(next(), { category: "irrigation", name: "Backflow preventer", description: "Code-compliant backflow preventer.", unit: "each", unit_price: 320 }),
  make(next(), { category: "irrigation", name: "Audit/repair labor", description: "Hourly diagnostic and repair labor.", unit: "hour", unit_price: 125 }),

  // Outdoor kitchen
  make(next(), { category: "outdoor_kitchen", name: "L-shaped grill island 8 ft — stucco", description: "Stucco-finish island, ready for appliances.", unit: "each", unit_price: 8800 }),
  make(next(), { category: "outdoor_kitchen", name: "Linear 10 ft — stone veneer", description: "Stone-veneer linear island.", unit: "each", unit_price: 14500 }),
  make(next(), { category: "outdoor_kitchen", name: "Built-in grill insert", description: "Stainless built-in grill.", unit: "each", unit_price: 3200 }),
  make(next(), { category: "outdoor_kitchen", name: "Granite countertop", description: "Slab granite, sealed.", unit: "linear_ft", unit_price: 145 }),
  make(next(), { category: "outdoor_kitchen", name: "Outdoor refrigerator", description: "Outdoor-rated stainless fridge.", unit: "each", unit_price: 1800 }),
  make(next(), { category: "outdoor_kitchen", name: "Sink + plumbing", description: "Stainless sink, hot/cold lines, drain.", unit: "each", unit_price: 1200 }),

  // Retaining wall
  make(next(), { category: "retaining_wall", name: "Block wall 24\" tall", description: "Engineered block wall, 24\".", unit: "linear_ft", unit_price: 85 }),
  make(next(), { category: "retaining_wall", name: "Block wall 36\" tall", description: "Engineered block wall, 36\".", unit: "linear_ft", unit_price: 125 }),
  make(next(), { category: "retaining_wall", name: "Block wall 48\" — engineered", description: "Engineered block wall, 48\".", unit: "linear_ft", unit_price: 185 }),
  make(next(), { category: "retaining_wall", name: "Boulder wall — natural", description: "Hand-set natural boulder wall.", unit: "linear_ft", unit_price: 145 }),
  make(next(), { category: "retaining_wall", name: "Stucco-finish concrete wall", description: "Poured + stucco-finished wall.", unit: "linear_ft", unit_price: 165 }),
  make(next(), { category: "retaining_wall", name: "Cap stones", description: "Pre-cast cap stones.", unit: "linear_ft", unit_price: 22 }),
  make(next(), { category: "retaining_wall", name: "Drainage behind wall", description: "Gravel + drain pipe behind wall.", unit: "linear_ft", unit_price: 35 }),
  make(next(), { category: "retaining_wall", name: "Engineering stamp >36\"", description: "Stamped engineering plan.", unit: "lump_sum", unit_price: 850 }),

  // Universal
  make(next(), { category: "universal", name: "Landscape lighting allowance", description: "Allowance for low-voltage path / accent lighting; finalized after walk-through.", unit: "lump_sum", unit_price: 1200, item_type: "allowance" }),
  make(next(), { category: "universal", name: "Custom hardscape detail", description: "Bespoke detail not in standard catalog; priced after Marcus reviews drawings.", unit: "lump_sum", unit_price: 0, item_type: "custom" }),
  make(next(), { category: "universal", name: "Phoenix permit pull", description: "Municipal permit fee + admin.", unit: "each", unit_price: 325 }),
  make(next(), { category: "universal", name: "HOA submission package", description: "HOA docs, plans, and submittal.", unit: "each", unit_price: 450 }),
  make(next(), { category: "universal", name: "Final cleanup + haul", description: "Site cleanup and debris haul.", unit: "lump_sum", unit_price: 650 }),
  make(next(), { category: "universal", name: "3D rendering for >$30K projects", description: "Photorealistic 3D render.", unit: "each", unit_price: 850 }),
  make(next(), { category: "universal", name: "Project management overhead", description: "8% of subtotal — included on all projects.", unit: "lump_sum", unit_price: 0 }),
];

export function findItem(id: string): LineItem | undefined {
  return MOCK_CATALOG.find((it) => it.id === id);
}

// Name-based lookup so mock seeds don't depend on fragile li_NNN ids.
// Throws so authoring errors fail loudly instead of yielding broken pages.
export function findItemByName(needle: string): LineItem {
  const lc = needle.toLowerCase();
  const exact = MOCK_CATALOG.find((it) => it.name.toLowerCase() === lc);
  if (exact) return exact;
  const partial = MOCK_CATALOG.find((it) => it.name.toLowerCase().includes(lc));
  if (partial) return partial;
  throw new Error(`No catalog item matches "${needle}"`);
}
