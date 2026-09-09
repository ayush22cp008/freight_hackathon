import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identity = await getFreightIdentity();
    if (!identity || identity.trusted_role !== 'COMPANY' || identity.verification_status !== 'VERIFIED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Derive company_id
    const { data: company, error: companyError } = await supabaseServer
      .from('companies')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company profile not found' }, { status: 404 });
    }

    const { requestId } = await request.json();
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    // Atomically accept the request
    const { data: updatedRequest, error: updateError } = await supabaseServer
      .from('receiver_delivery_requests')
      .update({ 
        state: 'ACCEPTED',
        decided_at: new Date().toISOString(),
        decided_by: company.id
      })
      .eq('id', requestId)
      .eq('state', 'PENDING')
      .eq('receiving_company_id', company.id)
      .select()
      .single();

    if (updateError || !updatedRequest) {
      return NextResponse.json({ error: 'Request is no longer pending, already decided, or unauthorized.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error('Error accepting request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
