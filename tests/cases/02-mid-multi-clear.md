# Test Case 02 — Mid-size, multi-category, well-described

**Profile:** Multi-category bundle (patio + pergola + irrigation) at the $28K avg target. HOA active. Mostly clear with one explicit "undecided" topic (pergola finish). Tests bundling, HOA inclusion, and how the agent handles ONE explicit ambiguity Marcus flagged himself.

**Hypothesis:** Agent surfaces 1-2 ambiguities centered on the pergola finish; total lands close to $28K; HOA submission package present; no hallucinations.

---

## Input

| Field | Value |
|---|---|
| Name | Dirk Tunderman |
| Email | dirk.tunderman@outlook.com |
| Phone | +31 6 14554096 |
| Project address | 7456 E Rancho Vista Dr, Scottsdale, AZ 85251 |
| Project type | Patio + pergola + irrigation refresh |
| HOA | ☑ checked |

**Site walk notes:**

```
Walk Mon morning. Backyard patio + pergola refresh. Existing concrete patio (cracked, ~16x20) coming out, replace with travertine — premium grade, sand-set. Customer was really specific about travertine, doesn't want pavers.

Pergola: cedar, 12x12, over the dining table area. Wants lighting package (string lights + 2 downlights). Stained or natural finish — undecided, keeps changing her mind. Could go either way.

Irrigation: existing controller is dead. Replace with Rachio 3 (smart controller). 4 zones currently, all working. Just the controller swap.

HOA: yes — Camelback Mountain Ranch HOA. Submission package needed. They're a pretty active HOA so timing matters.

Customer: husband's birthday in 8 wks — wants finished by then "if possible." Budget mentioned offhand: "we set aside about 30 for this." So $30K is the soft cap.

Random: she also asked about a small water feature — bubbling rock thing — but said "maybe phase 2" so don't include in main quote. Mention as add-on?
```

---

## Expected outcome

| Dimension | Expected | Notes |
|---|---|---|
| Status | `draft_ready` first try | minor ambiguities only |
| Total amount | **$22,000 – $32,000** | targeting Marcus's $28K avg, soft cap $30K |
| Line item count | **8-13 items** | patio (4-5) + pergola (2-3) + irrigation (1-2) + universal (3) |
| Ambiguities | **1-2** | pergola finish stained/natural is the obvious one |
| `needs_render` | likely **false** | should be under $30K; if total >$30K, render flag must be true |
| Cost | <$0.30 | medium chain |
| Time | <150s | |

## Required scope items

- Existing concrete demo + haul (`patio`)
- Caliche-resistant base prep (`patio`)
- Travertine paver patio (`patio`) — premium grade
- Cedar pergola 12×12 (`pergola`)
- Pergola lighting package (`pergola`)
- Rachio smart controller (`irrigation`)
- HOA submission package (`universal`) — because HOA was checked
- Phoenix permit pull (`universal`)
- Final cleanup + haul (`universal`)

## SHOULD include (look for these)

- The pergola finish question surfaced as ambiguity
- The water feature mentioned as "phase 2 / add-on" but NOT priced as a line item

## MUST NOT include

- Bubbling rock fountain or any water feature (explicitly deferred to Phase 2)
- Fire pit, kitchen, retaining wall
- 3D render line item (the project should land under the $30K render threshold; if it goes over, render flag must auto-set)

## Voice expectations

- Greeting references "Monday morning site walk" or similar
- Mentions the husband's birthday timeline in the Timeline section
- Material descriptions stay at category/grade ("premium travertine, sand-set", "Western red cedar 12×12")
- Pergola finish flagged as needing decision

---

## Pass threshold

**82/100** — typical Marcus quote, agent should handle this well. Slight tolerance for ambiguity-count drift.
