import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import LoadClient from './LoadClient';

export default async function LoadPage() {
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

  // Verify that Check-in occurred
  const { data: checkinEvent } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .in('event_type', ['checkin', 'PICKUP_CHECKED_IN'])
    .limit(1)
    .maybeSingle();

  if (!checkinEvent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Action Not Allowed</h1>
        <p>You must Check-in before recording Goods Loaded.</p>
      </div>
    );
  }

  // Check if Load already exists
  const { data: existingLoad } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'GOODS_LOADED')
    .maybeSingle();

  if (existingLoad) {
    redirect('/');
  }

  return <LoadClient tripId={trip.id} facilityName={trip.facility_name || 'Pickup Facility'} />;
}
