# 03 — Architecture

## System overview

```
┌──────────────────┐
│  Marcus          │
│  (Browser)       │
└────────┬─────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────────────────┐
│  Next.js 15 App on Hetzner VPS (Caddy + systemd)│
│                                                 │
│  Pages (App Router):                            │
│   /quotes              → list                   │
│   /quotes/new          → input form             │
│   /quotes/[id]         → review/edit/approve    │
│   /admin/line-items    → catalog view           │
│                                                 │
│  API Routes:                                    │
│   POST /api/agent/draft       → orchestrator    │
│   POST /api/quotes/[id]/send  → PDF + email     │
│   GET  /api/quotes            → list            │
│   PATCH /api/quotes/[id]      → edits           │
└────────┬─────────────────┬──────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│  Anthropic API  │  │  Supabase        │
│                 │  │                  │
│  Claude Sonnet  │  │  Postgres DB     │
│  (extract,      │  │  Storage (PDFs)  │
│   match,        │  │  Auth (optional) │
│   generate)     │  │                  │
│                 │  └──────────────────┘
│  Claude Haiku   │
│  (flag,         │
│   validate)     │
└─────────────────┘
                              ▲
         ┌────────────────────┘
         ▼
┌─────────────────┐
│  Resend         │
│  (Email send)   │
└────────┬────────┘
         │ SMTP
         ▼
┌─────────────────┐
│  Customer       │
│  (Email inbox)  │
└─────────────────┘
```

---

## Stack rationale

| Component | Choice | Why |
|---|---|---|
| Frontend / API | Next.js 15 (App Router) + TypeScript | Single deploy, API routes co-located, fast iteration, SSR for PDF generation |
| Hosting | Hetzner VPS (mixed-use) | Existing infra; systemd service behind Caddy reverse proxy; satisfies brief's public deployment requirement |
| Database | Supabase (Postgres) | Managed Postgres, generous free tier, built-in auth + storage, fits brief's persistent storage requirement |
| LLM | Anthropic Claude (Sonnet + Haiku) | Sonnet for quality on generation tasks, Haiku for cost on classification/validation. Cost-aware multi-model strategy is a brief bonus criterion. |
| Email | Resend | Simplest API for outbound email, dev-friendly, satisfies external integration requirement |
| PDF | `react-pdf` (or `puppeteer` fallback) | Real PDFs from React components |
| Schema validation | `zod` | Runtime validation of LLM outputs against expected structure |
| Styling | Tailwind CSS | Fast UI iteration, consistent design tokens |
| Auth (optional) | Supabase Auth (magic link) | If time, single-user login; otherwise demo mode (documented) |

---

## Components

| Component | Path | Purpose |
|---|---|---|
| Input UI | `/quotes/new` | Customer info + project metadata + scope notes textarea |
| Agent orchestrator | `/api/agent/draft` | Runs the skill chain on submitted notes |
| Draft review UI | `/quotes/[id]` | Shows scope, line items, totals, draft copy; all editable |
| Approve & send | `/api/quotes/[id]/send` | Generates PDF, sends via Resend, marks `sent` |
| Quote list | `/quotes` | History table with filters + status |
| Catalog view | `/admin/line-items` | Read-only line item browser |

---

## Data flow — one quote, end to end

1. Marcus opens `/quotes/new`, fills customer info + scope notes, submits
2. POST `/api/agent/draft` creates a `quotes` row (status = `drafting`), returns draft_id
3. Orchestrator runs the skill chain (see `04-agent-skills.md`):
   - `extract_scope` → structured scope items
   - `match_pricing` → line items + quantities (tool use against `line_items` table)
   - `flag_ambiguity` → array of clarification questions
   - `generate_proposal` → markdown copy
   - `validate_output` → pass/fail + reasons
4. All artifacts persisted to `quote_artifacts`; status updated to `draft_ready`
5. Marcus opens `/quotes/[id]`, reviews, edits any field; PATCH on save
6. On approve → status = `sending` → PDF generated → email sent via Resend → status = `sent`
7. Outcome tracked via UI: status updates to `accepted` / `rejected` / `lost` later

---

## Data model

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| email | text | |
| phone | text | nullable |
| address | text | |
| created_at | timestamptz | |

### `line_items` (the pricing catalog)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| category | text | one of: patio, pergola, fire_pit, water_feature, artificial_turf, irrigation, outdoor_kitchen, retaining_wall |
| name | text | e.g., "Travertine paver patio - premium grade" |
| description | text | for the LLM context |
| unit | text | sq_ft, linear_ft, each, zone, hour, lump_sum |
| unit_price | numeric | base price (all-in: labor + materials bundled per `docs/10-industry-research.md` Q1) |
| item_type | enum | `fixed` (default), `allowance` (known-unknown shown to customer, e.g., "lighting fixtures: $1,200 allowance"), `custom` (Marcus prices manually). Per research Q6. |
| material_cost_pct | numeric | informational |
| created_at | timestamptz | |
| active | boolean | for soft-deletes |

### `quotes`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK | |
| project_type | text | freeform |
| raw_notes | text | original Marcus input |
| status | enum | drafting, draft_ready, sending, sent, accepted, rejected, lost, validation_failed |
| total_amount | numeric | computed sum |
| needs_render | boolean | true if total > $30K |
| proposal_markdown | text | generated copy, editable |
| payment_schedule | jsonb | default `[{milestone:"deposit",pct:30},{milestone:"mobilization",pct:30},{milestone:"midpoint",pct:30},{milestone:"completion",pct:10}]` per research Q2 (revised from 50/25/25); per-quote configurable |
| roc_license_number | text | snapshot at proposal time — REQUIRED on AZ contracts per ROC statute (research Q7) |
| insurance_carrier | text | snapshot — recommended trust signal for premium positioning (research Q7) |
| pdf_url | text | Supabase Storage URL after generation |
| sent_at | timestamptz | nullable |
| outcome_at | timestamptz | nullable |
| outcome_notes | text | nullable |
| total_cost_usd | numeric | sum of LLM API costs |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `quote_line_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| quote_id | uuid FK | |
| line_item_id | uuid FK | references catalog |
| line_item_name_snapshot | text | denormalized in case catalog changes |
| quantity | numeric | |
| unit_price_snapshot | numeric | |
| line_total | numeric | computed |
| notes | text | |

### `quote_artifacts` (agent intermediate outputs)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| quote_id | uuid FK | |
| artifact_type | text | scope, ambiguities, validation_result |
| payload | jsonb | structured agent output |
| created_at | timestamptz | |

### `audit_log`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| quote_id | uuid FK | |
| skill_name | text | extract_scope, match_pricing, etc. |
| model | text | claude-sonnet-4-x or claude-haiku-4-x |
| input | jsonb | truncated if large |
| output | jsonb | truncated if large |
| input_tokens | int | |
| output_tokens | int | |
| cost_usd | numeric | |
| duration_ms | int | |
| success | boolean | |
| error | text | nullable |
| created_at | timestamptz | |

---

## External integrations

| Integration | Purpose | Auth |
|---|---|---|
| Anthropic API | Agent reasoning | API key (server-side) |
| Resend | Outbound email | API key (server-side) |
| Supabase | DB, storage, auth | Service role key (server-side); anon key (client) |

---

## Security

- All third-party API keys stored in `/opt/greenscape-quote-agent/.env` on the server; server-side only
- Client never sees Anthropic / Resend keys
- Supabase Row-Level Security (RLS) enabled on all tables (single-user app, but good practice)
- `.env.example` documents all required vars without real values
- Customer emails only collected with intent to send a proposal — no marketing use

---

## Cost considerations

| Action | Model | Est. tokens (in / out) | Est. cost |
|---|---|---|---|
| `extract_scope` | Sonnet | 3K / 1K | ~$0.018 |
| `match_pricing` | Sonnet (w/ tool use) | 5K / 2K | ~$0.045 |
| `flag_ambiguity` | Haiku | 2K / 0.5K | ~$0.001 |
| `generate_proposal` | Sonnet | 6K / 2K | ~$0.048 |
| `validate_output` | Haiku | 3K / 0.5K | ~$0.002 |
| **Per quote (no retry)** | mixed | — | **~$0.11** |
| Per quote (1 retry on validate) | mixed | — | ~$0.16 |

At 200 quotes/year, total annual cost: **~$25-35** in API spend. Trivially small relative to the value generated.

Cost guardrails:
- Per-quote budget cap: $0.50 (warns + alerts if exceeded)
- Per-call timeout: 30s
- Max 1 retry per skill on validation failure
- Cumulative cost displayed in admin

---

## Deployment

| Item | Where |
|---|---|
| Code | GitHub public repo |
| Frontend + API | Hetzner VPS — Next.js standalone build behind Caddy reverse proxy, run as systemd service |
| Database | Supabase shared instance, dedicated `greenscape` schema |
| Env vars | `/opt/greenscape-quote-agent/.env` on server + `.env.local` (dev) |
| Public URL | IP:port for the demo window (deployment is temporary — ~1 week) |
| Secrets management | Never committed; `.env.example` shows required keys |

---

## Architectural assumptions (canonical: `06-assumptions.md`)

The architecture above embeds several assumptions about Marcus's actual workflow that the source materials do not specify. Each one maps to a swappable component:

| Architectural element | Assumption made | Swap path Day 1 |
|---|---|---|
| `greenscape.line_items` schema | Structure: `(category, name, description, unit, unit_price)` | Re-seed from Marcus's Google Sheet via Drive API import |
| Pricing logic | All-in prices, 38% margin baked in, no separate tax/contingency | Schema migration only if Marcus separates labor/materials |
| Proposal HTML/CSS template | 7-section structure (cover/greeting/overview/scope+pricing/timeline/terms/signature) | Swap template file with Marcus's actual Google Doc layout (~2-3 hrs) |
| `generate_proposal` few-shot examples | Voice: premium craftsman, warm, transparent | Replace with 3-5 of Marcus's real past proposals (skill code unchanged) |
| `extract_scope` input | Freeform text (Phase 2: voice memo + Deepgram transcription) | None — designed for any input format |
| `/quotes/new` form fields | Minimal customer + intake fields | GHL webhook auto-populates from contact record |

See `06-assumptions.md` for the full registry with reasoning, defensibility, and the complete replaceability map.

## Open architectural decisions (resolved during build)

- [ ] react-pdf vs puppeteer for PDF generation — try react-pdf first, fallback to puppeteer if styling limits hit
- [ ] Auth on/off for MVP — default off (demo mode), add magic link if time permits
- [ ] Streaming agent responses to UI — nice-to-have, default off (simpler)
- [ ] Where to render the brand banner — top of PDF page 1 (skip AI banner generation unless extra time)
