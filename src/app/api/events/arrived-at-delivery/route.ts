import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: driver } = await supabaseServer
      .from('drivers')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 401 });
    }

    const driverId = driver.id;

    const body = await request.json();
    const { latitude, longitude, gps_accuracy, server_timestamp, photo_url } = body;

    if (!latitude || !longitude || !server_timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve active trip securely from the server
    const { data: activeTrip } = await supabaseServer
      .from('trips')
      .select('id')
      .eq('driver_id', driverId)
      .in('status', ['active', 'claimed', 'in_progress'])
      .limit(1)
      .single();

    if (!activeTrip) {
      return NextResponse.json({ error: 'No active trip found for driver' }, { status: 403 });
    }

    const trip_id = activeTrip.id;

    // Verify required preceding milestone (IN_TRANSIT)
    const { data: inTransitEvent } = await supabaseServer
      .from('events')
      .select('id')
      .eq('trip_id', trip_id)
      .eq('event_type', 'IN_TRANSIT')
      .limit(1)
      .maybeSingle();

    if (!inTransitEvent) {
      return NextResponse.json({ error: 'Cannot record arrival at delivery before transit is recorded' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('events')
      .insert({
        trip_id,
        driver_id: driverId,
        event_type: 'ARRIVED_AT_DELIVERY',
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
        return NextResponse.json({ error: 'Arrival at delivery already recorded for this trip' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to record arrival at delivery' }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
