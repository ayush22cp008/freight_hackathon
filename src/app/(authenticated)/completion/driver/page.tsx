import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import DriverCompletionClient from './DriverCompletionClient';
import Link from 'next/link';

export default async function DriverCompletionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { tripId } = await searchParams;

  if (!tripId || typeof tripId !== 'string') {
    redirect('/driver/active');
  }

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

  // Get specific trip for this driver
  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, driver_completion_confirmed_at, receiver_delivery_confirmed_at, status')
    .eq('id', tripId)
    .eq('driver_id', driverId)
    .single();

  if (!trip) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Trip Not Found</h1>
        <p className="mb-6">The requested trip could not be found.</p>
        <Link href="/driver/active" className="text-blue-600 hover:underline">
          Go to My Active Trip
        </Link>
      </div>
    );
  }

  // State C: Fully Completed
  if (trip.status === 'completed') {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6 text-center mt-12">
        <div className="bg-green-50 p-8 rounded-lg border border-green-200">
          <h1 className="text-3xl font-bold mb-4 text-green-800">Trip Completed</h1>
          <p className="text-green-700 mb-8 font-medium">Both you and the receiving company have confirmed this delivery.</p>
          <Link
            href={`/timeline?tripId=${trip.id}`}
            className="inline-block bg-green-700 text-white font-bold py-3 px-8 rounded-md hover:bg-green-800 transition-colors"
          >
            View Timeline
          </Link>
        </div>
      </div>
    );
  }

  // State B: Waiting for Receiver (Driver Confirmed)
  if (trip.driver_completion_confirmed_at) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6 text-center mt-12">
        <div className="bg-blue-50 p-8 rounded-lg border border-blue-200">
          <h1 className="text-3xl font-bold mb-2 text-blue-900">Delivery Tasks Completed</h1>
          <p className="text-blue-800 font-medium mb-6">Your delivery tasks are complete.</p>
          
          <div className="bg-white p-6 rounded-md shadow-sm mb-8 border border-blue-100">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Waiting for Receiving Company Confirmation</h2>
            <p className="text-gray-600">No further action is required from you right now.</p>
            <p className="text-gray-600">Your trip will be completed once the receiving company confirms delivery.</p>
          </div>
          
          <Link
            href="/driver/active"
            className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to My Active Trip
          </Link>
        </div>
      </div>
    );
  }

  // State A: Needs Confirmation
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
      <div className="p-8 max-w-2xl mx-auto text-center mt-12">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Action Not Allowed</h1>
        <p className="mb-6">You must record Delivery Departed before you can confirm completion.</p>
        <Link href="/driver/active" className="text-blue-600 hover:underline">
          Go to My Active Trip
        </Link>
      </div>
    );
  }

  return (
    <DriverCompletionClient 
      tripId={trip.id} 
      destinationName={trip.destination_name || 'Delivery Facility'} 
      receiverConfirmed={!!trip.receiver_delivery_confirmed_at}
    />
  );
}
