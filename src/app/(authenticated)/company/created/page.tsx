import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'My Created Trips | Freight Company',
};

export default async function CreatedTripsPage() {
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

  const { data: createdTrips } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, status, distance, payout, driver_id')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });

  const activeTrips = createdTrips?.filter(t => t.status !== 'completed') || [];

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Created Trips</h1>
        <Link href="/company/trips/create" className="bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700">
          Create New Trip
        </Link>
      </div>

      {!activeTrips || activeTrips.length === 0 ? (
        <p className="text-gray-500">You have no active created trips at this time.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Active Trips</h2>
            <div className="grid gap-4">
              {activeTrips.map(trip => (
                <Link key={trip.id} href={`/company/trips/${trip.id}`} className="block">
                  <div className="border border-gray-200 bg-white rounded p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{trip.facility_name} → {trip.destination_name}</h3>
                        <p className="text-sm text-gray-500 mt-1">Status: <span className="font-medium text-blue-700 uppercase tracking-wide">{trip.status}</span></p>
                        <p className="text-sm text-gray-500">Driver Claimed: {trip.driver_id ? 'Yes' : 'No'}</p>
                        {trip.status === 'in_progress' && (
                          <div className="mt-2 inline-block">
                            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">View Completion Status →</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">${trip.payout}</div>
                        <div className="text-sm text-gray-500">{trip.distance} mi</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
