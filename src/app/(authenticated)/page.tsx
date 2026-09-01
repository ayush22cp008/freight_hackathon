import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';
import Link from 'next/link';
import ClaimTripButton from './ClaimTripButton';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Reviewer authorization takes priority over driver/company identity.
  // A reviewer may also have a driver/company identity, so this check must
  // happen before getFreightIdentity() routing.
  const { data: reviewerAuth } = await supabaseServer
    .from('reviewer_authorizations')
    .select('auth_id')
    .eq('auth_id', user.id)
    .single();

  if (reviewerAuth) {
    redirect('/reviewer/queue');
  }

  const identity = await getFreightIdentity();

  if (!identity) {
    redirect('/onboarding');
  }

  if (identity.verification_status !== 'VERIFIED') {
    redirect('/onboarding');
  }

  if (identity.trusted_role === 'COMPANY') {
    // Show Company Dashboard
    const { data: company } = await supabaseServer
      .from('companies')
      .select('name')
      .eq('auth_id', user.id)
      .single();

    return (
      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Company Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Welcome, {company?.name || 'Company'}</h2>
          <p className="text-gray-600 mb-6">
            This is the verified company portal. From here you can manage your fleet, drivers, and trips.
          </p>
          <div className="pt-4 border-t border-gray-100">
            <Link
              href="/company/trips/create"
              className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Create New Trip
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Otherwise, Driver Dashboard
  // Get driver using auth_id
  const { data: driver } = await supabaseServer
    .from('drivers')
    .select('id, name')
    .eq('auth_id', user.id)
    .single();

  if (!driver) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">No Driver Profile</h1>
        <p className="text-gray-600">Your account is not linked to a driver record. Please contact an admin.</p>
      </main>
    );
  }

  const driverId = driver.id;

  // Get active trip
  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name, status')
    .eq('driver_id', driverId)
    .in('status', ['active', 'claimed', 'in_progress'])
    .limit(1)
    .single();

  if (!trip) {
    // If no active trip, fetch published trips available for claim
    const { data: publishedTrips } = await supabaseServer
      .from('trips')
      .select('id, facility_name, destination_name, distance, duration, payout')
      .eq('status', 'published')
      .is('driver_id', null)
      .order('created_at', { ascending: false });

    return (
      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold mb-4">Welcome, {driver.name}</h1>
        <h2 className="text-xl font-semibold mb-4">Available Trips</h2>
        
        {!publishedTrips || publishedTrips.length === 0 ? (
          <p className="text-gray-600 bg-white p-6 rounded-lg shadow border border-gray-200">
            No published trips available at this time.
          </p>
        ) : (
          <div className="grid gap-6">
            {publishedTrips.map((pt) => (
              <div key={pt.id} className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Pickup: {pt.facility_name || 'N/A'}</h3>
                  <p className="text-gray-700 font-medium">Dropoff: {pt.destination_name || 'N/A'}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Distance: {pt.distance ? `${pt.distance} mi` : 'N/A'}</span>
                    <span>Duration: {pt.duration || 'N/A'}</span>
                    <span className="font-semibold text-green-700">Payout: ${pt.payout || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <ClaimTripButton tripId={pt.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  // Get events for the active trip
  const { data: events } = await supabaseServer
    .from('events')
    .select('event_type')
    .eq('trip_id', trip.id);

  const eventTypes = events?.map(e => e.event_type) || [];

  const hasArrival = eventTypes.includes('arrival') || eventTypes.includes('ARRIVED_AT_PICKUP');
  const hasCheckin = eventTypes.includes('checkin') || eventTypes.includes('PICKUP_CHECKED_IN');
  const hasLoad = eventTypes.includes('GOODS_LOADED');
  const hasDeparture = eventTypes.includes('departure') || eventTypes.includes('PICKUP_DEPARTED');

  let stateText = '';
  let ctaText = '';
  let ctaHref = '';

  if (!hasArrival) {
    stateText = trip.status === 'claimed' ? 'Trip Claimed - Arrival Pending' : 'Arrival Pending';
    ctaText = 'Start Arrival';
    ctaHref = '/events/arrival';
  } else if (!hasCheckin) {
    stateText = 'Arrival Complete';
    ctaText = 'Start Check-in';
    ctaHref = '/events/checkin';
  } else if (!hasLoad) {
    stateText = 'Check-in Complete';
    ctaText = 'Record Goods Loaded';
    ctaHref = '/events/load';
  } else if (!hasDeparture) {
    stateText = 'Goods Loaded';
    ctaText = 'Start Pickup Departure';
    ctaHref = '/events/pickup-departed';
  } else {
    stateText = 'Trip Complete';
    ctaText = 'View Timeline';
    ctaHref = '/timeline';
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Active Trip: {trip.facility_name}</h1>

      <div className="bg-white p-6 rounded-lg shadow space-y-4 border border-gray-200">
        <div>
          <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Current Status</p>
          <p className="text-lg font-medium text-gray-900">{stateText}</p>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Link
            href={ctaHref}
            className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </main>
  );
}
