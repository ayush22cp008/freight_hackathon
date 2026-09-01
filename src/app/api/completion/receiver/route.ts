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
      return NextResponse.json({ error: 'Unauthorized COMPANY role required' }, { status: 403 });
    }

    const { data: company } = await supabaseServer
      .from('companies')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company profile not found' }, { status: 403 });
    }

    const companyId = company.id;

    const body = await request.json();
    const { trip_id } = body;

    if (!trip_id) {
      return NextResponse.json({ error: 'Missing trip_id' }, { status: 400 });
    }

    // Resolve active trip securely from the server
    const { data: activeTrip } = await supabaseServer
      .from('trips')
      .select('id')
      .eq('id', trip_id)
      .eq('receiving_company_id', companyId)
      .in('status', ['active', 'claimed', 'in_progress'])
      .single();

    if (!activeTrip) {
      return NextResponse.json({ error: 'Not authorized for this trip or trip is not active' }, { status: 403 });
    }

    // Verify required preceding milestone (DELIVERY_DEPARTED)
    const { data: departedEvent } = await supabaseServer
      .from('events')
      .select('id')
      .eq('trip_id', trip_id)
      .eq('event_type', 'DELIVERY_DEPARTED')
      .limit(1)
      .maybeSingle();

    if (!departedEvent) {
      return NextResponse.json({ error: 'Cannot confirm receipt before delivery departed is recorded' }, { status: 400 });
    }

    // Call the atomic RPC
    const { data, error } = await supabaseServer.rpc('confirm_delivery', {
      p_trip_id: trip_id,
      p_role: 'COMPANY'
    });

    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json({ error: 'Failed to confirm receipt' }, { status: 500 });
    }

    if (data && data.success === false) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, state: data });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
