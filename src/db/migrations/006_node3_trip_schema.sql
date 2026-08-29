-- Migration: Node 3 Trip Schema
-- Run manually via Supabase SQL Editor

-- 1. Make driver_id nullable so trips can be created before assignment
ALTER TABLE trips ALTER COLUMN driver_id DROP NOT NULL;

-- 2. Add creator and receiving company relationships
ALTER TABLE trips 
ADD COLUMN company_id uuid REFERENCES companies(id),
ADD COLUMN receiving_company_id uuid REFERENCES companies(id);

-- 3. Add required Node 3 fields
ALTER TABLE trips 
ADD COLUMN destination_name text,
ADD COLUMN distance numeric,
ADD COLUMN duration text,
ADD COLUMN payout numeric;

-- 4. Update status constraints to support Node 3 lifecycle while preserving historical 'active' status
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check 
CHECK (status IN ('active', 'draft', 'published', 'claimed', 'in_progress', 'completed'));
