# Tests — End-to-End Quality Suite

Six browser-based test cases that exercise the deployed agent against expected outcomes. Each case tests a different agent behavior dimension. Sub-agents run them as users would (browser automation) and produce structured result files.

## Layout

```
tests/
├── README.md                       this file
├── EVALUATION-RUBRIC.md            shared scoring criteria + grading method
├── SUB-AGENT-INSTRUCTIONS.md       copy-paste prompt for spawning a runner
├── cases/
│   ├── 01-small-clear.md           Single-cat fire pit, max clarity
│   ├── 02-mid-multi-clear.md       Multi-cat $28K target, well-described
│   ├── 03-large-render-hoa.md      Full backyard, render trigger, HOA
│   ├── 04-sparse-valid.md          Minimal info, agent must surface ambiguities
│   ├── 05-out-of-catalog.md        Custom item not in catalog
│   └── 06-conflicting-info.md      Self-contradictory notes
└── results/                        sub-agents write here, one file per run
```

## Why six cases (the design rationale)

Each case isolates a different agent behavior we want to grade:

| # | Case | Tests |
|---|---|---|
| 1 | Small + clear | Happy path, low-noise, single-category extraction, clean draft on first try |
| 2 | Mid + multi-cat clear | Multi-category bundling, HOA inclusion, single-ambiguity handling, $28K target |
| 3 | Large + render + HOA | Render flag (`needs_render=true`), category breadth, scale stress |
| 4 | Sparse but valid | Restraint when uncertain — agent must NOT hallucinate; should surface ambiguities |
| 5 | Out-of-catalog | `is_custom=true` flagging vs hallucinating a price |
| 6 | Conflicting info | How agent reconciles contradictions (travertine AND concrete; cedar AND aluminum) |

## How a test run works

1. **Sub-agent reads its assigned case file** from `tests/cases/`
2. **Opens the browser** to https://quote-agent.tunderman.cc/quotes/new
3. **Fills the form** with the case's input fields (uses MCP browser tools)
4. **Submits and waits** for the agent (60-180s typical)
5. **Lands on the quote detail page** (`/quotes/[id]`)
6. **Reads the rendered output** — scope, line items, ambiguities, proposal markdown, total, status
7. **Compares each expected dimension to actual**, scores per the rubric
8. **Writes a result file** to `tests/results/<case-id>-<timestamp>.md`

## Why this matters

The brief grades 40% on build quality and explicitly penalizes "demos that break if you click outside the happy path." End-to-end tests against the deployed product are the only way to actually verify the system holds up across varied input. Snippet-level unit tests don't catch UX regressions, prompt drift, or schema mismatches.

These tests also produce concrete numbers for the Loom — *"we ran 6 representative quotes against the live system; here's the score, here's where it slipped, here's why."*

## Running the suite (when ready)

We're spawning **3 sub-agents to run 2 cases each**. The deployment prompt is in `SUB-AGENT-INSTRUCTIONS.md`. Each sub-agent gets that prompt + the 2 case file paths it owns.

After all 6 result files are written, the main chat (or the user) reviews them, summarizes findings, and decides whether the system is Loom-ready.

## What we're NOT testing here

- Catalog CRUD UI (works, manually tested in earlier session)
- Form validation (Layer 1 input gating — covered by curl tests)
- Pre-flight relevance check (Layer 2 — covered by curl tests in commit 59539f9)
- `extract_scope` `__no_scope` exit (Layer 3a — same)
- Audio upload (in-flight by another chat — separate test plan when shipped)

This suite focuses on **happy-path AND edge-case quality of the agent's actual proposal output**, not the input-quality defenses (already verified separately).

## Cost estimate

6 runs × $0.10-0.30 per run ≈ **$1-2 total**. Acceptable for the Loom material it produces.
