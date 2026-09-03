-- Migration: Create trip_public_shares table for Phase 1a Public Evidence Sharing
-- Run manually via Supabase SQL Editor

CREATE TYPE public_share_status AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE IF NOT EXISTS trip_public_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status public_share_status NOT NULL DEFAULT 'ACTIVE',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

-- Partial unique index enforcing exactly one ACTIVE share per trip
CREATE UNIQUE INDEX unique_active_share ON trip_public_shares(trip_id) WHERE status = 'ACTIVE';

-- Enable Row Level Security (defense in depth, though accessed via service_role for public endpoints)
ALTER TABLE trip_public_shares ENABLE ROW LEVEL SECURITY;

-- Allow companies to view their own shares
CREATE POLICY "Companies can view shares for their trips" ON trip_public_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_public_shares.trip_id 
      AND trips.receiving_company_id = (SELECT id FROM companies WHERE auth_id = auth.uid())
    )
  );
