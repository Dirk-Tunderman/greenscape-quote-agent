# 14 — Test Cases (Copy-Paste Ready)

Realistic scenarios for testing the new-quote → agent → review → download flow at https://quote-agent.tunderman.cc/quotes/new.

Each case uses Dirk's real contact info (so emails/notifications would reach you) but a Phoenix address (so the agent's Phoenix-specific assumptions — caliche, permits, etc. — apply correctly).

**Site walk notes are intentionally messy** — bullet-shorthand, abbreviations, Marcus-style "pulled out of phone right after the walk." This stress-tests the `extract_scope` skill on actually-realistic input rather than the cleaned-up prose in the form placeholder.

---

## How to use

1. Pick a test case below
2. Open https://quote-agent.tunderman.cc/quotes/new
3. Paste each field (the site walk notes go in the textarea — multiline OK)
4. Pick the dropdown value listed under "Project type"
5. Tick "HOA" if listed
6. Click **Draft proposal**
7. Wait 60-160s (agent runs 5 skills with retry-on-validate-fail)
8. Verify on `/quotes/[id]` that scope, ambiguities, line items, and proposal sections all rendered

If anything fails, capture: the quote ID, the status, the validation_failed message (if any), and the audit log skill trace.

---

## Case 1 — Small project (~$8-12K, no render trigger)

Tests: minimal scope, single category, fire-pit-only. Should produce ~5-7 line items.

| Field | Value |
|---|---|
| **Name** | Dirk Tunderman |
| **Email** | dirk.tunderman@outlook.com |
| **Phone** | +31 6 14554096 |
| **Project address** | 3024 N 44th St, Phoenix, AZ 85018 |
| **Project type** | Fire pit / fire feature |
| **HOA** | (unchecked) |

**Site walk notes (paste into textarea):**

```
Tue site walk 9am. Backyard, existing wood-burning fire pit (flagstone, rough shape). Wants to convert to gas. ~36" round area, but wants slightly bigger — maybe 42-48". Existing flagstone can stay if structurally OK, otherwise replace.

Gas line — meter is on the side of the house, ~25 ft run to the patio. Trench through xeriscape area, no turf damage to worry about.

Customer: easy to talk to. Ranch house, mid-century vibe. No HOA. Wants this done before the holidays so timeline matters — if we can start in 4-5 wks they're happy.

Budget: didn't volunteer a number, but mentioned they got a quote for $7K from another guy. Hinted they'd pay more for "less BS scheduling."
```

---

## Case 2 — Mid project (~$25-35K, typical $28K-avg Marcus quote)

Tests: multi-category bundle, irrigation + patio + pergola, no render trigger but close. Should produce ~10-12 line items spread across 3 categories.

| Field | Value |
|---|---|
| **Name** | Dirk Tunderman |
| **Email** | dirk.tunderman@outlook.com |
| **Phone** | +31 6 14554096 |
| **Project address** | 7456 E Rancho Vista Dr, Scottsdale, AZ 85251 |
| **Project type** | Patio |
| **HOA** | ☑ checked |

**Site walk notes (paste into textarea):**

```
Walk Mon morning. Backyard patio + pergola refresh. Existing concrete patio (cracked, ~16x20) coming out, replace with travertine — premium grade, sand-set. Customer was really specific about travertine, doesn't want pavers.

Pergola: cedar, 12x12, over the dining table area. Wants lighting package (string lights + 2 downlights). Stained or natural finish — undecided, keeps changing her mind. Could go either way.

Irrigation: existing controller is dead. Replace with Rachio 3 (smart controller). 4 zones currently, all working. Just the controller swap.

HOA: yes — Camelback Mountain Ranch HOA. Submission package needed. They're a pretty active HOA so timing matters.

Customer: husband's birthday in 8 wks — wants finished by then "if possible." Budget mentioned offhand: "we set aside about 30 for this." So $30K is the soft cap.

Random: she also asked about a small water feature — bubbling rock thing — but said "maybe phase 2" so don't include in main quote. Mention as add-on?
```

---

## Case 3 — Large project (>$30K, render trigger, full backyard rebuild)

Tests: render flag (`needs_render=true`), multi-category, outdoor kitchen pricing, full backyard. Should produce 15+ line items, total >$30K, RENDER badge visible in list view.

| Field | Value |
|---|---|
| **Name** | Dirk Tunderman |
| **Email** | dirk.tunderman@outlook.com |
| **Phone** | +31 6 14554096 |
| **Project address** | 9842 E Calle de Valle, Scottsdale, AZ 85255 |
| **Project type** | Full backyard rebuild |
| **HOA** | ☑ checked |

**Site walk notes (paste into textarea):**

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

## Case 4 — Edge case: sparse notes (tests ambiguity surfacing)

Tests: agent's `flag_ambiguity` skill on intentionally minimal input. Should surface 3-5 ambiguities (missing dimensions, unclear materials, unclear timeline).

| Field | Value |
|---|---|
| **Name** | Dirk Tunderman |
| **Email** | dirk.tunderman@outlook.com |
| **Phone** | +31 6 14554096 |
| **Project address** | 1118 W Roma Ave, Phoenix, AZ 85013 |
| **Project type** | Patio |
| **HOA** | (unchecked) |

**Site walk notes (paste into textarea):**

```
Patio. Pergola maybe. Customer wants nice. Phx area.
```

Expected behavior: agent generates a draft but surfaces multiple ambiguities ("dimensions unspecified", "material preference unknown", "pergola: yes/no/maybe?", "timeline not captured"). Validation may fail on first attempt (no specific scope items extractable) — useful test of the retry-on-validate-fail loop.

If the agent invents sizes / materials when given input this sparse, that's a regression — flag it and we tighten the `extract_scope` prompt.

---

## Case 5 — Edge case: notes mention out-of-catalog item

Tests: `match_pricing` handling of `is_custom = true`. Should produce a quote where one line item is flagged as "Custom — Marcus to price" rather than auto-priced.

| Field | Value |
|---|---|
| **Name** | Dirk Tunderman |
| **Email** | dirk.tunderman@outlook.com |
| **Phone** | +31 6 14554096 |
| **Project address** | 5234 E Lincoln Dr, Paradise Valley, AZ 85253 |
| **Project type** | Other |
| **HOA** | (unchecked) |

**Site walk notes (paste into textarea):**

```
Walk Thurs 4pm. Customer wants a custom outdoor pizza oven (wood-fired, dome style, brick/stucco finish). Built into a small outdoor kitchenette setup — nothing fancy, just a counter + the oven + a small prep sink. ~5 ft linear footprint.

Plus a small flagstone patio under it, ~80 sq ft, just enough to stand and cook on. Existing dirt area — no demo needed, just base prep.

Budget: $15-20K range. Timeline flexible.

The pizza oven itself is the main thing — they've sourced a kit they want installed (Forno Bravo, 36" dome). We'd be doing the installation + the surrounding stucco enclosure + the chimney work.
```

Expected behavior: pizza oven is NOT in the catalog (we only have grill islands). Agent should flag as `is_custom = true` with a placeholder price or surface as ambiguity for Marcus to price manually. The flagstone patio + base prep + sink should match catalog items normally.

---

## What to log when testing

For each test run, save the resulting `quote_id` and a 1-2 sentence note about what worked / what didn't. Append to this doc as a "Test runs" section at the bottom. Example format:

```
### Run 1 — Case 2 — 2026-05-05
- quote_id: abc123
- Status: draft_ready
- Total: $28,450 (within target band)
- Ambiguities: 3 (pergola finish, water feature add-on, husband's birthday timing)
- Issues: pergola lighting line was duplicated (1 too many)
- Cost: $0.18
```

---

## Quick health-check before deep tests

Before running the cases above, sanity-check the wire-up is live:

```bash
# 1. UI list shows DB rows, not Henderson/Whitfield/etc.
open https://quote-agent.tunderman.cc/quotes

# 2. API returns same data the UI shows
curl -s https://quote-agent.tunderman.cc/api/quotes | jq '.quotes[].customer_name'

# 3. Audit log gets a row when you submit a new quote
# (do submission, then run:)
psql or Supabase: SELECT skill_name, model, cost_usd, success, created_at FROM greenscape.audit_log ORDER BY created_at DESC LIMIT 8;
```

If any of those don't match, the wire-up is incomplete — surface to Chat A before running test cases.
