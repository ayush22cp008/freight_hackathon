-- Migration: Add reviewed_at to freight_identities
-- Run manually via Supabase SQL Editor

ALTER TABLE freight_identities 
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
