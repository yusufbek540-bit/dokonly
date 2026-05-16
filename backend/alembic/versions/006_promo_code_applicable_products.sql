-- Migration 006: Add applicable_product_ids to promo_codes
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS applicable_product_ids JSONB;
