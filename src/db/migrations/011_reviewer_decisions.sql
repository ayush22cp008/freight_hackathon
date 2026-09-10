-- Migration: Create reviewer_decisions table for persistent history
-- Run manually via Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reviewer_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid REFERENCES freight_identities(id) ON DELETE CASCADE,
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES onboarding_evidence(id) ON DELETE SET NULL,
  decision text NOT NULL, -- 'VERIFIED' or 'REJECTED'
  rejection_reason text,
  reviewed_at timestamptz DEFAULT now()
);

ALTER TABLE reviewer_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers can view all history" ON reviewer_decisions
  FOR SELECT USING (EXISTS (SELECT 1 FROM reviewer_authorizations WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view their own history" ON reviewer_decisions
  FOR SELECT USING (auth_id = auth.uid());
