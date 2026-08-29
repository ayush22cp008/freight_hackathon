import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Verify caller is a reviewer
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: reviewerCheck } = await supabaseServer
      .from('reviewer_authorizations')
      .select('auth_id')
      .eq('auth_id', user.id)
      .single();
    
    if (!reviewerCheck) {
      return NextResponse.json({ error: 'Forbidden. Reviewer access required.' }, { status: 403 });
    }

    const { identity_id, action, rejection_reason } = await request.json();

    if (!identity_id || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // 2. Fetch identity
    const { data: identity, error: idError } = await supabaseServer
      .from('freight_identities')
      .select('*')
      .eq('id', identity_id)
      .single();

    if (idError || !identity) {
      return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
    }

    if (identity.verification_status !== 'PENDING') {
      return NextResponse.json({ error: 'Identity is not pending' }, { status: 400 });
    }

    if (action === 'REJECT') {
      await supabaseServer
        .from('onboarding_evidence')
        .update({ status: 'REJECTED', rejection_reason })
        .eq('auth_id', identity.auth_id);

      const { error: rejectError } = await supabaseServer
        .from('freight_identities')
        .update({ verification_status: 'REJECTED' })
        .eq('id', identity.id);

      if (rejectError) {
        return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
      }
      return NextResponse.json({ success: true, status: 'REJECTED' });
    }

    // 3. Action is APPROVE
    // Update evidence
    await supabaseServer
      .from('onboarding_evidence')
      .update({ status: 'APPROVED' })
      .eq('auth_id', identity.auth_id);

    // Update freight_identities
    const { error: approveError } = await supabaseServer
      .from('freight_identities')
      .update({
        verification_status: 'VERIFIED',
        trusted_role: identity.requested_role
      })
      .eq('id', identity.id);

    if (approveError) {
      return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
    }

    // 4. Create business record
    if (identity.requested_role === 'DRIVER') {
      // Create driver
      // For MVP, auto-generate a driver code
      const driverCode = `DRV-${identity.id.substring(0, 6).toUpperCase()}`;
      await supabaseServer.from('drivers').insert({
        auth_id: identity.auth_id,
        driver_code: driverCode,
        name: identity.email?.split('@')[0] || 'Unknown Driver',
      });
    } else if (identity.requested_role === 'COMPANY') {
      // Create company
      await supabaseServer.from('companies').insert({
        auth_id: identity.auth_id,
        name: identity.email?.split('@')[0] || 'Unknown Company',
      });
    }

    return NextResponse.json({ success: true, status: 'VERIFIED' });

  } catch (err) {
    console.error('Admin review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

