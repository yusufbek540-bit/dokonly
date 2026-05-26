-- Migration 004: Add seller_note column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_note TEXT;
