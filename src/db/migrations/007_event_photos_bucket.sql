-- Migration: Create event-photos storage bucket
-- Run manually via Supabase SQL Editor

-- Create Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;
