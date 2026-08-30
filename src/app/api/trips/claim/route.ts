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
    if (!identity || identity.verification_status !== 'VERIFIED' || identity.trusted_role !== 'DRIVER') {
      return NextResponse.json({ error: 'Forbidden. Must be a verified driver.' }, { status: 403 });
    }

    const { tripId } = await request.json();
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    }

    // Resolve current driver using auth_id
    const { data: driver } = await supabaseServer
      .from('drivers')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!driver) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    const driverId = driver.id;

    // Atomically assign the trip to the driver
    const { data: updatedTrip, error: updateError } = await supabaseServer
      .from('trips')
      .update({ 
        driver_id: driverId, 
        status: 'claimed' 
      })
      .eq('id', tripId)
      .eq('status', 'published')
      .is('driver_id', null)
      .select()
      .single();

    if (updateError || !updatedTrip) {
      // PGRST116 means zero rows returned from .single(), meaning the WHERE clause failed
      return NextResponse.json({ error: 'Trip is no longer available or already claimed.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, trip: updatedTrip });

  } catch (error) {
    console.error('Error claiming trip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
