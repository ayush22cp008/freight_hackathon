import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import CompanyTripAcknowledgement from './CompanyTripAcknowledgement';

export default async function CompanyTripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: trip } = await supabaseServer
    .from('trips')
    .select(`
      *,
      events (*)
    `)
    .eq('id', id)
    .single();

  if (!trip) {
    return (
      <main className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Trip Not Found</h1>
        <Link href="/" className="text-blue-600 hover:underline">Return to Dashboard</Link>
      </main>
    );
  }

  const isSender = trip.company_id === company.id;
  const isReceiver = trip.receiving_company_id === company.id;

  if (!isSender && !isReceiver) {
    return (
      <main className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized</h1>
        <p>You do not have permission to view this trip.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">Return to Dashboard</Link>
      </main>
    );
  }

  const sortedEvents = trip.events?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [];

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      {trip.status === 'completed' && <CompanyTripAcknowledgement tripId={trip.id} />}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trip Details</h1>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 uppercase tracking-wide">
          {trip.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Route Info</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Pickup</div>
              <div className="font-medium">{trip.facility_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Destination</div>
              <div className="font-medium">{trip.destination_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Distance</div>
              <div className="font-medium">{trip.distance} miles</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Driver & Claim</h2>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium">{trip.driver_id ? 'Claimed' : 'Waiting for Driver'}</div>
            </div>
            {trip.driver_id && (
              <div>
                <div className="text-sm text-gray-500">Driver ID</div>
                <div className="font-medium text-xs break-all">{trip.driver_id}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-500">Payout Offer</div>
              <div className="font-medium">${trip.payout}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Delivery Evidence</h2>
        {sortedEvents.filter((evt: any) => evt.photo_url).length === 0 ? (
          <p className="text-gray-500">No delivery evidence available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sortedEvents.filter((evt: any) => evt.photo_url).map((evt: any) => (
              <div key={`evidence-${evt.id}`} className="border border-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={evt.photo_url} 
                  alt={`Evidence for ${evt.event_type}`}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3 bg-gray-50">
                  <div className="font-medium text-sm text-gray-900">{evt.event_type}</div>
                  <div className="text-xs text-gray-500">{new Date(evt.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Event Timeline</h2>
        {sortedEvents.length === 0 ? (
          <p className="text-gray-500">No events recorded yet.</p>
        ) : (
          <ul className="space-y-4">
            {sortedEvents.map((evt: any) => (
              <li key={evt.id} className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-100 pb-2">
                <span className="font-medium text-gray-800">{evt.event_type}</span>
                <span className="text-sm text-gray-500">{new Date(evt.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-4 mt-6">
        <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">← Back</Link>
      </div>
    </main>
  );
}
