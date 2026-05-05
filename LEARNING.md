# Learnings — Greenscape Quote Agent (L&S Take-Home)

Things we have learned working on this project. Read this before starting work. Apply these.

---

### Next.js 15 strict "use server" exports

**Date:** 2026-05-05
**Trigger:** First time the user actually clicked "Draft proposal" on the live deploy, the form action crashed with a server-side exception (digest `848605304`). The systemd journal showed: `A "use server" file can only export async functions, found object`. The bug was latent — all curl-based testing against `/api/*` never loaded the page actions module.
**Learning:** Next.js 15 strictly enforces that any file with `"use server"` at the top exports **only async functions**. Interfaces are fine (type-erased at compile), but exporting a `const` object — even something innocuous like a default form-state — is a runtime crash on the first request that loads the module.
**Apply:** Keep `"use server"` files lean: only async function exports. Put shared types + constants in a sibling non-`"use server"` module (e.g., `actions.ts` for the action, `form-state.ts` for the constants/types it shares with the client). Never browser-test substitute server-action paths via curl alone — server actions only load when the page is rendered with the form.

---

### Parse-on-read / recombine-on-save for proposal sections

**Date:** 2026-05-05
**Trigger:** Marcus (and the user during demo) wanted to edit the proposal section by section instead of through one giant markdown blob. Storing sections as separate columns or a JSON structure would have meant a schema migration. We needed the new UX without the schema churn.
**Learning:** When the storage shape is "good enough" but the editing model needs structure, parse on read into a structured representation, edit in that structure in memory, and recombine to the storage shape on save. The proposal_markdown column stays a single string; the editor sees N labeled sections. No migration, no breakage of the PDF renderer that already reads the same column.
**Apply:** Default to parse/recombine when extending an existing free-text column with structure. Use it for proposal sections, payment-schedule blocks within a section, anywhere a "single string" column is awkward to edit but cheap to derive structure from. Reach for a schema change only when the structure itself needs to be queried, indexed, or referenced by foreign keys.

---

### Single-source pricing (line items as truth)

**Date:** 2026-05-05
**Trigger:** The proposal markdown contained a duplicate copy of the line-items table and the payment-schedule percentages — both pre-computed by the agent and **not** re-derived after Marcus edited line items. Project Total in the proposal disagreed with the live total in the line items panel.
**Learning:** When two surfaces present the same number, exactly one of them must be the source of truth and the others must derive from it at render/save time — never store the same fact twice. If the LLM produces both the canonical data (line items) and a textual representation (markdown table, payment schedule), throw the textual one away and re-derive it deterministically.
**Apply:** Section 4 ("Detailed Scope & Pricing") is auto-derived from `line_items` + total. Section 8's payment schedule block is auto-derived from total × `payment_schedule`. The PDF renders from `line_items` + `payment_schedule` directly. The agent's text outputs for these surfaces are discarded after the structured data is captured. Pattern generalizes: any time you see "the LLM also writes a sentence with this number", make the sentence template + value, not free text.

---

### Drop+insert for line-item edits

**Date:** 2026-05-05
**Trigger:** Adds + deletes + edits all needed to round-trip through the same save path. Diffing partial patches against current state on the server is fiddly and a source of subtle bugs.
**Learning:** When the entity is small (a few rows per quote), full-list-replace is simpler than diffing. The client owns the "current state" representation; the server drops everything and reinserts what was sent. Server stays trivial; client has one save path for all edit operations.
**Apply:** `PATCH /api/quotes/[id]` with `line_items: [...full list]` drops then inserts. `replaceLineItems` in `data/store.ts` is the single client-side entry point. Manual rows use temp `tmp_*` IDs locally; the store strips non-UUID IDs before sending so the server treats them as fresh inserts. Use this pattern for any small-N collection where edit semantics include adds, deletes, and reorders.

---

### Status enum stability vs. UX framing

**Date:** 2026-05-05
**Trigger:** UX feedback was that "Finalized" felt terminal — Marcus thought editing was over once a PDF generated. We considered renaming the enum value or adding a new one, but both options cascaded across the migration + the API + the validators.
**Learning:** Database enums are expensive to change; UI labels are nearly free. When the *meaning* of a state shifts but the *boundary* stays the same, change the rendering layer, not the schema. The DB enum `sent` now displays as "PDF Ready" and the lock semantics moved from "sent locks editing" to "only outcome states lock editing" — both pure UI/route changes, no migration.
**Apply:** Treat the enum value as a stable identifier; treat its label and its UI consequences as cheap to revisit. If a label disagrees with current product framing, change the label. If a workflow rule disagrees with current product framing, change the route guard or the readOnly computation. Schema only changes when the state space itself needs to expand or contract.

---

### react-pdf `<Text>` doesn't reserve block height when content wraps

**Date:** 2026-05-05
**Trigger:** Right after wiring `proposal_markdown` through to the PDF (D45), the body looked broken: two paragraphs in the Project Overview section painted on top of each other. `pdftotext -layout` came back with their lines interleaved. The first `<Text>` would visually wrap to 6 lines but the layout engine treated it as 1 line tall, so the next `<Text>` started at the same Y origin.
**Learning:** In react-pdf, only `<View>` reliably reserves a block-sized layout box for its descendants. `<Text>` with line-wrapping content can collapse onto the previous element if you set `marginBottom` and rely on the layout engine to push siblings down. The same trap hits "borderBottom on a heading Text" — the border can paint where the *unwrapped* line would have ended, not where the wrapped text actually does end.
**Apply:** Wrap every block-level fragment of a PDF body — paragraph, bullet list, heading + divider — in its own `<View>`. Don't use `borderBottom` on a Text to draw a section divider; render the divider as a separate `<View>` underneath. For tables: every row needs `wrap={false}` so a page break can't split a row mid-content; the header row needs `fixed` so it repeats when the table wraps to a second page. Bullet items also need `wrap={false}` so the dot can't get separated from its text by a page break.

---

### `backdrop-filter` creates a containing block for `position: fixed` descendants

**Date:** 2026-05-05
**Trigger:** The bottom sticky bar on `/quotes/[id]` uses `backdrop-blur` for the visual blur effect. The "Re-generate PDF" modal opened from the bottom button used `fixed inset-0` to span the viewport — but it was being positioned relative to the ~80px sticky bar, not the viewport. Modal showed up clipped/pushed off-screen. Top button's modal worked fine because that `ApproveBar` wasn't inside any `backdrop-filter` ancestor.
**Learning:** Per the CSS Backdrop Filter spec, an element with `backdrop-filter` (anything other than `none`) establishes both a stacking context AND a containing block for absolutely- and fixed-positioned descendants. So `position: fixed` doesn't mean "viewport" anymore — it means "the nearest backdrop-filtered ancestor's box". `transform`, `filter`, `perspective`, `will-change`, and `contain` are the well-known containing-block creators; `backdrop-filter` is the less-known one and the easiest to forget.
**Apply:** Render any modal/overlay that needs viewport-anchored `fixed` positioning into a portal at `document.body`. The portal target is outside any `backdrop-filter` ancestor, so `fixed inset-0` actually means the viewport. This is the same fix you'd apply for `transform: translateZ(0)` traps; the cause is different but the cure is identical. Keep that in mind any time a modal looks "right" in some triggers and "wrong" in others — check what wraps the trigger.

---

### Audio recordings are an alternative path through the SAME data sink

**Date:** 2026-05-05
**Trigger:** Feature request was "let users upload an audio file of the site walk and use it to draft the proposal" (D43). First instinct was to add a parallel `raw_audio_url` field on the form, send it to the agent, and have the agent know how to handle audio. That's wrong: the agent only consumes text.
**Learning:** When adding a new input modality on top of an existing pipeline, look for the seam where the modality stops mattering. For us that seam was `raw_notes` — once a recording becomes a transcript, it's just text, and the rest of the pipeline doesn't need to know. Single ingest path on the backend (`raw_notes`), two front-end paths to populate it (typed or transcribed), one form submit either way.
**Apply:** Don't fork backend code per input modality. Convert at the edge (transcribe on upload), write the result into the existing field, and let the existing pipeline run. The user can review/edit the transcript in the textarea before submitting — that's a feature, not a bug; LLM transcripts are ~95% accurate and Marcus may want to fix proper nouns. UI rule: structure the form so the relationship is visible — one "Site walk" group with an "and / or" divider beats two separate fields where the connection is implicit.

<!--
Entry format:

### [Short description of the learning]
**Date:** YYYY-MM-DD
**Trigger:** [What was happening — usually a mistake, a correction, a surprise, or a discovery]
**Learning:** [What we now know — 1-2 sentences]
**Apply:** [The specific rule or pattern that follows from this learning]
-->
