-- Migration 004 — Revert payment_schedule default to 50/50 to match
-- Marcus's stated practice (onboarding line 71: "Stripe deposit invoice
-- sent (50%)"). Reverses the 30/30/30/10 default introduced in
-- migration 003 (research recommendation D26).
--
-- See docs/09-decision-log.md D31 for the reversal reasoning.
--
-- Existing quotes are unchanged; this affects only NEW quotes that
-- don't explicitly set payment_schedule.

ALTER TABLE greenscape.quotes
  ALTER COLUMN payment_schedule
  SET DEFAULT '[{"milestone":"deposit","pct":50},{"milestone":"completion","pct":50}]'::jsonb;
