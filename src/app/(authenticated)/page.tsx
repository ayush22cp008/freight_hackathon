import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const identity = await getFreightIdentity();

  if (!identity || identity.verification_status !== 'VERIFIED') {
    redirect('/onboarding');
  }

  if (identity.trusted_role === 'COMPANY') {
    // Show Company Dashboard
    const { data: company } = await supabaseServer
      .from('companies')
      .select('name')
      .eq('auth_id', user.id)
      .single();

    return (
      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Company Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Welcome, {company?.name || 'Company'}</h2>
          <p className="text-gray-600">
            This is the verified company portal. From here you can manage your fleet, drivers, and trips.
          </p>
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

  // Get active trip
  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name')
    .eq('driver_id', driverId)
    .eq('status', 'active')
    .single();

  if (!trip) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Welcome, {driver.name}</h1>
        <p className="text-gray-600">No active trips assigned at this time.</p>
      </main>
    );
  }

  // Get events for the active trip
  const { data: events } = await supabaseServer
    .from('events')
    .select('event_type')
    .eq('trip_id', trip.id);

  const eventTypes = events?.map(e => e.event_type) || [];
  
  const hasArrival = eventTypes.includes('arrival');
  const hasCheckin = eventTypes.includes('checkin');
  const hasDeparture = eventTypes.includes('departure');

  let stateText = '';
  let ctaText = '';
  let ctaHref = '';

  if (!hasArrival) {
    stateText = 'Arrival Pending';
    ctaText = 'Start Arrival';
    ctaHref = '/events/arrival';
  } else if (!hasCheckin) {
    stateText = 'Arrival Complete';
    ctaText = 'Start Check-in';
    ctaHref = '/events/checkin';
  } else if (!hasDeparture) {
    stateText = 'Check-in Complete';
    ctaText = 'Start Departure';
    ctaHref = '/events/departure';
  } else {
    stateText = 'Trip Complete';
    ctaText = 'View Timeline';
    ctaHref = '/timeline';
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Active Trip: {trip.facility_name}</h1>
      
      <div className="bg-white p-6 rounded-lg shadow space-y-4 border border-gray-200">
        <div>
          <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Current Status</p>
          <p className="text-lg font-medium text-gray-900">{stateText}</p>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
          <Link 
            href={ctaHref}
            className="block w-full text-center bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </main>
  );
}
