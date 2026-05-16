-- Migration 008: Add customer_email to orders for receipt/confirmation delivery
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(200);
