import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identity = await getFreightIdentity();
  if (!identity || identity.trusted_role !== 'COMPANY' || identity.verification_status !== 'VERIFIED') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Derive creator company_id
  const { data: creatorCompany, error: creatorError } = await supabaseServer
    .from('companies')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (creatorError || !creatorCompany) {
    return NextResponse.json({ error: 'Company profile not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { facility_name, destination_name, receiving_company_id, distance, duration, payout } = body;

    if (!facility_name || !destination_name || !receiving_company_id || distance == null || !duration || payout == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate receiving company exists
    const { data: receiverCompany } = await supabaseServer
      .from('companies')
      .select('id')
      .eq('id', receiving_company_id)
      .single();

    if (!receiverCompany) {
      return NextResponse.json({ error: 'Invalid receiving company' }, { status: 400 });
    }

    const { data: newTrip, error: insertError } = await supabaseServer
      .from('trips')
      .insert({
        company_id: creatorCompany.id,
        receiving_company_id,
        facility_name,
        destination_name,
        distance,
        duration,
        payout,
        status: 'draft',
        driver_id: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating trip:', insertError);
      return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
    }

    return NextResponse.json({ trip: newTrip });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
