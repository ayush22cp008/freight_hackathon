import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { generateSummaryForEvents } from '@/lib/summary';

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

    const { tripId } = await request.json().catch(() => ({}));

    let query = supabaseServer
      .from('trips')
      .select('id')
      .eq('driver_id', driver.id)
      .in('status', ['active', 'claimed', 'in_progress', 'completed']);
      
    if (tripId) {
      query = query.eq('id', tripId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data: trip } = await query.single();

    if (!trip) {
      return NextResponse.json({ error: 'No active trip found.' }, { status: 400 });
    }

    const { data: events } = await supabaseServer
      .from('events')
      .select('*')
      .eq('trip_id', trip.id)
      .order('server_timestamp', { ascending: true });

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No events found.' }, { status: 400 });
    }

    const eventTypes = events.map(e => e.event_type);
    
    const hasArrival = eventTypes.includes('arrival') || eventTypes.includes('ARRIVED_AT_PICKUP');
    const hasCheckin = eventTypes.includes('checkin') || eventTypes.includes('PICKUP_CHECKED_IN');
    const hasDeparture = eventTypes.includes('departure') || eventTypes.includes('PICKUP_DEPARTED') || eventTypes.includes('DELIVERY_DEPARTED');
    
    if (!hasArrival || !hasCheckin || !hasDeparture) {
      return NextResponse.json({ error: 'Evidence summary requires the completed event sequence (Arrival, Check-in, Departure).' }, { status: 400 });
    }

    // Call the shared helper
    const summary = await generateSummaryForEvents(events);

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('AI Summary Error:', err);
    const errorMsg = err.message || 'An unexpected error occurred while generating the summary.';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
