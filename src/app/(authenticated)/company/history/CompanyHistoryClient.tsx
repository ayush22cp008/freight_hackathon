'use client';

import { useState } from 'react';
import Link from 'next/link';

type Trip = {
  id: string;
  facility_name: string;
  destination_name: string;
  status: string;
  created_at: string;
  company_id: string;
  receiving_company_id: string;
};

type FilterOption = 'All' | 'Sent' | 'Received';

export default function CompanyHistoryClient({ trips, currentCompanyId }: { trips: Trip[], currentCompanyId: string }) {
  const [filter, setFilter] = useState<FilterOption>('All');

  const filteredTrips = trips.filter(trip => {
    if (filter === 'All') return true;
    if (filter === 'Sent') return trip.company_id === currentCompanyId;
    if (filter === 'Received') return trip.receiving_company_id === currentCompanyId;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">History & Timeline</h1>
        
        <div className="flex bg-gray-100 p-1 rounded-md">
          {(['All', 'Sent', 'Received'] as FilterOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                filter === option 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {!filteredTrips || filteredTrips.length === 0 ? (
        <p className="text-gray-500">You have no completed trips matching this filter.</p>
      ) : (
        <div className="grid gap-4">
          {filteredTrips.map(trip => {
            const isSender = trip.company_id === currentCompanyId;
            const relationshipLabel = isSender ? 'Sent' : 'Received';

            return (
              <Link key={trip.id} href={`/company/trips/${trip.id}`} className="block">
                <div className="border border-gray-200 bg-white rounded p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {trip.facility_name} → {trip.destination_name}
                      </h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <p className="text-sm text-gray-500">
                          Completed on {new Date(trip.created_at).toLocaleDateString()}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {relationshipLabel}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
