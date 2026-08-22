import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import ArrivalClient from './ArrivalClient';

export default async function ArrivalPage() {
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

  // Get active trip for this driver
  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name')
    .eq('driver_id', driverId)
    .eq('status', 'active')
    .single();

  if (!trip) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">No active trip found</h1>
        <p>You do not have any active trips assigned.</p>
      </div>
    );
  }

  // Check if arrival already exists
  const { data: existingArrival } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'arrival')
    .maybeSingle();

  if (existingArrival) {
    redirect('/');
  }

  return <ArrivalClient tripId={trip.id} facilityName={trip.facility_name} />;
}
