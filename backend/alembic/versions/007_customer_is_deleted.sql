-- Migration 007: Add is_deleted flag to customers for GDPR profile deletion
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
