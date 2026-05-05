# Test Case 05 — Out-of-catalog item

**Profile:** Custom wood-fired pizza oven (NOT in our catalog) plus standard items (small flagstone patio, small kitchen). Tests the `match_pricing` skill's `is_custom = true` flagging — does the agent route the pizza oven to `custom_item_requests` instead of hallucinating a price?

**Hypothesis:** Pizza oven appears as a custom row (line_item_id=null OR is_custom=true) with $0 placeholder. Other items (flagstone patio, base prep, sink, permit, cleanup) match catalog correctly. Total reflects only the catalog-priced items.

---

## Input

| Field | Value |
|---|---|
| Name | Dirk Tunderman |
| Email | dirk.tunderman@outlook.com |
| Phone | +31 6 14554096 |
| Project address | 5234 E Lincoln Dr, Paradise Valley, AZ 85253 |
| Project type | Custom pizza oven + small kitchenette |
| HOA | (unchecked) |

**Site walk notes:**

```
Walk Thurs 4pm. Customer wants a custom outdoor pizza oven (wood-fired, dome style, brick/stucco finish). Built into a small outdoor kitchenette setup — nothing fancy, just a counter + the oven + a small prep sink. ~5 ft linear footprint.

Plus a small flagstone patio under it, ~80 sq ft, just enough to stand and cook on. Existing dirt area — no demo needed, just base prep.

Budget: $15-20K range. Timeline flexible.

The pizza oven itself is the main thing — they've sourced a kit they want installed (Forno Bravo, 36" dome). We'd be doing the installation + the surrounding stucco enclosure + the chimney work.
```

---

## Expected outcome

| Dimension | Expected | Notes |
|---|---|---|
| Status | `draft_ready` first try | |
| Total amount | **$3,000 – $10,000** | flagstone patio + sink + permit + cleanup ONLY (oven is unpriced custom) |
| Line item count | **5-8 items** | flagstone patio + base prep + sink + permit + cleanup + 1-2 custom |
| Ambiguities | **1-3** | oven specifics, chimney details, electrical for oven |
| `needs_render` | **false** | total <$30K |
| Cost | <$0.30 | |

## Required scope items

- Flagstone patio ~80 sq ft (`patio` category — natural-cut flagstone $28/sq ft)
- Caliche-resistant base prep (`patio`)
- Sink + plumbing (`outdoor_kitchen`)
- Phoenix permit pull (`universal`)
- Final cleanup + haul (`universal`)
- **At least one custom item** for the pizza oven OR the agent must surface a strong ambiguity about it

## CRITICAL behavior to verify

**Pizza oven handling — pick ONE of these:**

✅ **Best:** Pizza oven appears as a line item with `line_item_id = null` AND `is_custom = true` AND a placeholder price (probably $0 or similar). The agent flagged it as needing Marcus's manual price.

✅ **Acceptable:** Pizza oven appears in `custom_item_requests` (the agent's escape hatch) and is referenced in the proposal text as "custom — to be priced separately."

❌ **HARD FAIL:** Pizza oven was given a fabricated price (e.g., "$8,500 — Forno Bravo wood-fired pizza oven installation") that came from nowhere in the catalog. The customer brought their own kit — we don't know its price.

❌ **HARD FAIL:** Pizza oven was matched to an unrelated catalog item (e.g., a fire pit or a grill island) — the agent forced a fit instead of flagging custom.

## SHOULD include in surfaced ambiguities

- "Pizza oven kit pricing — customer bringing Forno Bravo, do we install only or do we source?"
- Possibly: chimney work, electrical for the oven, dimensions of the kitchenette counter

## MUST NOT include

- Any pergola, water feature, turf, irrigation (none mentioned)
- HOA package (HOA unchecked)
- 3D render

---

## Pass threshold

**80/100** — primary measurement is the pizza oven custom-handling. **If the oven gets a fabricated price, this case auto-fails regardless of other scoring.**
