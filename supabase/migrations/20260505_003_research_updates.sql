-- Research-driven schema updates per docs/10-industry-research.md + decision-log D26-D30:
-- 1. line_items.item_type — fixed | allowance | custom (research Q6)
-- 2. quotes.payment_schedule — 30/30/30/10 default (research Q2; supersedes 50/25/25)
-- 3. quotes.roc_license_number — required on AZ contracts (research Q7)
-- 4. quotes.insurance_carrier — trust signal for premium positioning

do $$ begin
  create type greenscape.item_type as enum ('fixed', 'allowance', 'custom');
exception when duplicate_object then null; end $$;

alter table greenscape.line_items
  add column if not exists item_type greenscape.item_type not null default 'fixed';

create index if not exists line_items_item_type_idx on greenscape.line_items (item_type) where active;

alter table greenscape.quotes
  add column if not exists payment_schedule jsonb not null default
    '[{"milestone":"deposit","pct":30},{"milestone":"mobilization","pct":30},{"milestone":"midpoint","pct":30},{"milestone":"completion","pct":10}]'::jsonb,
  add column if not exists roc_license_number text,
  add column if not exists insurance_carrier text;
