'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Trip = {
  id: string;
  facility_name: string;
  destination_name: string;
};

export default function CompanyRecentCompletions({ trips }: { trips: Trip[] }) {
  const [unackedTrips, setUnackedTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const unacked = trips.filter(trip => {
      const acked = localStorage.getItem(`acked_completed_trip_${trip.id}`);
      return !acked;
    });
    setUnackedTrips(unacked);
  }, [trips]);

  if (unackedTrips.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 text-green-700 flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Recently Completed
      </h2>
      <div className="grid gap-4">
        {unackedTrips.map(trip => (
          <div key={trip.id} className="border border-green-200 bg-green-50 rounded p-4 flex flex-col sm:flex-row justify-between sm:items-center">
            <div>
              <div className="font-bold text-gray-900">Your recent trip is finished</div>
              <div className="text-sm text-green-800 mt-1">
                Delivery from {trip.facility_name} has been fully completed.
              </div>
            </div>
            <Link 
              href={`/company/trips/${trip.id}`} 
              className="mt-3 sm:mt-0 bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 text-center shadow-sm"
            >
              View Completed Trip
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
