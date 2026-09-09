import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';
import Link from 'next/link';
import ClaimTripButton from './ClaimTripButton';
import PublicShareManager from './company/PublicShareManager';
import CompanyRecentCompletions from './CompanyRecentCompletions';

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

    // Fetch incoming trips needing attention (arrived but not checked in, or departed but not completed)
    const { data: attentionTrips } = await supabaseServer
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

    // Fetch active created trips
    const { data: activeCreatedTrips } = await supabaseServer
      .from('trips')
      .select('id, facility_name, destination_name, status, driver_id')
      .eq('company_id', company.id)
      .in('status', ['active', 'claimed', 'in_progress', 'draft'])
      .limit(5);

    // Filter attention trips
    const needsAttention = attentionTrips?.filter(trip => {
      const eventTypes = trip.events.map((e: any) => e.event_type);
      const hasArrived = eventTypes.includes('ARRIVED_AT_DELIVERY');
      const hasCheckedIn = eventTypes.includes('RECEIVER_CHECKED_IN');
      const hasDeparted = eventTypes.includes('DELIVERY_DEPARTED');
      
      return (!hasCheckedIn && hasArrived) || (hasDeparted && !trip.receiver_delivery_confirmed_at);
    }) || [];

    // Fetch recent completed trips for CompanyRecentCompletions
    const { data: recentCompletedTrips } = await supabaseServer
      .from('trips')
      .select('id, facility_name, destination_name')
      .or(`company_id.eq.${company.id},receiving_company_id.eq.${company.id}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    return (
      <main className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="text-gray-600 font-medium">{company.name}</div>
        </div>

        <CompanyRecentCompletions trips={recentCompletedTrips || []} />

        <section>
          <h2 className="text-xl font-semibold mb-4 text-red-600 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Needs Attention
          </h2>
          {needsAttention.length === 0 ? (
            <div className="bg-green-50 p-6 rounded-lg border border-green-100 flex items-center">
              <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              <span className="text-green-800 font-medium">No actions needed</span>
            </div>
          ) : (
            <div className="grid gap-4">
              {needsAttention.map(trip => {
                const eventTypes = trip.events.map((e: any) => e.event_type);
                const hasCheckedIn = eventTypes.includes('RECEIVER_CHECKED_IN');
                
                return (
                  <div key={trip.id} className="border border-red-200 bg-red-50 rounded p-4 flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                      <div className="font-bold text-gray-900">{trip.facility_name}</div>
                      <div className="text-sm text-red-700 mt-1">
                        {!hasCheckedIn ? 'Arrived - Receiver Check-in Required' : 'Departed - Delivery Confirmation Required'}
                      </div>
                    </div>
                    <Link 
                      href={!hasCheckedIn ? `/company/receiver-checkin?tripId=${trip.id}` : `/company/completion?tripId=${trip.id}`} 
                      className="mt-3 sm:mt-0 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 text-center"
                    >
                      Take Action
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Active Created Trips</h2>
            <Link href="/company/created" className="text-blue-600 hover:underline text-sm font-medium">View All →</Link>
          </div>
          
          {!activeCreatedTrips || activeCreatedTrips.length === 0 ? (
            <p className="text-gray-500 bg-white p-6 rounded-lg border border-gray-200">No active trips currently.</p>
          ) : (
            <div className="grid gap-4">
              {activeCreatedTrips.map(trip => (
                <Link key={trip.id} href={`/company/trips/${trip.id}`} className="block">
                  <div className="border border-gray-200 bg-white rounded p-4 hover:shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-gray-900">{trip.facility_name} → {trip.destination_name}</div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase tracking-wide">
                        {trip.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/company/trips/create" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow transition-all group">
              <h3 className="font-bold text-lg text-blue-600 group-hover:text-blue-700 mb-1">Create Trip</h3>
              <p className="text-sm text-gray-500">Publish a new delivery</p>
            </Link>
            <Link href="/company/incoming" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow transition-all group">
              <h3 className="font-bold text-lg text-blue-600 group-hover:text-blue-700 mb-1">Incoming Deliveries</h3>
              <p className="text-sm text-gray-500">Manage receiving tasks</p>
            </Link>
            <Link href="/company/history" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow transition-all group">
              <h3 className="font-bold text-lg text-blue-600 group-hover:text-blue-700 mb-1">History</h3>
              <p className="text-sm text-gray-500">View past trips and public shares</p>
            </Link>
          </div>
        </section>
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
