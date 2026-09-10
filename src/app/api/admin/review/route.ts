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

    // 2. Call the atomic RPC to process the decision
    const { data: result, error: rpcError } = await supabaseServer.rpc('process_reviewer_decision', {
      p_identity_id: identity_id,
      p_action: action,
      p_rejection_reason: rejection_reason || null
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      // Determine if it's a known error from the RPC
      if (rpcError.message === 'Identity not found') {
        return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
      }
      if (rpcError.message === 'Identity is not pending') {
        return NextResponse.json({ error: 'Identity is not pending' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Decision processing failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: result.status });

  } catch (err) {
    console.error('Admin review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

