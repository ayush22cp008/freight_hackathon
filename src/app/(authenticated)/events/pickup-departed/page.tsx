import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import PickupDepartedClient from './PickupDepartedClient';

export default async function PickupDepartedPage() {
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
    .in('status', ['active', 'claimed', 'in_progress'])
    .limit(1)
    .single();

  if (!trip) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">No active trip found</h1>
        <p>You do not have any active trips assigned.</p>
      </div>
    );
  }

  // Verify that Goods Loaded occurred
  const { data: loadEvent } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'GOODS_LOADED')
    .limit(1)
    .maybeSingle();

  if (!loadEvent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Action Not Allowed</h1>
        <p>You must record Goods Loaded before recording Pickup Departure.</p>
      </div>
    );
  }

  // Check if Pickup Departure already exists (or legacy departure)
  const { data: existingDeparture } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .in('event_type', ['departure', 'PICKUP_DEPARTED'])
    .maybeSingle();

  if (existingDeparture) {
    redirect('/');
  }

  return <PickupDepartedClient tripId={trip.id} facilityName={trip.facility_name || 'Pickup Facility'} />;
}
