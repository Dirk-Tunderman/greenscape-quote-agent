# Test Case 06 — Self-conflicting / contradictory notes

**Profile:** Notes contain explicit contradictions — same patio described as both travertine AND concrete; pergola described as both cedar AND aluminum; turf area mentioned twice with different square footages. Tests how the agent handles inconsistent input — does it pick one and silently move on, or surface the contradiction as ambiguity?

**Hypothesis:** Agent surfaces 2-4 ambiguities flagging the contradictions explicitly. Picks the more recent / more confident-sounding option as the primary line item but notes the alternative. Does NOT generate two parallel line items for the same scope (no double-pricing of the patio).

---

## Input

| Field | Value |
|---|---|
| Name | Dirk Tunderman |
| Email | dirk.tunderman@outlook.com |
| Phone | +31 6 14554096 |
| Project address | 4421 E Camelback Rd, Phoenix, AZ 85018 |
| Project type | Patio + pergola + turf |
| HOA | (unchecked) |

**Site walk notes:**

```
Site walk Tuesday morning. Backyard refresh for the Hendersons.

Patio: replace existing concrete (cracked), going with travertine, ~16x20 feet. Premium grade, sand-tone. Wait — actually they want to do concrete pavers instead, simpler maintenance. Let's go with concrete pavers.

Pergola: cedar 12x12 over the dining area. They saw something at a friend's house — aluminum 12x12, powder-coated. Liked it better, lower maintenance. So aluminum 12x12.

Artificial turf: ~400 sq ft for the dog area on the side yard. Standard 50oz. Customer also mentioned the front yard — about 600 sq ft also for turf, premium grade.

Permit, cleanup, the usual.

Customer is fine, friendly. No HOA. Timeline 6 weeks.
```

---

## Expected outcome

| Dimension | Expected | Notes |
|---|---|---|
| Status | `draft_ready` first try | |
| Total amount | **$15,000 – $30,000** | wide; depends on which materials/sizes the agent picks |
| Line item count | **8-12 items** | should NOT have duplicate patio or pergola entries |
| **Ambiguities** | **2-4** ⭐ — **primary success criterion** | must flag the contradictions |
| `needs_render` | likely **false** | should be under $30K |
| Cost | <$0.30 | |
| Time | <150s | |

## Required ambiguities (the agent MUST surface AT LEAST ONE of each)

1. **Patio material conflict** — "Travertine OR concrete pavers? Notes mentioned both" or similar
2. **Pergola material conflict** — "Cedar OR aluminum? Notes mention both" or similar
3. **Turf scope** — "400 sq ft side yard standard, plus 600 sq ft front yard premium — is the front yard included in this quote?"

If the agent surfaces 2 of these 3 explicitly, that's a pass on the ambiguity dimension.

## Required scope items (one of each, NOT both)

- Patio: pick ONE — either travertine paver OR concrete paver (not both, not double-priced)
- Pergola: pick ONE — either cedar 12×12 OR aluminum 12×12
- Turf: handle the 400 sq ft + 600 sq ft (could be one combined, two separate, or front yard flagged for clarification)
- Existing concrete demo + haul (`patio`) — concrete IS being removed regardless
- Caliche-resistant base prep (`patio` AND/OR `artificial_turf`)
- Phoenix permit pull (`universal`)
- Final cleanup + haul (`universal`)

## CRITICAL behavior to verify

✅ **Best:** Agent picked the more recent option for each contradiction (concrete pavers, aluminum, both turf areas) AND flagged the contradiction as ambiguity. ("Notes mention both X and Y — going with Y as the more recent direction; please confirm.")

✅ **Acceptable:** Agent picked one of the options (either side) AND flagged the conflict as ambiguity.

❌ **HARD FAIL:** Agent generated TWO patio line items (both travertine and concrete pavers) → double-priced. Or two pergola line items.

❌ **HARD FAIL:** Agent silently picked one without surfacing the conflict in ambiguities.

❌ **HARD FAIL:** Agent invented a third option that wasn't mentioned ("flagstone patio") to "compromise" between the two.

## MUST NOT include

- Water feature, fire pit, kitchen, retaining wall, HOA package, 3D render

## Voice expectations

- Greeting references "Tuesday morning site walk"
- Customer name "Dirk Tunderman" (NOT "Henderson" — the notes mention Henderson as the customer name internally but the form has Dirk Tunderman; agent must use the form value, not what's in the notes)

---

## Pass threshold

**78/100** — intentionally tricky. Primary measurement is whether the agent surfaces the contradictions and DOES NOT double-price. The "Henderson vs Dirk Tunderman" check is a bonus — agent should use the customer info from the form, not from the notes.

This case tests **agent honesty** — does it tell Marcus "the input was inconsistent" rather than just picking and moving on?
