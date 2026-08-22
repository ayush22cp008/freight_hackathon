CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  event_type text NOT NULL CHECK (event_type IN ('arrival', 'checkin', 'departure')),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  gps_accuracy numeric,
  server_timestamp timestamptz NOT NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, event_type)
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
REVOKE UPDATE, DELETE ON events FROM PUBLIC, anon, authenticated, service_role;
