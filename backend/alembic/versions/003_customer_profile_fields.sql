-- Migration: Add profile fields to customers table
-- Run this in the Supabase SQL editor

ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS saved_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;
