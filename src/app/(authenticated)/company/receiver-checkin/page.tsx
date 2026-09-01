import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';
import ReceiverCheckinClient from './ReceiverCheckinClient';

export default async function ReceiverCheckinPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const identity = await getFreightIdentity();
  if (!identity || identity.trusted_role !== 'COMPANY' || identity.verification_status !== 'VERIFIED') {
    redirect('/');
  }

  const { data: company } = await supabaseServer
    .from('companies')
    .select('id, name')
    .eq('auth_id', user.id)
    .single();

  if (!company) {
    redirect('/');
  }

  const tripId = typeof searchParams.tripId === 'string' ? searchParams.tripId : undefined;

  if (!tripId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Missing Trip ID</h1>
        <p>A valid trip ID is required.</p>
      </div>
    );
  }

  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, receiving_company_id, driver_id, status')
    .eq('id', tripId)
    .in('status', ['active', 'claimed', 'in_progress'])
    .single();

  if (!trip) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Trip Not Found</h1>
        <p>The trip could not be found or is no longer active.</p>
      </div>
    );
  }

  if (trip.receiving_company_id !== company.id) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Unauthorized</h1>
        <p>You are not the authorized receiving company for this delivery.</p>
      </div>
    );
  }

  // Verify that Arrival at Delivery occurred
  const { data: arrivalEvent } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'ARRIVED_AT_DELIVERY')
    .limit(1)
    .maybeSingle();

  if (!arrivalEvent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Action Not Allowed</h1>
        <p>The driver has not yet recorded arrival at delivery.</p>
      </div>
    );
  }

  // Check if Receiver Checked In already exists
  const { data: existingCheckin } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'RECEIVER_CHECKED_IN')
    .maybeSingle();

  if (existingCheckin) {
    redirect('/');
  }

  // Get driver info for context
  const { data: driver } = await supabaseServer
    .from('drivers')
    .select('name')
    .eq('id', trip.driver_id)
    .single();

  return (
    <ReceiverCheckinClient 
      tripId={trip.id} 
      destinationName={trip.destination_name || 'Delivery Facility'} 
      driverName={driver?.name || 'Assigned Driver'} 
    />
  );
}
