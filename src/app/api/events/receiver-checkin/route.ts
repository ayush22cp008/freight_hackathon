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
      return NextResponse.json({ error: 'Forbidden. Receiving company identity required.' }, { status: 403 });
    }

    const { data: company } = await supabaseServer
      .from('companies')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company profile not found' }, { status: 401 });
    }

    const body = await request.json();
    const { trip_id, latitude, longitude, gps_accuracy, server_timestamp, photo_url } = body;

    if (!trip_id || !latitude || !longitude || !server_timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve trip securely from the server
    const { data: trip } = await supabaseServer
      .from('trips')
      .select('id, receiving_company_id, driver_id, status')
      .eq('id', trip_id)
      .in('status', ['active', 'claimed', 'in_progress'])
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found or not in active state' }, { status: 404 });
    }

    // Authorize receiving company
    if (trip.receiving_company_id !== company.id) {
      return NextResponse.json({ error: 'You are not the authorized receiving company for this trip' }, { status: 403 });
    }

    // Verify required preceding milestone (ARRIVED_AT_DELIVERY)
    const { data: arrivalEvent } = await supabaseServer
      .from('events')
      .select('id')
      .eq('trip_id', trip_id)
      .eq('event_type', 'ARRIVED_AT_DELIVERY')
      .limit(1)
      .maybeSingle();

    if (!arrivalEvent) {
      return NextResponse.json({ error: 'Cannot record receiver check-in before delivery arrival' }, { status: 400 });
    }

    // Note: driver_id represents the trip's driver, so the event correctly associates 
    // with the driver's timeline. The action is performed by the company.
    const { data, error } = await supabaseServer
      .from('events')
      .insert({
        trip_id,
        driver_id: trip.driver_id,
        event_type: 'RECEIVER_CHECKED_IN',
        latitude,
        longitude,
        gps_accuracy,
        server_timestamp,
        photo_url: photo_url || null,
      })
      .select('id, server_timestamp')
      .single();

    if (error) {
      console.error('Insert error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Receiver check-in already recorded for this trip' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to record receiver check-in' }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
