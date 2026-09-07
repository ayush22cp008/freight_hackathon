'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TripInfo {
  id: string;
  destination_name: string | null;
}

export default function RecentCompletionBanner({ trip }: { trip: TripInfo }) {
  const [acknowledged, setAcknowledged] = useState(true); // Default to true to prevent hydration mismatch flash

  useEffect(() => {
    const isAcked = localStorage.getItem(`acked_completed_trip_${trip.id}`);
    setAcknowledged(!!isAcked);
  }, [trip.id]);

  if (acknowledged) {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-green-800 mb-2">Delivery Tasks Completed</h2>
      <p className="text-green-700 font-medium mb-4">
        Your recent delivery to <strong>{trip.destination_name || 'Destination'}</strong> has been fully completed.
      </p>
      <Link 
        href={`/timeline?tripId=${trip.id}`}
        className="inline-block bg-green-700 text-white font-medium py-2 px-6 rounded hover:bg-green-800 transition-colors"
      >
        View Recent Trip Timeline
      </Link>
    </div>
  );
}
