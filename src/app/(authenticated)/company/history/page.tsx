import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'History | Freight Company',
};

export default async function HistoryPage() {
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

  // Fetch trips where the company was either the creator or the receiver and status is completed
  const { data: completedTrips } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, status, created_at')
    .or(`company_id.eq.${company.id},receiving_company_id.eq.${company.id}`)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">History & Timeline</h1>

      {!completedTrips || completedTrips.length === 0 ? (
        <p className="text-gray-500">You have no completed trips in your history.</p>
      ) : (
        <div className="grid gap-4">
          {completedTrips.map(trip => (
            <Link key={trip.id} href={`/company/trips/${trip.id}`} className="block">
              <div className="border border-gray-200 bg-white rounded p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{trip.facility_name} → {trip.destination_name}</h3>
                    <p className="text-sm text-gray-500">Completed on {new Date(trip.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Completed
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
