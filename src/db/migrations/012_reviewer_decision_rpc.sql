-- Migration: 012_reviewer_decision_rpc.sql
-- Purpose: Atomic RPC function for Reviewer Final Decisions (Approve/Reject)

CREATE OR REPLACE FUNCTION process_reviewer_decision(
  p_identity_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_identity RECORD;
  v_evidence_id UUID;
  v_decision_time TIMESTAMPTZ := now();
  v_driver_code TEXT;
  v_name TEXT;
BEGIN
  -- 1. Validate Target Identity
  SELECT * INTO v_identity FROM freight_identities WHERE id = p_identity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Identity not found';
  END IF;

  IF v_identity.verification_status != 'PENDING' THEN
    RAISE EXCEPTION 'Identity is not pending';
  END IF;

  IF p_action NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  -- 2. Identify the current PENDING evidence row
  SELECT id INTO v_evidence_id
  FROM onboarding_evidence
  WHERE auth_id = v_identity.auth_id AND status = 'PENDING'
  ORDER BY created_at DESC
  LIMIT 1;
  
  v_name := COALESCE(NULLIF(SPLIT_PART(v_identity.email, '@', 1), ''), 'Unknown');

  -- 3. Execute logic based on action
  IF p_action = 'REJECT' THEN
    IF v_evidence_id IS NOT NULL THEN
      UPDATE onboarding_evidence 
      SET status = 'REJECTED', rejection_reason = p_rejection_reason
      WHERE id = v_evidence_id;
    END IF;

    UPDATE freight_identities 
    SET verification_status = 'REJECTED', reviewed_at = v_decision_time
    WHERE id = p_identity_id;

    INSERT INTO reviewer_decisions (identity_id, auth_id, evidence_id, decision, rejection_reason, reviewed_at)
    VALUES (p_identity_id, v_identity.auth_id, v_evidence_id, 'REJECTED', p_rejection_reason, v_decision_time);

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');

  ELSIF p_action = 'APPROVE' THEN
    IF v_evidence_id IS NOT NULL THEN
      UPDATE onboarding_evidence 
      SET status = 'APPROVED'
      WHERE id = v_evidence_id;
    END IF;

    UPDATE freight_identities 
    SET verification_status = 'VERIFIED', trusted_role = v_identity.requested_role, reviewed_at = v_decision_time
    WHERE id = p_identity_id;

    INSERT INTO reviewer_decisions (identity_id, auth_id, evidence_id, decision, reviewed_at)
    VALUES (p_identity_id, v_identity.auth_id, v_evidence_id, 'VERIFIED', v_decision_time);

    -- Create Business Record
    IF v_identity.requested_role = 'DRIVER' THEN
      v_driver_code := 'DRV-' || UPPER(SUBSTRING(p_identity_id::TEXT, 1, 6));
      
      INSERT INTO drivers (auth_id, driver_code, name)
      VALUES (v_identity.auth_id, v_driver_code, v_name);
      
    ELSIF v_identity.requested_role = 'COMPANY' THEN
      INSERT INTO companies (auth_id, name)
      VALUES (v_identity.auth_id, v_name);
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'VERIFIED');
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
