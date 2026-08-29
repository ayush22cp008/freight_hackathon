-- Migration: Create freight_identities table and Auth trigger
-- Run manually via Supabase SQL Editor

CREATE TABLE IF NOT EXISTS freight_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL DEFAULT 'DRIVER',
  verification_status text NOT NULL DEFAULT 'PENDING',
  trusted_role text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE freight_identities ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own identity
CREATE POLICY "Users can view their own identity" ON freight_identities
  FOR SELECT USING (auth_id = auth.uid());

-- Trigger function to automatically create identity on signup
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.freight_identities (auth_id, email, requested_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'requested_role', 'DRIVER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER trigger_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();
