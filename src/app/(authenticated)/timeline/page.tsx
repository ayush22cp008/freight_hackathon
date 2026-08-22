import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AIEvidenceSummary from '@/components/AIEvidenceSummary';

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Resolve authenticated user to driver
  const { data: driver } = await supabaseServer
    .from('drivers')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!driver) {
    redirect('/');
  }

  // Get active trip for this driver
  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name')
    .eq('driver_id', driver.id)
    .eq('status', 'active')
    .single();

  if (!trip) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Trip Timeline</h1>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <p className="text-gray-600">No active trip found. Cannot display timeline.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fetch events for the trip chronologically
  const { data: events } = await supabaseServer
    .from('events')
    .select('*')
    .eq('trip_id', trip.id)
    .order('server_timestamp', { ascending: true });

  const hasEvents = events && events.length > 0;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trip Timeline: {trip.facility_name}</h1>
        <Link href="/" className="text-blue-600 hover:underline font-medium">
          Back to Dashboard
        </Link>
      </div>

      {!hasEvents ? (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <p className="text-gray-600 text-center py-4">No events have been recorded for this trip yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="bg-white p-6 rounded-lg shadow border border-gray-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
              
              <div className="flex justify-between items-start mb-4 pl-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 mb-2">
                    Step {index + 1}: {event.event_type}
                  </span>
                  <p className="text-sm text-gray-500">
                    <strong>Recorded:</strong> {new Date(event.server_timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Location:</strong> {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                    {event.gps_accuracy && ` (±${Math.round(event.gps_accuracy)}m)`}
                  </p>
                </div>
              </div>

              {event.photo_url ? (
                <div className="pl-4 mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Photo Evidence</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={event.photo_url} 
                    alt={`${event.event_type} proof`} 
                    className="max-w-xs rounded shadow-sm border border-gray-200" 
                  />
                </div>
              ) : (
                <div className="pl-4 mt-4">
                  <p className="text-sm italic text-gray-400">No photo evidence provided.</p>
                </div>
              )}
            </div>
          ))}
          
          <AIEvidenceSummary />
        </div>
      )}
    </div>
  );
}
