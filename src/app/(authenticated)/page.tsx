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

  // Check for active trip
  const { data: activeTrip } = await supabaseServer
    .from('trips')
    .select('id, facility_name, status')
    .eq('driver_id', driverId)
    .in('status', ['active', 'claimed', 'in_progress'])
    .limit(1)
    .single();

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Driver Dashboard</h1>
      <h2 className="text-xl font-semibold mb-2">Welcome, {driver.name}</h2>
      
      {activeTrip ? (
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
          <h3 className="text-lg font-bold text-gray-900 mb-2">My Active Trip</h3>
          <p className="text-gray-700 mb-4">You have an ongoing delivery from <strong>{activeTrip.facility_name}</strong>.</p>
          <Link
            href="/driver/active"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Continue Trip →
          </Link>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Trip</h3>
          <p className="text-gray-700 mb-4">You are currently available for new deliveries.</p>
          <Link
            href="/driver/available"
            className="inline-block bg-green-600 text-white py-2 px-6 rounded-md font-medium hover:bg-green-700 transition-colors"
          >
            Find Available Trips →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Available Trips</h3>
            <p className="text-gray-600 mb-4">Browse and claim new delivery opportunities.</p>
          </div>
          <Link
            href="/driver/available"
            className="text-blue-600 hover:underline font-medium"
          >
            View Available Trips →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Completed Trips</h3>
            <p className="text-gray-600 mb-4">Review your delivery history and timelines.</p>
          </div>
          <Link
            href="/driver/history"
            className="text-blue-600 hover:underline font-medium"
          >
            View History →
          </Link>
        </div>
      </div>
    </main>
  );
}
