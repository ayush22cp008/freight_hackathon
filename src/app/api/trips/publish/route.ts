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

  // Derive acting company_id
  const { data: actingCompany, error: actingError } = await supabaseServer
    .from('companies')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (actingError || !actingCompany) {
    return NextResponse.json({ error: 'Company profile not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { trip_id } = body;

    if (!trip_id) {
      return NextResponse.json({ error: 'Missing trip_id' }, { status: 400 });
    }

    // Load trip server-side to verify ownership and state
    const { data: existingTrip, error: fetchError } = await supabaseServer
      .from('trips')
      .select('*')
      .eq('id', trip_id)
      .single();

    if (fetchError || !existingTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (existingTrip.company_id !== actingCompany.id) {
      return NextResponse.json({ error: 'Unauthorized to publish this trip' }, { status: 403 });
    }

    if (existingTrip.status !== 'draft') {
      return NextResponse.json({ error: 'Trip is not in a publishable state' }, { status: 400 });
    }

    // Publish trip
    const { data: updatedTrip, error: updateError } = await supabaseServer
      .from('trips')
      .update({ status: 'published' })
      .eq('id', trip_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error publishing trip:', updateError);
      return NextResponse.json({ error: 'Failed to publish trip' }, { status: 500 });
    }

    return NextResponse.json({ trip: updatedTrip });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
