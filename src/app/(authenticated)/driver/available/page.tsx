import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AvailableTrips() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get driver using auth_id
  const { data: driver } = await supabaseServer
    .from('drivers')
    .select('id, name')
    .eq('auth_id', user.id)
    .single();

  if (!driver) {
    redirect('/'); // Handled by layout/onboarding typically, but just in case
  }

  // Fetch published trips
  const { data: publishedTrips } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, distance, duration, payout')
    .eq('status', 'published')
    .is('driver_id', null)
    .order('created_at', { ascending: false });

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Available Trips</h1>
        <Link href="/" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>

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
                <Link
                  href={`/driver/trip/${pt.id}`}
                  className="inline-block bg-blue-50 text-blue-700 border border-blue-200 py-2 px-4 rounded-md font-medium hover:bg-blue-100 transition-colors"
                >
                  View Trip
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
