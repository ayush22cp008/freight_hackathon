import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DriverHistory() {
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

  const driverId = driver.id;

  // Get completed historical trips
  const { data: completedTrips } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, distance, duration, payout')
    .eq('driver_id', driverId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Completed Trips</h1>
        <Link href="/" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>

      {!completedTrips || completedTrips.length === 0 ? (
        <p className="text-gray-500 bg-white p-6 rounded-lg shadow border border-gray-200 text-center text-lg mt-8">
          No completed trips yet.
        </p>
      ) : (
        <div className="grid gap-6">
          {completedTrips.map((ct) => (
            <div key={ct.id} className="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Pickup: {ct.facility_name || 'N/A'}</h3>
                <p className="text-gray-700 font-medium">Dropoff: {ct.destination_name || 'N/A'}</p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Distance: {ct.distance ? `${ct.distance} mi` : 'N/A'}</span>
                  <span>Duration: {ct.duration || 'N/A'}</span>
                  <span className="font-semibold text-green-700">Payout: ${ct.payout || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center">
                <Link
                  href={`/timeline?tripId=${ct.id}`}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-6 rounded-md font-medium transition-colors"
                >
                  View Timeline
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
