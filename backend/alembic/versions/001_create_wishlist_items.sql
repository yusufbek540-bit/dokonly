-- Migration: wishlist_items table + products.compare_at_price column
-- Run this in the Supabase SQL editor

-- Add compare_at_price to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(14, 2);

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_telegram_id BIGINT NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_wishlist UNIQUE (tenant_id, customer_telegram_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist_items(tenant_id, customer_telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlist_items(product_id);
