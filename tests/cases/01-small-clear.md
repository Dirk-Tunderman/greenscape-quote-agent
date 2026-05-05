# Test Case 01 — Small project, extremely clear

**Profile:** Single-category fire pit conversion. Maximum clarity — explicit dimensions, materials, gas-line spec, timeline, budget hint, no HOA. Tests the happy path with low noise.

**Hypothesis:** Agent should produce a clean draft on first try with 0-1 ambiguities, all line items extractable, total in tight range.

---

## Input (paste exactly into the form)

| Field | Value |
|---|---|
| Name | Dirk Tunderman |
| Email | dirk.tunderman@outlook.com |
| Phone | +31 6 14554096 |
| Project address | 3024 N 44th St, Phoenix, AZ 85018 |
| Project type | Fire pit / fire feature |
| HOA | (unchecked) |

**Site walk notes:**

```
Tue site walk 9am. Backyard, existing wood-burning fire pit (flagstone, rough shape). Wants to convert to gas. ~36" round area, but wants slightly bigger — maybe 42-48". Existing flagstone can stay if structurally OK, otherwise replace.

Gas line — meter is on the side of the house, ~25 ft run to the patio. Trench through xeriscape area, no turf damage to worry about.

Customer: easy to talk to. Ranch house, mid-century vibe. No HOA. Wants this done before the holidays so timeline matters — if we can start in 4-5 wks they're happy.

Budget: didn't volunteer a number, but mentioned they got a quote for $7K from another guy. Hinted they'd pay more for "less BS scheduling."
```

---

## Expected outcome

| Dimension | Expected | Notes |
|---|---|---|
| Status | `draft_ready` first try | input is unambiguous |
| Total amount | **$5,000 – $10,000** | matches the implied budget anchor |
| Line item count | **3-6 items** | conversion + gas line + permit + cleanup ± 1 |
| Ambiguities | **0-1** | possibly: "confirm new fire pit size 42 vs 48" |
| `needs_render` | **false** | well under $30K |
| Cost | <$0.30 | small input, short chain |
| Time | <120s | small input |

## Required scope items (must appear in line_items)

- Wood-burning → gas conversion line item (likely from `fire_pit` category)
- Phoenix permit pull (`universal`)
- Final cleanup + haul (`universal`)

## MUST NOT include (would be hallucination)

- Patio (no patio mentioned)
- Pergola (no pergola mentioned)
- Turf, irrigation, retaining wall, kitchen
- HOA submission package (HOA unchecked)
- 3D render (under $30K threshold)

## Voice expectations

- Greeting references "Tuesday morning site walk" or similar
- Mentions the existing flagstone status (keep if OK, replace otherwise) as a clarification
- No specific brand SKU lock-in for the fire pit insert
- Customer name ("Dirk Tunderman") in H2 + greeting

---

## Pass threshold

**85/100** — this should be the easiest case. If we can't ace this one, the system has fundamental problems.
