import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import RecentCompletionBanner from './RecentCompletionBanner';

export default async function ActiveTrip() {
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

  // Get active trip
  const { data: trip } = await supabaseServer
    .from('trips')
    .select('id, facility_name, status, driver_completion_confirmed_at')
    .eq('driver_id', driverId)
    .in('status', ['active', 'claimed', 'in_progress'])
    .limit(1)
    .single();

  if (!trip) {
    // Implement Case C: query the most recently completed trip
    const { data: lastCompleted } = await supabaseServer
      .from('trips')
      .select('id, destination_name, receiver_delivery_confirmed_at')
      .eq('driver_id', driverId)
      .eq('status', 'completed')
      .order('receiver_delivery_confirmed_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    return (
      <main className="p-8 max-w-2xl mx-auto space-y-6 text-center mt-12">
        {lastCompleted && (
          <RecentCompletionBanner trip={lastCompleted} />
        )}
        <h1 className="text-3xl font-bold mb-4">No Active Trip</h1>
        <p className="text-gray-600 mb-8">You currently have no active delivery.</p>
        <Link
          href="/driver/available"
          className="inline-block bg-blue-600 text-white py-3 px-8 rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          Find Available Trips
        </Link>
      </main>
    );
  }

  // Get events for the active trip (including photo_url for Evidence Status)
  const { data: events } = await supabaseServer
    .from('events')
    .select('event_type, photo_url')
    .eq('trip_id', trip.id);

  const eventTypes = events?.map(e => e.event_type) || [];
  const photosCollected = events?.filter(e => e.photo_url).length || 0;

  const hasArrival = eventTypes.includes('arrival') || eventTypes.includes('ARRIVED_AT_PICKUP');
  const hasCheckin = eventTypes.includes('checkin') || eventTypes.includes('PICKUP_CHECKED_IN');
  const hasLoad = eventTypes.includes('GOODS_LOADED');
  const hasDeparture = eventTypes.includes('departure') || eventTypes.includes('PICKUP_DEPARTED');
  const hasInTransit = eventTypes.includes('IN_TRANSIT');
  const hasArrivedAtDelivery = eventTypes.includes('ARRIVED_AT_DELIVERY');
  const hasReceiverCheckedIn = eventTypes.includes('RECEIVER_CHECKED_IN');
  const hasGoodsUnloaded = eventTypes.includes('GOODS_UNLOADED');
  const hasDeliveryDeparted = eventTypes.includes('DELIVERY_DEPARTED');
  const hasCompletion = !!trip.driver_completion_confirmed_at;

  let stateText = '';
  let ctaText = '';
  let ctaHref = '';

  if (!hasArrival) {
    stateText = trip.status === 'claimed' ? 'Trip Claimed - Arrival Pending' : 'Arrival Pending';
    ctaText = 'Start Arrival';
    ctaHref = '/events/arrival';
  } else if (!hasCheckin) {
    stateText = 'Arrival Complete';
    ctaText = 'Start Check-in';
    ctaHref = '/events/checkin';
  } else if (!hasLoad) {
    stateText = 'Check-in Complete';
    ctaText = 'Record Goods Loaded';
    ctaHref = '/events/load';
  } else if (!hasDeparture) {
    stateText = 'Goods Loaded';
    ctaText = 'Start Pickup Departure';
    ctaHref = '/events/pickup-departed';
  } else if (!hasInTransit) {
    stateText = 'Pickup Departed';
    ctaText = 'Record In-Transit';
    ctaHref = '/events/in-transit';
  } else if (!hasArrivedAtDelivery) {
    stateText = 'In Transit';
    ctaText = 'Record Arrival at Delivery';
    ctaHref = '/events/arrived-at-delivery';
  } else if (!hasReceiverCheckedIn) {
    stateText = 'Arrived at Delivery';
    ctaText = 'View Timeline (Awaiting Receiver)';
    ctaHref = '/timeline';
  } else if (!hasGoodsUnloaded) {
    stateText = 'Receiver Checked In';
    ctaText = 'Record Goods Unloaded';
    ctaHref = '/events/goods-unloaded';
  } else if (!hasDeliveryDeparted) {
    stateText = 'Goods Unloaded';
    ctaText = 'Record Delivery Departed';
    ctaHref = '/events/delivery-departed';
  } else if (trip.status === 'completed') {
    stateText = 'Completed';
    ctaText = 'View Timeline';
    ctaHref = '/timeline';
  } else if (!trip.driver_completion_confirmed_at) {
    stateText = 'Delivery Departed';
    ctaText = 'Confirm Delivery Completion';
    ctaHref = `/completion/driver?tripId=${trip.id}`;
  } else {
    stateText = 'Waiting for Receiver Confirmation';
    ctaText = 'View Completion Status';
    ctaHref = `/completion/driver?tripId=${trip.id}`;
  }

  const stages = [
    { label: 'Arrival at Pickup', completed: hasArrival },
    { label: 'Check-in at Pickup', completed: hasCheckin },
    { label: 'Goods Loaded', completed: hasLoad },
    { label: 'Pickup Departed', completed: hasDeparture },
    { label: 'In Transit', completed: hasInTransit },
    { label: 'Arrived at Delivery', completed: hasArrivedAtDelivery },
    { label: 'Receiver Checked In', completed: hasReceiverCheckedIn },
    { label: 'Goods Unloaded', completed: hasGoodsUnloaded },
    { label: 'Delivery Departed', completed: hasDeliveryDeparted },
    { label: 'Delivery Completed', completed: hasCompletion },
  ];

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">My Active Trip</h1>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md space-y-6 border border-gray-200">
        <div>
          <h2 className="text-xl font-semibold mb-1">{trip.facility_name}</h2>
          <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-2">Current Status</p>
          <div className="inline-block bg-blue-50 text-blue-800 font-medium px-3 py-1 rounded-full text-sm">
            {stateText}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-4">Next Required Action</p>
          <Link
            href={ctaHref}
            className="block w-full text-center bg-blue-600 text-white py-4 px-4 rounded-md font-bold text-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            {ctaText}
          </Link>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-4">Delivery Progress</h3>
          <ul className="space-y-3">
            {stages.map((stage, index) => {
              const isCurrent = !stage.completed && (index === 0 || stages[index - 1].completed);
              let iconColor = "text-gray-300";
              let textColor = "text-gray-400";
              let icon = "○";
              
              if (stage.completed) {
                iconColor = "text-green-500";
                textColor = "text-gray-800 font-medium";
                icon = "✓";
              } else if (isCurrent) {
                iconColor = "text-blue-500 font-bold";
                textColor = "text-blue-800 font-bold";
                icon = "→";
              }

              return (
                <li key={stage.label} className="flex items-center space-x-3">
                  <span className={`w-5 text-center ${iconColor}`}>{icon}</span>
                  <span className={textColor}>{stage.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-4">Evidence Status</h3>
          <div className="bg-gray-50 p-4 rounded-md flex justify-between items-center border border-gray-200">
            <span className="text-gray-700 font-medium">Evidence Photos Collected</span>
            <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-sm font-bold">
              {photosCollected}
            </span>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-center">
          <Link href={`/timeline?tripId=${trip.id}`} className="text-gray-600 hover:text-gray-900 font-medium">
            View Trip Timeline
          </Link>
        </div>
      </div>
    </main>
  );
}
