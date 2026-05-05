# Test Case 03 — Large project, render trigger, complex HOA

**Profile:** Full backyard rebuild crossing 7+ categories, Scottsdale HOA (strict design review), explicit budget cap $80K, ambiguities baked in (gas vs propane, kitchen finish material, permit jurisdiction). Tests render flag (`needs_render=true`), category breadth, scale stress on the agent chain.

**Hypothesis:** Total lands $60-90K → `needs_render=true`. 15+ line items spanning all major categories. 3-5 ambiguities surfaced (gas/propane, exact kitchen size, Scottsdale-vs-Phoenix permit, husband's gas type uncertainty).

---

## Input

| Field | Value |
|---|---|
| Name | Dirk Tunderman |
| Email | test@example.com |
| Phone | +31 6 14554096 |
| Project address | 9842 E Calle de Valle, Scottsdale, AZ 85255 |
| Project type | Full backyard rebuild |
| HOA | ☑ checked |

**Site walk notes:**

```
Site walk Wed late afternoon, 2 hr+ on site. Big project. New build move-in 6 mo ago, backyard is dirt + weeds + a sad existing concrete pad.

SCOPE (high level):
- Travertine paver patio, ~600 sq ft, premium grade, French pattern. Replacing existing concrete (demo + haul).
- Cedar pergola 16x16 over the patio. Lighting package + retractable canopy.
- Outdoor kitchen — 10 ft linear, stone veneer (NOT stucco — wife was firm). Built-in grill insert (premium), granite countertop, sink + plumbing, outdoor refrigerator. Bar seating extension on the end.
- Pondless waterfall, medium size, ~7 ft drop. Near the kitchen so they can see/hear it from the bar.
- Artificial turf, ~800 sq ft for the dog. Premium 75oz pet-rated. Grass removal + caliche-resistant base.
- Irrigation drip zones for the new perimeter planters — 3 zones, plus the smart controller.
- Block retaining wall along the back property line, ~40 linear ft, 36" tall. Stucco-finish to match the house.

PHX SPECIFIC:
- Caliche soil — confirmed when I dug a test hole near the kitchen footing. Real, ~12" down.
- Gas line for the kitchen + waterfall pump electrical needs to come from the side of the house. ~60 ft run, partly under existing planter beds.
- Permit for the kitchen — need to check w/ Scottsdale (not Phoenix permit office since address is Scottsdale).

CUSTOMER:
- Husband and wife. He's the decision maker on materials/price; she's the decision maker on aesthetics. Both have to sign.
- Budget: they said "we have $80K but don't want to spend it all if we don't have to." So target $60-75K, max $80K.
- Timeline: not in a rush. 8-10 wks fine. Want it photo-ready for an event in March.
- HOA: Troon HOA, strict design review. Will need full submission package + renderings. 4-6 wk approval cycle minimum.

NOTES TO SELF:
- This is a Carlos render job. Get him the brief asap — wife needs to see it before signing.
- Ask husband about gas vs propane for the kitchen — he wasn't sure which he wanted.
```

---

## Expected outcome

| Dimension | Expected | Notes |
|---|---|---|
| Status | `draft_ready` first try (or one retry) | complex; one retry acceptable |
| Total amount | **$55,000 – $95,000** | wide band; target is $60-90K |
| Line item count | **15-22 items** | spans 7+ categories + universal |
| Ambiguities | **3-5** | gas vs propane, scope of waterfall, kitchen sub-items, Scottsdale permit, finish decisions |
| `needs_render` | **TRUE** ⭐ | total >$30K — primary success criterion for this case |
| Cost | <$0.40 | larger generation prompt + tool-use loops |
| Time | <200s | |

## Required scope items (these should ALL appear)

- Existing concrete demo + haul (`patio`)
- Travertine paver patio premium grade (`patio`) ~600 sq ft
- Caliche-resistant base prep (`patio`)
- Cedar pergola 16×16 (`pergola`)
- Pergola lighting package (`pergola`)
- Retractable canopy add-on (`pergola`)
- Outdoor kitchen items: linear grill island stone veneer, built-in grill insert, granite countertop, outdoor refrigerator, sink + plumbing
- Bubbling rock fountain OR pondless waterfall medium (`water_feature`)
- Premium artificial turf 75oz pet/play (`artificial_turf`) ~800 sq ft
- Existing grass removal + haul (`artificial_turf`)
- Irrigation drip zones (3 × `irrigation`) + smart controller
- Block retaining wall 36" stucco-finish (`retaining_wall`) ~40 linear ft
- Engineering stamp >36" (`retaining_wall`) — borderline; allow either way
- HOA submission package (`universal`) — because HOA checked
- Phoenix or Scottsdale permit (`universal`)
- 3D rendering for >$30K projects (`universal`)
- Final cleanup + haul (`universal`)

## SHOULD include in surfaced ambiguities

- "Husband undecided on gas vs propane for kitchen"
- "Scottsdale vs Phoenix permit office" (address is Scottsdale, our `universal` item is "Phoenix permit pull")
- "Bar seating extension dimensions" (mentioned but not sized)

## MUST NOT include

- Fire pit (not mentioned)
- Hallucinated luxury items the customer didn't mention (no spa, no putting green, no pool)

## Voice expectations

- Greeting references "Wednesday late-afternoon site walk" or similar
- Mentions the March event timeline
- Mentions the wife's stone-veneer-not-stucco preference
- The proposal should feel premium-craftsman appropriate to a $60K+ project

---

## Pass threshold

**80/100** — complex case with intentional ambiguities. Tolerance for some count drift on line items. **`needs_render=true` is non-negotiable** — if it's false, the case automatically loses 5 points + flag as a major issue.
