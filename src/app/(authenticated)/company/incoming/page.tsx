import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ReceiverRequestActions from './ReceiverRequestActions';

export const metadata = {
  title: 'Incoming Deliveries | DeliveryProof Company',
};

export default async function IncomingDeliveriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: company } = await supabaseServer
    .from('companies')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!company) {
    redirect('/onboarding');
  }

  // Fetch pending requests for this receiver
  const { data: pendingRequests } = await supabaseServer
    .from('receiver_delivery_requests')
    .select(`
      id,
      state,
      created_at,
      trips ( id, facility_name, destination_name, status )
    `)
    .eq('receiving_company_id', company.id)
    .eq('state', 'PENDING')
    .order('created_at', { ascending: false });

  // Fetch operational incoming trips
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
    .in('status', ['active', 'claimed', 'in_progress'])
    .order('created_at', { ascending: false });

  const hasRequests = pendingRequests && pendingRequests.length > 0;
  const hasTrips = incomingTrips && incomingTrips.length > 0;

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Incoming Deliveries</h1>

      {!hasRequests && !hasTrips ? (
        <div className="bg-green-50 p-6 rounded-lg text-center border border-green-100">
          <h2 className="text-xl font-semibold text-green-800">No actions required</h2>
          <p className="text-green-600 mt-2">You have no pending incoming deliveries at this time.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {hasRequests && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-blue-900 border-b pb-2">Pending Requests</h2>
              <div className="space-y-4">
                {pendingRequests.map(req => {
                  const trip = Array.isArray(req.trips) ? req.trips[0] : req.trips;
                  if (!trip) return null;
                  
                  return (
                    <div key={req.id} className="border border-blue-200 bg-blue-50 rounded p-4 shadow-sm flex flex-col md:flex-row justify-between md:items-center">
                      <div className="mb-4 md:mb-0">
                        <Link href={`/company/trips/${trip.id}`} className="hover:underline">
                          <div className="font-bold text-lg text-gray-900">{trip.facility_name}</div>
                        </Link>
                        <div className="text-sm text-gray-600 mt-1">Status: <span className="font-medium text-blue-800">Pending Acceptance</span></div>
                        <div className="text-xs text-gray-500 mt-1">To: {trip.destination_name}</div>
                      </div>
                      <ReceiverRequestActions requestId={req.id} tripId={trip.id} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {hasTrips && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Active Deliveries</h2>
              <div className="space-y-4">
                {incomingTrips.map(trip => {
                  const eventTypes = trip.events.map((e: any) => e.event_type);
                  const hasArrived = eventTypes.includes('ARRIVED_AT_DELIVERY');
                  const hasCheckedIn = eventTypes.includes('RECEIVER_CHECKED_IN');
                  const hasDeparted = eventTypes.includes('DELIVERY_DEPARTED');
                  
                  let cta = null;
                  let statusText = 'In Transit';

                  if (!hasCheckedIn && hasArrived) {
                    statusText = 'Arrived - Receiver Check-in Required';
                    cta = (
                      <Link href={`/company/receiver-checkin?tripId=${trip.id}`} className="bg-yellow-500 text-white py-2 px-4 rounded font-medium hover:bg-yellow-600">
                        Complete Check-in
                      </Link>
                    );
                  } else if (hasCheckedIn && !hasDeparted) {
                    statusText = 'Driver is Unloading';
                  } else if (hasDeparted && !trip.receiver_delivery_confirmed_at) {
                    statusText = 'Departed - Delivery Confirmation Required';
                    cta = (
                      <Link href={`/company/completion?tripId=${trip.id}`} className="bg-green-600 text-white py-2 px-4 rounded font-medium hover:bg-green-700">
                        Confirm Received
                      </Link>
                    );
                  } else if (trip.receiver_delivery_confirmed_at) {
                    statusText = 'Waiting for Driver Completion';
                    cta = (
                      <Link href={`/company/completion?tripId=${trip.id}`} className="bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700">
                        View Completion Status
                      </Link>
                    );
                  }

                  return (
                    <div key={trip.id} className="border border-gray-200 bg-white rounded p-4 shadow-sm flex flex-col md:flex-row justify-between md:items-center">
                      <div className="mb-4 md:mb-0">
                        <Link href={`/company/trips/${trip.id}`} className="hover:underline">
                          <div className="font-bold text-lg text-gray-900">{trip.facility_name}</div>
                        </Link>
                        <div className="text-sm text-gray-600 mt-1">Status: <span className="font-medium text-gray-800">{statusText}</span></div>
                      </div>
                      {cta && <div>{cta}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      )}
    </main>
  );
}

