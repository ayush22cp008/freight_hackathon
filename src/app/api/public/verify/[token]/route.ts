import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { hashToken, checkAnonymousRateLimit } from '@/lib/public-share';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    
    // 1. Anonymous rate limiting
    const headersList = await headers();
    // Default to 'anonymous' if IP can't be resolved, in real deployment use x-forwarded-for
    const ip = headersList.get('x-forwarded-for') || 'anonymous';
    if (!checkAnonymousRateLimit(ip, token)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. Hash token
    const tokenHash = hashToken(token);

    // 3. Lookup ACTIVE share
    const { data: share, error: shareErr } = await supabaseServer
      .from('trip_public_shares')
      .select('trip_id')
      .eq('token_hash', tokenHash)
      .eq('status', 'ACTIVE')
      .single();

    // 404 for invalid, revoked, malformed, nonexistent
    if (shareErr || !share) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 4. Resolve data (Company, Trip, Evidence/Timeline)
    const tripId = share.trip_id;

    // Fetch trip and company
    const { data: tripData, error: tripErr } = await supabaseServer
      .from('trips')
      .select(`
        status,
        pickup_city,
        destination_city,
        receiving_company_id
      `)
      .eq('id', tripId)
      .single();

    if (tripErr || !tripData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: companyData } = await supabaseServer
      .from('companies')
      .select('name')
      .eq('id', tripData.receiving_company_id)
      .single();

    // Fetch chronological timeline events
    const { data: events, error: eventsErr } = await supabaseServer
      .from('events')
      .select('event_type, location_name, timestamp')
      .eq('trip_id', tripId)
      .in('event_type', ['DELIVERY_ARRIVED', 'DELIVERY_CHECKIN', 'DELIVERY_DEPARTED'])
      .order('timestamp', { ascending: true });

    // Check evidence completeness (Arrival, Checkin, Departure all present)
    const hasArrival = events?.some(e => e.event_type === 'DELIVERY_ARRIVED');
    const hasCheckin = events?.some(e => e.event_type === 'DELIVERY_CHECKIN');
    const hasDeparture = events?.some(e => e.event_type === 'DELIVERY_DEPARTED');
    
    const evidenceState = (hasArrival && hasCheckin && hasDeparture) ? 'COMPLETE' : 'INCOMPLETE';
    const departureEvent = events?.find(e => e.event_type === 'DELIVERY_DEPARTED');
    const deliveryDate = departureEvent?.timestamp || null;

    // Optional AI summary (we can mock or leave as UNAVAILABLE if no AI configured for Phase 1a yet,
    // or fetch from an existing table. In this hackathon, we fetch from a 'trip_summaries' if it exists,
    // otherwise fallback).
    const { data: summaryData } = await supabaseServer
      .from('trip_summaries')
      .select('summary')
      .eq('trip_id', tripId)
      .single();

    const aiSummary = summaryData ? summaryData.summary : "AI summary unavailable.";

    // 5. Produce strict public projection
    const publicProjection = {
      company: {
        name: companyData?.name || 'Unknown Company',
      },
      trip: {
        status: tripData.status,
        deliveryDate: deliveryDate,
        pickupCity: tripData.pickup_city || 'Not specified',
        destinationCity: tripData.destination_city || 'Not specified'
      },
      evidence: {
        state: evidenceState,
        checklist: {
          arrivalRecorded: !!hasArrival,
          checkinRecorded: !!hasCheckin,
          departureRecorded: !!hasDeparture
        }
      },
      timeline: (events || []).map(e => ({
        type: e.event_type,
        timestamp: e.timestamp,
        location: e.location_name || 'Location recorded'
      })),
      aiSummary: aiSummary,
      isPublicVerification: true
    };

    // Return projection with no-cache headers
    return NextResponse.json(publicProjection, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (err) {
    console.error('Public verification error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
