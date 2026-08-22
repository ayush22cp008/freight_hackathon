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
    const { trip_id, latitude, longitude, gps_accuracy, server_timestamp, photo_url } = body;

    if (!trip_id || !latitude || !longitude || !server_timestamp || !photo_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('events')
      .insert({
        trip_id,
        driver_id: driverId,
        event_type: 'departure',
        latitude,
        longitude,
        gps_accuracy,
        server_timestamp,
        photo_url,
      })
      .select('id, server_timestamp')
      .single();

    if (error) {
      console.error('Insert error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Departure already recorded for this trip' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to record departure' }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: data });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
