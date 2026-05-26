-- Migration 009: Persist seller CRM notes and tags on customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS crm JSONB NOT NULL DEFAULT '{"tags": [], "notes": []}'::jsonb;
