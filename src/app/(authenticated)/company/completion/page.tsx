import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';
import ReceiverCompletionClient from './ReceiverCompletionClient';

export default async function ReceiverCompletionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
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

  const tripId = typeof params.tripId === 'string' ? params.tripId : undefined;

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
    .select('id, destination_name, driver_completion_confirmed_at, receiver_delivery_confirmed_at, receiving_company_id, driver_id')
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

  // Verify that Delivery Departed occurred
  const { data: departedEvent } = await supabaseServer
    .from('events')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('event_type', 'DELIVERY_DEPARTED')
    .limit(1)
    .maybeSingle();

  if (!departedEvent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Action Not Allowed</h1>
        <p>The driver has not yet recorded their departure from the delivery.</p>
      </div>
    );
  }

  if (trip.receiver_delivery_confirmed_at) {
    redirect('/');
  }

  // Get driver info for context
  const { data: driver } = await supabaseServer
    .from('drivers')
    .select('name')
    .eq('id', trip.driver_id)
    .single();

  return (
    <ReceiverCompletionClient 
      tripId={trip.id} 
      destinationName={trip.destination_name || 'Delivery Facility'} 
      driverName={driver?.name || 'Assigned Driver'}
      driverConfirmed={!!trip.driver_completion_confirmed_at}
    />
  );
}
