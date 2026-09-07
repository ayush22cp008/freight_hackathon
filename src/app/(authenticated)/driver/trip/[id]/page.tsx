import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ClaimTripButton from '@/app/(authenticated)/ClaimTripButton';

export default async function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get driver using auth_id
  const { data: driver } = await supabaseServer
    .from('drivers')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!driver) {
    redirect('/');
  }

  // Check if driver has an active trip
  const { data: activeTrip } = await supabaseServer
    .from('trips')
    .select('id')
    .eq('driver_id', driver.id)
    .in('status', ['active', 'claimed', 'in_progress'])
    .limit(1)
    .single();

  const hasActiveTrip = !!activeTrip;

  // Fetch the specific trip
  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, distance, duration, payout, status, driver_id')
    .eq('id', tripId)
    .single();

  if (!trip) {
    return (
      <main className="p-8 max-w-2xl mx-auto space-y-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Trip Not Found</h1>
        <p className="text-gray-600 mb-6">The requested trip could not be found or is no longer available.</p>
        <Link href="/driver/available" className="text-blue-600 hover:underline">← Back to Available Trips</Link>
      </main>
    );
  }

  const isEligibleToClaim = trip.status === 'published' && !trip.driver_id && !hasActiveTrip;

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Trip Details</h1>
        <Link href="/driver/available" className="text-blue-600 hover:underline">← Back to Available Trips</Link>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Pickup Location</h2>
            <p className="text-xl font-bold text-gray-900">{trip.facility_name || 'N/A'}</p>
          </div>
          
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Dropoff Location</h2>
            <p className="text-xl font-bold text-gray-900">{trip.destination_name || 'N/A'}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500 font-medium">Distance</p>
              <p className="font-semibold">{trip.distance ? `${trip.distance} mi` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Duration</p>
              <p className="font-semibold">{trip.duration || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Payout</p>
              <p className="font-semibold text-green-700">${trip.payout || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center">
          {isEligibleToClaim ? (
            <ClaimTripButton tripId={trip.id} />
          ) : (
            <div className="text-center">
              <button disabled className="bg-gray-300 text-gray-500 py-3 px-12 rounded-md font-bold cursor-not-allowed">
                Claim Trip
              </button>
              {hasActiveTrip && (
                <p className="text-sm text-gray-500 mt-3 font-medium">You cannot claim a new trip while you have an active delivery.</p>
              )}
              {!hasActiveTrip && trip.status !== 'published' && (
                <p className="text-sm text-gray-500 mt-3 font-medium">This trip is no longer available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
