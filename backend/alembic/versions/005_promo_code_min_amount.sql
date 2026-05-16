-- Migration 005: Add min_order_amount to promo_codes
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(15, 2);
