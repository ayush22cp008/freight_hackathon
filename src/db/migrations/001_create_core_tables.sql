-- Migration: Create core tables for Freight MVP (drivers, trips)
-- Run manually via Supabase SQL Editor, then commit this file to repo.

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  driver_code text unique not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references drivers(id) not null,
  facility_name text not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- Enable RLS (defense-in-depth, per Node 2.5 decision - no client-side write policies needed,
-- all writes go through service-role server routes only)
alter table drivers enable row level security;
alter table trips enable row level security;
