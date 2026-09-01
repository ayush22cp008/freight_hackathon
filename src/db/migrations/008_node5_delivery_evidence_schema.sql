-- Migration: Node 5 Delivery Evidence Schema
-- Run manually via Supabase SQL Editor

-- 1. Expand the events.event_type CHECK constraint to support the canonical Node 5 vocabulary
-- while preserving legacy values.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE events ADD CONSTRAINT events_event_type_check 
CHECK (event_type IN (
  'arrival', 
  'checkin', 
  'departure',
  'ARRIVED_AT_PICKUP',
  'PICKUP_CHECKED_IN',
  'GOODS_LOADED',
  'PICKUP_DEPARTED',
  'IN_TRANSIT',
  'ARRIVED_AT_DELIVERY',
  'RECEIVER_CHECKED_IN',
  'GOODS_UNLOADED',
  'DELIVERY_DEPARTED'
));

-- 2. Add nullable completion timestamp fields to the trips table for atomic final confirmations
ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_completion_confirmed_at timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS receiver_delivery_confirmed_at timestamptz;
