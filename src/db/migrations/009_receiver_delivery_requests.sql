-- Create receiver_request_state enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receiver_request_state') THEN
        CREATE TYPE receiver_request_state AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
    END IF;
END $$;

-- Create receiver_delivery_requests table
CREATE TABLE IF NOT EXISTS receiver_delivery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    sender_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    receiving_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    state receiver_request_state NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES companies(id) ON DELETE SET NULL
);

-- Partial unique index to enforce at most one PENDING request per Trip
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_request_per_trip 
ON receiver_delivery_requests (trip_id) 
WHERE state = 'PENDING';

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_receiver_req_trip_id ON receiver_delivery_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_receiver_req_receiving_company ON receiver_delivery_requests(receiving_company_id);
CREATE INDEX IF NOT EXISTS idx_receiver_req_sender_company ON receiver_delivery_requests(sender_company_id);

-- Enable RLS (Service role only access)
ALTER TABLE receiver_delivery_requests ENABLE ROW LEVEL SECURITY;

-- No client-side policies created; all reads/writes happen through supabaseServer (service_role)

-- Safe Migration/Backfill for Legacy Trips
-- Any Trip that is NOT in 'draft' status must have an ACCEPTED request to remain claimable/operational
INSERT INTO receiver_delivery_requests (
    trip_id, 
    sender_company_id, 
    receiving_company_id, 
    state, 
    created_at, 
    decided_at
)
SELECT 
    t.id, 
    t.company_id, 
    t.receiving_company_id, 
    'ACCEPTED'::receiver_request_state, 
    t.created_at, 
    t.created_at
FROM trips t
WHERE t.status != 'draft'
AND NOT EXISTS (
    SELECT 1 FROM receiver_delivery_requests rdr WHERE rdr.trip_id = t.id
);
