import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Public Evidence Verification | Freight',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

async function getVerificationData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    const res = await fetch(`${baseUrl}/api/public/verify/${token}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      return null;
    }
    
    return await res.json();
  } catch (e) {
    return null;
  }
}

export default async function PublicSharePage({ params }: { params: { token: string } }) {
  const data = await getVerificationData(params.token);

  if (!data) {
    // Generic unavailable state for invalid/revoked/malformed/nonexistent
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        
        {/* Header */}
        <div className="border-b pb-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {data.company.name}
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Read-Only Verification
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            This is a secure, live representation of recorded delivery evidence.
          </p>
        </div>

        {/* Trip Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{data.trip.status}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Delivery Date</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {data.trip.deliveryDate ? new Date(data.trip.deliveryDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Pickup</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">{data.trip.pickupCity}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500">Destination</h3>
            <p className="mt-1 text-lg font-semibold text-gray-900">{data.trip.destinationCity}</p>
          </div>
        </div>

        {/* Evidence Status */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Evidence Status: {data.evidence.state}</h2>
          <ul className="space-y-3">
            <li className="flex items-center text-sm">
              <span className={`mr-2 flex-shrink-0 h-5 w-5 ${data.evidence.checklist.arrivalRecorded ? 'text-green-500' : 'text-gray-300'}`}>
                {data.evidence.checklist.arrivalRecorded ? '✓' : '○'}
              </span>
              Arrival Recorded
            </li>
            <li className="flex items-center text-sm">
              <span className={`mr-2 flex-shrink-0 h-5 w-5 ${data.evidence.checklist.checkinRecorded ? 'text-green-500' : 'text-gray-300'}`}>
                {data.evidence.checklist.checkinRecorded ? '✓' : '○'}
              </span>
              Check-in Recorded
            </li>
            <li className="flex items-center text-sm">
              <span className={`mr-2 flex-shrink-0 h-5 w-5 ${data.evidence.checklist.departureRecorded ? 'text-green-500' : 'text-gray-300'}`}>
                {data.evidence.checklist.departureRecorded ? '✓' : '○'}
              </span>
              Departure Recorded
            </li>
          </ul>
        </div>

        {/* AI Summary */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-2">AI Evidence Summary</h2>
          <p className="text-sm text-blue-800 mb-4 text-xs italic">
            * Recorded evidence is primary. This summary is automatically generated from available timeline events.
          </p>
          <div className="text-gray-800 text-sm whitespace-pre-wrap">
            {data.aiSummary}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Event Timeline</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {data.timeline.map((event: any, eventIdx: number) => (
                <li key={eventIdx}>
                  <div className="relative pb-8">
                    {eventIdx !== data.timeline.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                          <span className="text-white text-xs text-center">{eventIdx + 1}</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            {event.type} <span className="text-gray-900">{event.location}</span>
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
