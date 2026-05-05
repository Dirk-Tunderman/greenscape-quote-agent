# Test Case 04 — Sparse but valid input

**Profile:** Minimal site walk notes — mentions categories without dimensions or specifics. Tests the agent's **restraint** when uncertain. The agent must NOT hallucinate dimensions or material choices; it MUST surface ambiguities heavily.

**Hypothesis:** Agent surfaces 4-5 ambiguities (max). Line items are placeholders/low-certainty. Total is small (universal items + a few low-cert items priced at category defaults). Status is `draft_ready` with explicit clarification needed.

**Caveat:** This input might trip Layer 3a (extract_scope `__no_scope` exit) and reject the request entirely. That's also an acceptable outcome — see "Acceptable outcomes" below.

---

## Input

| Field | Value |
|---|---|
| Name | Dirk Tunderman |
| Email | test@example.com |
| Phone | +31 6 14554096 |
| Project address | 1118 W Roma Ave, Phoenix, AZ 85013 |
| Project type | Backyard refresh |
| HOA | (unchecked) |

**Site walk notes:**

```
Walk Sat AM. Backyard. Wants a new patio, maybe pergola too. Existing turf needs replacing. Irrigation could use a tune-up. Small yard, ranch house, single-story. Customer was friendly, mentioned a budget but didn't pin a number. Timeline flexible.
```

(~50 chars per category mentioned, no dimensions, no materials)

---

## Acceptable outcomes (either is a pass)

### Outcome A — agent generates a draft with heavy ambiguities

| Dimension | Expected |
|---|---|
| Status | `draft_ready` |
| Total amount | **$2,000 – $15,000** | — wide; will be small because items are mostly placeholders |
| Line item count | **3-7 items** |
| **Ambiguities** | **4-5 (capped)** ⭐ — primary success criterion |
| `needs_render` | false |

### Outcome B — extract_scope rejects with `__no_scope`

| Dimension | Expected |
|---|---|
| API response | 400 with `reason_code: no_scope_extractable` |
| Quote row | created, status=`validation_failed` |
| Cost | ~$0.005 |

If Outcome B happens, that's actually GOOD — the system correctly identified that the input didn't contain enough to draft against. Note it in the result and pass the case.

---

## Required behavior — both outcomes share these

The agent MUST do at least one of:
- Surface ambiguities about: patio dimensions, patio material, pergola material/footprint, turf area, existing turf type
- Emit `__no_scope` exit with a reason explaining the input is too sparse

The agent MUST NOT:
- Invent specific dimensions ("travertine patio 480 sq ft") when the input says nothing about size or material
- Default to expensive items (premium travertine, premium pergola) without the customer specifying
- Generate a $40K proposal from this input — that would be flagrant hallucination

## Voice expectations

If proposal is generated:
- Greeting acknowledges the conversational/exploratory nature of the visit
- Many "to be confirmed" or similar hedge language is appropriate
- Material descriptions should NOT be SKU-locked given uncertainty

---

## Pass threshold

**75/100** — this is intentionally hard. The "score" is mostly about whether the agent **doesn't hallucinate** rather than producing a tight quote. **Hallucinated specific dimensions = automatic 0 on that dimension.**

This case is the agent's **integrity test** — does it know what it doesn't know?
