-- Greenscape Quote Agent — initial schema
-- Per docs/03-architecture.md
-- All tables live under the `greenscape` schema for clean isolation
-- from other apps on this shared Supabase project (other internal projects).

create schema if not exists greenscape;

-- ───────── enums ─────────

do $$ begin
  create type greenscape.quote_status as enum (
    'drafting',
    'draft_ready',
    'validation_failed',
    'sending',
    'sent',
    'accepted',
    'rejected',
    'lost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type greenscape.line_item_unit as enum (
    'sq_ft',
    'linear_ft',
    'each',
    'zone',
    'hour',
    'lump_sum'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type greenscape.item_category as enum (
    'patio',
    'pergola',
    'fire_pit',
    'water_feature',
    'artificial_turf',
    'irrigation',
    'outdoor_kitchen',
    'retaining_wall',
    'universal'
  );
exception when duplicate_object then null; end $$;

-- ───────── customers ─────────

create table if not exists greenscape.customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  address     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists customers_email_idx on greenscape.customers (email);

-- ───────── line_items (catalog) ─────────

create table if not exists greenscape.line_items (
  id                  uuid primary key default gen_random_uuid(),
  category            greenscape.item_category not null,
  name                text not null,
  description         text not null default '',
  unit                greenscape.line_item_unit not null,
  unit_price          numeric(12, 2) not null check (unit_price >= 0),
  material_cost_pct   numeric(4, 3) not null default 0.45 check (material_cost_pct >= 0 and material_cost_pct <= 1),
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists line_items_category_idx on greenscape.line_items (category) where active;
create index if not exists line_items_name_trgm_idx on greenscape.line_items using gin (name gin_trgm_ops);
create index if not exists line_items_desc_trgm_idx on greenscape.line_items using gin (description gin_trgm_ops);

-- ───────── quotes ─────────

create table if not exists greenscape.quotes (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references greenscape.customers(id) on delete restrict,
  project_type        text not null default '',
  raw_notes           text not null default '',
  status              greenscape.quote_status not null default 'drafting',
  total_amount        numeric(12, 2) not null default 0,
  needs_render        boolean not null default false,
  proposal_markdown   text not null default '',
  pdf_url             text,
  sent_at             timestamptz,
  outcome_at          timestamptz,
  outcome_notes       text,
  total_cost_usd      numeric(8, 4) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists quotes_customer_idx on greenscape.quotes (customer_id);
create index if not exists quotes_status_idx on greenscape.quotes (status);
create index if not exists quotes_created_idx on greenscape.quotes (created_at desc);

-- ───────── quote_line_items ─────────

create table if not exists greenscape.quote_line_items (
  id                          uuid primary key default gen_random_uuid(),
  quote_id                    uuid not null references greenscape.quotes(id) on delete cascade,
  line_item_id                uuid references greenscape.line_items(id) on delete set null,
  line_item_name_snapshot     text not null,
  category                    greenscape.item_category not null,
  unit                        greenscape.line_item_unit not null,
  quantity                    numeric(12, 3) not null check (quantity > 0),
  unit_price_snapshot         numeric(12, 2) not null check (unit_price_snapshot >= 0),
  line_total                  numeric(12, 2) not null check (line_total >= 0),
  notes                       text not null default '',
  created_at                  timestamptz not null default now()
);

create index if not exists quote_line_items_quote_idx on greenscape.quote_line_items (quote_id);

-- ───────── quote_artifacts (intermediate agent outputs) ─────────

create table if not exists greenscape.quote_artifacts (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references greenscape.quotes(id) on delete cascade,
  artifact_type   text not null check (artifact_type in ('scope', 'ambiguities', 'validation_result', 'priced_items')),
  payload         jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists quote_artifacts_quote_idx on greenscape.quote_artifacts (quote_id, artifact_type);

-- ───────── audit_log ─────────

create table if not exists greenscape.audit_log (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid references greenscape.quotes(id) on delete cascade,
  skill_name      text not null,
  model           text not null,
  input           jsonb,
  output          jsonb,
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  cost_usd        numeric(8, 6) not null default 0,
  duration_ms     integer not null default 0,
  success         boolean not null default true,
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists audit_log_quote_idx on greenscape.audit_log (quote_id, created_at);
create index if not exists audit_log_skill_idx on greenscape.audit_log (skill_name);

-- ───────── trigram extension for fuzzy match (lookup_line_items tool) ─────────

create extension if not exists pg_trgm;

-- ───────── updated_at trigger for quotes ─────────

create or replace function greenscape.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists quotes_updated_at on greenscape.quotes;
create trigger quotes_updated_at
  before update on greenscape.quotes
  for each row execute function greenscape.set_updated_at();

-- ───────── needs_render: auto-set when total_amount > 30000 ─────────

create or replace function greenscape.set_needs_render() returns trigger
language plpgsql as $$
begin
  new.needs_render = (new.total_amount > 30000);
  return new;
end $$;

drop trigger if exists quotes_needs_render on greenscape.quotes;
create trigger quotes_needs_render
  before insert or update of total_amount on greenscape.quotes
  for each row execute function greenscape.set_needs_render();

-- ───────── RLS ─────────
-- Single-tenant app for this MVP: service-role-only writes/reads from the server.
-- Anon role gets no access; the Next.js API routes run with the service-role key.

alter table greenscape.customers          enable row level security;
alter table greenscape.line_items         enable row level security;
alter table greenscape.quotes             enable row level security;
alter table greenscape.quote_line_items   enable row level security;
alter table greenscape.quote_artifacts    enable row level security;
alter table greenscape.audit_log          enable row level security;

-- Service role bypasses RLS automatically; we still add an explicit deny-all for anon
-- so a leaked anon key can't read customer data.
do $$
declare t text;
begin
  foreach t in array array[
    'customers','line_items','quotes','quote_line_items','quote_artifacts','audit_log'
  ] loop
    execute format(
      'drop policy if exists %1$I_anon_deny on greenscape.%2$I',
      t||'_anon_deny', t
    );
    execute format(
      'create policy %1$I on greenscape.%2$I for all to anon using (false) with check (false)',
      t||'_anon_deny', t
    );
  end loop;
end $$;

-- Grant the api roles access to the schema (Postgres-level grants; RLS still applies).
grant usage on schema greenscape to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema greenscape to service_role;
grant select on all tables in schema greenscape to authenticated;
alter default privileges in schema greenscape grant select, insert, update, delete on tables to service_role;
