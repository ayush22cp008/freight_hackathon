import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';
import Link from 'next/link';
import ClaimTripButton from './ClaimTripButton';
import PublicShareManager from './company/PublicShareManager';

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
      .select('id, name')
      .eq('auth_id', user.id)
      .single();

    if (!company) {
      redirect('/onboarding');
    }

    // Fetch incoming trips for receiver check-in
    const { data: incomingTrips } = await supabaseServer
      .from('trips')
      .select(`
        id, 
        facility_name, 
        destination_name, 
        status, 
        receiver_delivery_confirmed_at,
        events ( event_type )
      `)
      .eq('receiving_company_id', company.id)
      .in('status', ['active', 'claimed', 'in_progress']);

    // Fetch completed trips for public sharing
    const { data: companyCompletedTrips } = await supabaseServer
      .from('trips')
      .select(`
        id, 
        facility_name, 
        destination_name, 
        status, 
        trip_public_shares ( status )
      `)
      .eq('receiving_company_id', company.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    return (
      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Company Dashboard</h1>
                {incomingTrips?.length === 0 ? (
                  <p className="text-gray-500">No incoming deliveries at this time.</p>
                ) : (
                  <div className="space-y-4">
                    {incomingTrips?.map(trip => {
                      const eventTypes = trip.events.map((e: any) => e.event_type);
                      const hasArrived = eventTypes.includes('ARRIVED_AT_DELIVERY');
                      const hasCheckedIn = eventTypes.includes('RECEIVER_CHECKED_IN');
                      const hasDeparted = eventTypes.includes('DELIVERY_DEPARTED');
                      
                      let cta = null;
                      let statusText = 'In Transit';

                      if (trip.status === 'completed') {
                        statusText = 'Completed';
                      } else if (!hasCheckedIn && hasArrived) {
                        statusText = 'Arrived - Action Required';
                        cta = (
                          <Link href={`/company/receiver-checkin?tripId=${trip.id}`} className="text-blue-600 hover:underline font-medium text-sm">
                            Complete Receiver Check-in →
                          </Link>
                        );
                      } else if (hasCheckedIn && !hasDeparted) {
                        statusText = 'Driver is Unloading';
                      } else if (hasDeparted && !trip.receiver_delivery_confirmed_at) {
                        statusText = 'Action Required';
                        cta = (
                          <Link href={`/company/completion?tripId=${trip.id}`} className="text-blue-600 hover:underline font-medium text-sm">
                            Confirm Delivery Received →
                          </Link>
                        );
                      } else if (trip.receiver_delivery_confirmed_at) {
                        statusText = 'Waiting for Driver Confirmation';
                      }

                      return (
                        <div key={trip.id} className="border border-gray-200 rounded p-4 flex flex-col sm:flex-row justify-between sm:items-center">
                          <div>
                            <div className="font-medium text-gray-900">{trip.facility_name || 'Incoming Trip'}</div>
                            <div className="text-sm text-gray-500">Status: {statusText}</div>
                          </div>
                          {cta && <div className="mt-2 sm:mt-0">{cta}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

        <h2 className="text-xl font-semibold mt-8 mb-4">Completed Deliveries</h2>
        {!companyCompletedTrips || companyCompletedTrips.length === 0 ? (
          <p className="text-gray-500 bg-white p-6 rounded-lg border border-gray-200">No completed deliveries yet.</p>
        ) : (
          <div className="space-y-4">
            {companyCompletedTrips.map(trip => {
              const activeShares = trip.trip_public_shares?.filter((s: any) => s.status === 'ACTIVE') || [];
              const hasActiveShare = activeShares.length > 0;
              return (
                <div key={trip.id} className="border border-gray-200 bg-white rounded p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">{trip.facility_name || 'Trip'}</div>
                      <div className="text-sm text-gray-500">To: {trip.destination_name || 'N/A'}</div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <PublicShareManager tripId={trip.id} hasActiveShare={hasActiveShare} />
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-8">
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
    .select('id, facility_name, status, driver_completion_confirmed_at')
    .eq('driver_id', driverId)
    .in('status', ['active', 'claimed', 'in_progress'])
    .limit(1)
    .single();

  // Get completed historical trips
  const { data: completedTrips } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, distance, duration, payout')
    .eq('driver_id', driverId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  const completedTripsSection = (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Past / Completed Trips</h2>
      {!completedTrips || completedTrips.length === 0 ? (
        <p className="text-gray-500 bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">No completed trips yet.</p>
      ) : (
        <div className="grid gap-4">
          {completedTrips.map((ct) => (
            <div key={ct.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">Pickup: {ct.facility_name || 'N/A'}</h3>
                <p className="text-gray-700 text-sm font-medium">Dropoff: {ct.destination_name || 'N/A'}</p>
                <div className="flex gap-4 text-xs text-gray-500 mt-2">
                  <span>Distance: {ct.distance ? `${ct.distance} mi` : 'N/A'}</span>
                  <span>Duration: {ct.duration || 'N/A'}</span>
                  <span className="font-semibold text-green-700">Payout: ${ct.payout || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center">
                <Link
                  href={`/timeline?tripId=${ct.id}`}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md font-medium transition-colors"
                >
                  View Timeline
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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

        {completedTripsSection}
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
  const hasInTransit = eventTypes.includes('IN_TRANSIT');
  const hasArrivedAtDelivery = eventTypes.includes('ARRIVED_AT_DELIVERY');
  const hasReceiverCheckedIn = eventTypes.includes('RECEIVER_CHECKED_IN');
  const hasGoodsUnloaded = eventTypes.includes('GOODS_UNLOADED');
  const hasDeliveryDeparted = eventTypes.includes('DELIVERY_DEPARTED');

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
  } else if (!hasInTransit) {
    stateText = 'Pickup Departed';
    ctaText = 'Record In-Transit';
    ctaHref = '/events/in-transit';
  } else if (!hasArrivedAtDelivery) {
    stateText = 'In Transit';
    ctaText = 'Record Arrival at Delivery';
    ctaHref = '/events/arrived-at-delivery';
  } else if (!hasReceiverCheckedIn) {
    stateText = 'Arrived at Delivery';
    ctaText = 'View Timeline (Awaiting Receiver)';
    ctaHref = '/timeline';
  } else if (!hasGoodsUnloaded) {
    stateText = 'Receiver Checked In';
    ctaText = 'Record Goods Unloaded';
    ctaHref = '/events/goods-unloaded';
  } else if (!hasDeliveryDeparted) {
    stateText = 'Goods Unloaded';
    ctaText = 'Record Delivery Departed';
    ctaHref = '/events/delivery-departed';
  } else if (trip.status === 'completed') {
    stateText = 'Completed';
    ctaText = 'View Timeline';
    ctaHref = '/timeline';
  } else if (!trip.driver_completion_confirmed_at) {
    stateText = 'Delivery Departed';
    ctaText = 'Confirm Delivery Completion';
    ctaHref = '/completion/driver';
  } else {
    stateText = 'Waiting for Receiver Confirmation';
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

      {completedTripsSection}
    </main>
  );
}
