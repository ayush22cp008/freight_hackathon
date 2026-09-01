-- Migration: Node 5 Atomic Completion RPC
-- Description: Provides an atomic row-locked mechanism for the final dual confirmation step.

CREATE OR REPLACE FUNCTION confirm_delivery(p_trip_id UUID, p_role TEXT)
RETURNS JSONB AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  -- Lock the row for update to prevent concurrent race conditions
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
  
  IF v_trip.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip already completed');
  END IF;

  IF p_role = 'DRIVER' THEN
    v_trip.driver_completion_confirmed_at = now();
  ELSIF p_role = 'COMPANY' THEN
    v_trip.receiver_delivery_confirmed_at = now();
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  -- Atomic check for dual confirmation
  IF v_trip.driver_completion_confirmed_at IS NOT NULL AND v_trip.receiver_delivery_confirmed_at IS NOT NULL THEN
    v_trip.status = 'completed';
  END IF;

  -- Apply update atomically
  UPDATE trips 
  SET 
    driver_completion_confirmed_at = v_trip.driver_completion_confirmed_at,
    receiver_delivery_confirmed_at = v_trip.receiver_delivery_confirmed_at,
    status = v_trip.status,
    updated_at = now()
  WHERE id = p_trip_id;

  RETURN jsonb_build_object(
    'success', true, 
    'status', v_trip.status, 
    'driver_confirmed', (v_trip.driver_completion_confirmed_at IS NOT NULL),
    'receiver_confirmed', (v_trip.receiver_delivery_confirmed_at IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql;
