-- Migration 005 — convert line_item_category enum → text so Marcus can add
-- new categories at runtime via POST /api/line-items. Existing data values
-- are preserved (they were already strings inside the enum).
--
-- The agent's match_pricing skill now reads the live distinct-category list
-- from the DB at run time, so any category added here is automatically
-- known to the agent on the next quote.
--
-- See decision log D39.

ALTER TABLE greenscape.line_items
  ALTER COLUMN category TYPE text USING category::text;

ALTER TABLE greenscape.line_items
  ADD CONSTRAINT line_items_category_nonempty CHECK (length(trim(category)) >= 2);

DROP TYPE IF EXISTS greenscape.line_item_category;
