# 08 — Design System

Visual + interaction language for the Greenscape Quote Agent admin UI and customer-facing PDF.

**Brand essence (derived from positioning):** Premium craftsman. Phoenix landscape aesthetic. Quiet confidence. "Photographs well." Not corporate. Not flashy.

---

## Color palette

Inspired by Phoenix landscape: sage, sandstone, terracotta, sky.

```
Primary
  Mojave Green        #2C4A3A   /* deep forest, primary brand */
  Mojave Green Light  #4A6B57   /* hover, emphasis */

Secondary / Surfaces
  Sandstone           #D4B896   /* warm tan, accents */
  Caliche White       #F8F4ED   /* warm off-white, backgrounds */
  Adobe               #E8DFD2   /* card surfaces, slightly tinted */

Accent
  Sunset Terracotta   #B8623E   /* primary CTAs, highlights */
  Amber Hour          #D4904E   /* secondary accent */

Text
  Saguaro Black       #1A1F1A   /* primary text */
  Stone Gray          #6B7064   /* secondary text */
  Mesa Gray           #9B9F98   /* tertiary, hints */

Semantic (status)
  Success Green       #4A7C59   /* sent, accepted */
  Warning Amber       #C7902C   /* draft_ready, needs review */
  Error Brick         #A14B3C   /* validation_failed, rejected */
  Info Sky            #5A7B8C   /* drafting, sending */
  Lost Gray           #847F75   /* lost */
```

**Contrast:** All text/background combos meet WCAG AA (4.5:1 minimum). Buttons meet AA Large (3:1).

---

## Typography

```
Display / Headings
  Family:   "Cormorant Garamond" (serif)
  Fallback: Georgia, serif
  Weight:   500 (regular), 600 (semibold)
  Use:      H1 page titles, proposal cover headings

Subheadings
  Family:   "Inter" (sans-serif)
  Weight:   600 (semibold)
  Use:      H2-H4 in admin UI, section headers

Body / UI
  Family:   "Inter" (sans-serif)
  Fallback: -apple-system, system-ui, sans-serif
  Weight:   400 (regular), 500 (medium for emphasis)
  Use:      paragraphs, labels, button text

Numerals (prices, totals, IDs)
  Family:   "Inter" with `font-feature-settings: "tnum"`
  Use:      anywhere numbers align in columns
```

**Sizes (rem, base 16px):**
- Display:   2.5rem / 40px (page titles)
- H2:        1.5rem / 24px
- H3:        1.125rem / 18px
- Body:      1rem / 16px
- Small:     0.875rem / 14px
- Micro:     0.75rem / 12px

**Line heights:** 1.5 body, 1.25 headings.

---

## Spacing scale

Follow Tailwind's default scale: `2, 4, 6, 8, 12, 16, 24, 32, 48, 64` (px). Use generous whitespace — the brand reads "premium" partly through breathing room.

**Defaults:**
- Page side padding: `px-8` (32px)
- Card internal padding: `p-6` (24px)
- Vertical rhythm between sections: `space-y-8` (32px)
- Form field spacing: `space-y-4` (16px)

---

## Layout

**Container:** max-width `max-w-6xl`, centered, with `px-6 md:px-8`.

**Top nav:**
- Greenscape Pro logo (text "GP" placeholder mark + wordmark)
- Page title to the right
- Cumulative API cost ($X.XX this session) far right — small, muted
- Single-user app — no auth chrome, no user menu

**Footer:** minimal. "Greenscape Quote Agent · v0.1 · [link to repo]"

**Page anatomy:**
```
┌──────────────────────────────────────────────────┐
│ [GP] Greenscape Pro · Quote Agent    $0.42 today │
├──────────────────────────────────────────────────┤
│                                                  │
│  Page heading                                    │
│  ───────────                                     │
│                                                  │
│  [main content]                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Components

### Button

**Primary** — `bg-Mojave-Green text-Caliche-White hover:bg-Mojave-Green-Light`
- Use: main action per page (Approve, Send, Save)

**Secondary** — `border border-Saguaro-Black text-Saguaro-Black hover:bg-Adobe`
- Use: secondary actions (Cancel, Edit)

**Ghost** — `text-Mojave-Green hover:underline`
- Use: tertiary actions, links

**Destructive** — `bg-Error-Brick text-Caliche-White hover:opacity-90`
- Use: rejection, deletion (rare)

Sizes: `sm` (px-3 py-1.5), `md` (px-4 py-2 default), `lg` (px-6 py-3).

### Input / textarea / select

- Base: `bg-Caliche-White border border-Stone-Gray rounded px-3 py-2`
- Focus: `border-Mojave-Green ring-2 ring-Mojave-Green/20`
- Error: `border-Error-Brick`
- Disabled: `bg-Adobe text-Mesa-Gray cursor-not-allowed`

Labels above input. Helper text below in Stone-Gray, micro size.

### Card

- Background: `bg-Caliche-White`
- Border: `border border-Adobe rounded-lg`
- Padding: `p-6`
- Shadow: `shadow-sm` (subtle)
- Header: optional H3 with bottom border

### Status Badge

Pill shape, semantic color, small text. Uses status enum from `quotes.status`.

```
drafting          → bg-Info-Sky/15 text-Info-Sky
draft_ready       → bg-Warning-Amber/15 text-Warning-Amber
validation_failed → bg-Error-Brick/15 text-Error-Brick
sending           → bg-Info-Sky/15 text-Info-Sky
sent              → bg-Success-Green/15 text-Success-Green
accepted          → bg-Success-Green text-Caliche-White
rejected          → bg-Error-Brick text-Caliche-White
lost              → bg-Lost-Gray/15 text-Lost-Gray
```

Display label (snake_case → Title Case): "Draft Ready", "Validation Failed", etc.

### Data Table

- Header row: `bg-Adobe font-semibold text-Saguaro-Black`
- Body rows: alternating `bg-Caliche-White` and `bg-Adobe/50` (subtle striping)
- Borders: minimal — just bottom borders on rows, no vertical lines
- Numeric columns: right-aligned with tabular numerals

### Inline Edit Cell (for line items table)

- Default: text rendered, hover reveals subtle pencil icon
- Click → input appears in place, focused
- Blur or Enter → save, optimistic UI update
- Recompute totals immediately on quantity/price change

### Modal

- Backdrop: `bg-Saguaro-Black/40`
- Container: `bg-Caliche-White rounded-lg shadow-xl max-w-2xl`
- Header: title + close X
- Body: scrollable if needed
- Footer: action buttons right-aligned, Cancel ghost, Confirm primary

### Toast (success/error feedback)

- Bottom-right corner
- Auto-dismiss after 4s (success) or 8s (error)
- Slide-in from right
- Background: semantic color, white text

### Skeleton (loading state)

- Pulse animation
- Match the shape of what's loading (table rows, card outlines)
- Color: `bg-Adobe`

### Ambiguity Callout (domain-specific)

When the agent surfaces ambiguities for Marcus to clarify:

```
┌─────────────────────────────────────┐
│ ⚠ Needs clarification              │
│                                     │
│ "Is the 16x16 patio area travertine │
│  or flagstone? Notes mention both." │
│                                     │
│ Affects: Patio (line 1)             │
│ [Mark resolved] [Keep flagged]      │
└─────────────────────────────────────┘
```

- Background: `bg-Warning-Amber/10 border-l-4 border-Warning-Amber`
- Icon: warning triangle
- Body: question in body text, source reference in micro
- Actions: ghost buttons

---

## Voice / tone for UI copy

- **Quiet confidence.** No exclamation marks. No emoji. No "amazing", "stunning", "perfect".
- **Specific over generic.** "4 line items in this proposal" not "Items found!". "Sending to claire@gmail.com" not "Message sent successfully!".
- **Direct.** "Approve and send" not "Click here to approve". "Edit the draft" not "Click to make changes".
- **Acknowledge state.** "Draft ready for review" not just "Ready". "Validation flagged 2 issues" not just "Failed".

Example labels:
- Empty state on /quotes: *"No quotes yet. Create one to get started."* (not "Welcome! Click here to create your first quote!")
- Loading state: *"Drafting proposal..."* (not "Please wait")
- Success: *"Sent to claire@example.com"* (not "Success! Email sent!")

---

## PDF design (customer-facing)

Different aesthetic than admin UI: more formal, more whitespace, premium feel.

**Page setup:**
- Letter size (8.5×11"), portrait
- Margins: 0.75" top/bottom, 0.625" sides
- Font: Cormorant for headings, Inter for body, Inter Tabular for prices

**Cover page (page 1):**
- Top 40%: optional cover banner area (project visualization placeholder OR Phoenix landscape photo-feel)
- Mid: "Proposal" wordmark in Cormorant 48pt
- "Prepared for [Customer Name]" in Inter 14pt
- Project address
- Date + Proposal #
- Bottom: Greenscape Pro logo placeholder + tagline

**Body pages:**
- Section headings in Cormorant 24pt with underline accent (1px Sandstone)
- Body in Inter 11pt with 1.6 line height
- Generous margins (no edge-to-edge content)

**Line items table:**
- Header row: `bg-Adobe font-semibold`
- Body rows: alternating subtle striping
- Columns: Description (60%), Qty (10%), Unit (10%), Unit Price (10%), Line Total (10%)
- Numeric columns: right-aligned, tabular numerals
- Group by category with category subtotal rows

**Total emphasis:**
- Large Cormorant 28pt
- Sunset Terracotta accent line above
- "Project Total: $XX,XXX" right-aligned

**Signature block (final page):**
- Two columns: Customer signature line + Marcus signature line
- Date fields below each
- Terms text in Inter 9pt above signatures

---

## Brand mark (logo placeholder)

Until a real logo exists, use:
```
[GP]  Greenscape Pro
```
- "GP" in a 32×32 box, Mojave Green background, Caliche White text, Cormorant 18pt
- "Greenscape Pro" wordmark in Cormorant 18pt next to it
- This placeholder appears in: top nav, PDF cover, PDF footer

---

## Accessibility checklist

- [ ] All text/background combos meet WCAG AA (4.5:1)
- [ ] All interactive elements have visible focus state (`ring-2 ring-Mojave-Green/40`)
- [ ] All images have alt text (PDF cover banner is decorative, alt="")
- [ ] All form fields have associated labels
- [ ] All buttons have descriptive text or aria-label
- [ ] Color is never the only signal (status badges include text label)
- [ ] Tab order follows visual reading order
- [ ] No keyboard traps in modals
- [ ] Page has logical heading hierarchy

---

## Tailwind config additions

```ts
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        'mojave-green': { DEFAULT: '#2C4A3A', light: '#4A6B57' },
        'sandstone': '#D4B896',
        'caliche-white': '#F8F4ED',
        'adobe': '#E8DFD2',
        'sunset-terracotta': '#B8623E',
        'amber-hour': '#D4904E',
        'saguaro-black': '#1A1F1A',
        'stone-gray': '#6B7064',
        'mesa-gray': '#9B9F98',
        'success-green': '#4A7C59',
        'warning-amber': '#C7902C',
        'error-brick': '#A14B3C',
        'info-sky': '#5A7B8C',
        'lost-gray': '#847F75',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      fontFeatureSettings: {
        'tnum': '"tnum"',
      },
    },
  },
}
```

---

## Reference: skills relevant to design

- `frontend-design` skill (in superpowers) — *"creates distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code that avoids generic AI aesthetics."* — Chat B should invoke this skill.

The intent of this design system is to AVOID the generic-AI-app aesthetic (purple gradients, rounded everything, sparkle emoji). Greenscape's brand requires intentional, restrained, place-specific design.
