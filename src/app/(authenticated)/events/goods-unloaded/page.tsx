import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import GoodsUnloadedClient from './GoodsUnloadedClient';

export default async function GoodsUnloadedPage() {
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
    .select('id, facility_name, destination_name')
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

  // Verify that Receiver Checked In occurred
  const { data: receiverEvent } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'RECEIVER_CHECKED_IN')
    .limit(1)
    .maybeSingle();

  if (!receiverEvent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Action Not Allowed</h1>
        <p>The receiving company must complete receiver check-in before you can unload the goods.</p>
      </div>
    );
  }

  // Check if Goods Unloaded already exists
  const { data: existingUnload } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'GOODS_UNLOADED')
    .maybeSingle();

  if (existingUnload) {
    redirect('/');
  }

  return <GoodsUnloadedClient tripId={trip.id} destinationName={trip.destination_name || 'Delivery Facility'} />;
}
