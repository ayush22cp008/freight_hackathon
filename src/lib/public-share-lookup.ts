import { supabaseServer } from '@/lib/supabase-server';
import { hashToken } from '@/lib/public-share';
import { generateSummaryForEvents } from '@/lib/summary';

export async function getPublicVerificationData(token: string) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  // 1. Hash token
  const tokenHash = hashToken(token);

  // 2. Lookup ACTIVE share
  const { data: share, error: shareErr } = await supabaseServer
    .from('trip_public_shares')
    .select('trip_id')
    .eq('token_hash', tokenHash)
    .eq('status', 'ACTIVE')
    .single();

  // 404 for invalid, revoked, malformed, nonexistent
  if (shareErr || !share) {
    return null;
  }

  // 3. Resolve data (Company, Trip, Evidence/Timeline)
  const tripId = share.trip_id;

  // Fetch trip and company
  const { data: tripData, error: tripErr } = await supabaseServer
    .from('trips')
    .select(`
      status,
      facility_name,
      destination_name,
      receiving_company_id
    `)
    .eq('id', tripId)
    .single();

  if (tripErr) {
    console.error("Database error querying trips:", tripErr);
    return null;
  }
  
  if (!tripData) {
    return null;
  }

  const { data: companyData } = await supabaseServer
    .from('companies')
    .select('name')
    .eq('id', tripData.receiving_company_id)
    .single();

  // Fetch chronological timeline events
  const { data: events, error: eventsErr } = await supabaseServer
    .from('events')
    .select('*')
    .eq('trip_id', tripId)
    .order('timestamp', { ascending: true });

  // Filter key events for the timeline display
  const keyEvents = (events || []).filter(e => 
    ['DELIVERY_ARRIVED', 'DELIVERY_CHECKIN', 'DELIVERY_DEPARTED'].includes(e.event_type)
  );

  // Check evidence completeness (Arrival, Checkin, Departure all present)
  const hasArrival = keyEvents.some(e => e.event_type === 'DELIVERY_ARRIVED');
  const hasCheckin = keyEvents.some(e => e.event_type === 'DELIVERY_CHECKIN');
  const hasDeparture = keyEvents.some(e => e.event_type === 'DELIVERY_DEPARTED');
  
  const evidenceState = (hasArrival && hasCheckin && hasDeparture) ? 'COMPLETE' : 'INCOMPLETE';
  const departureEvent = keyEvents.find(e => e.event_type === 'DELIVERY_DEPARTED');
  const deliveryDate = departureEvent?.timestamp || null;

  // Authoritative AI summary generation
  let aiSummary = "AI summary unavailable.";
  try {
    if (evidenceState === 'COMPLETE' && events && events.length > 0) {
      aiSummary = await generateSummaryForEvents(events);
    }
  } catch (e) {
    console.error('AI summary generation failed (fallback to unavailable):', e);
    // Fallback gracefully without breaking public verify
  }

  // 4. Produce strict public projection
  const publicProjection = {
    company: {
      name: companyData?.name || 'Unknown Company',
    },
    trip: {
      status: tripData.status,
      deliveryDate: deliveryDate,
      pickupCity: tripData.facility_name || 'Not specified',
      destinationCity: tripData.destination_name || 'Not specified'
    },
    evidence: {
      state: evidenceState,
      checklist: {
        arrivalRecorded: !!hasArrival,
        checkinRecorded: !!hasCheckin,
        departureRecorded: !!hasDeparture
      }
    },
    timeline: keyEvents.map(e => ({
      type: e.event_type,
      timestamp: e.timestamp,
      location: e.location_name || 'Location recorded'
    })),
    aiSummary: aiSummary,
    isPublicVerification: true
  };

  return publicProjection;
}
