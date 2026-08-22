-- Migration: Add auth_id to drivers table
-- Run manually via Supabase SQL Editor

ALTER TABLE drivers ADD COLUMN auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
