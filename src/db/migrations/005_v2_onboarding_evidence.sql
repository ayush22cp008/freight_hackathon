-- Migration: Replace onboarding_evidence and companies with V2 schema
-- Run manually via Supabase SQL Editor

-- Clean up V1 tables if they exist
DROP TABLE IF EXISTS onboarding_evidence CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS reviewer_authorizations CASCADE;

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their own profile" ON companies
  FOR SELECT USING (auth_id = auth.uid());


CREATE TABLE IF NOT EXISTS reviewer_authorizations (
  auth_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now()
);

ALTER TABLE reviewer_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers can view their own authorization" ON reviewer_authorizations
  FOR SELECT USING (auth_id = auth.uid());


CREATE TABLE IF NOT EXISTS onboarding_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type text NOT NULL,
  document_type text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  version int DEFAULT 1,
  rejection_reason text,
  status text DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE onboarding_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own evidence" ON onboarding_evidence
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can view their own evidence" ON onboarding_evidence
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Reviewers can view all evidence" ON onboarding_evidence
  FOR SELECT USING (EXISTS (SELECT 1 FROM reviewer_authorizations WHERE auth_id = auth.uid()));

-- Create Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('onboarding_evidence', 'onboarding_evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own evidence" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'onboarding_evidence' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Users can view their own evidence files" ON storage.objects
  FOR SELECT USING (bucket_id = 'onboarding_evidence' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Reviewers can view all evidence files" ON storage.objects
  FOR SELECT USING (bucket_id = 'onboarding_evidence' AND EXISTS (SELECT 1 FROM public.reviewer_authorizations WHERE auth_id = auth.uid()));
