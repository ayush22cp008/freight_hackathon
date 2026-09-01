'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceiverCompletionClient({ 
  tripId, 
  destinationName,
  driverName,
  driverConfirmed
}: { 
  tripId: string; 
  destinationName: string;
  driverName: string;
  driverConfirmed: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const res = await fetch('/api/completion/receiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit receiver confirmation');
      }

      setSuccess(data.state);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="bg-green-100 text-green-800 p-6 rounded-lg shadow border border-green-200">
          <h2 className="text-2xl font-bold mb-2">Receipt Confirmation Recorded!</h2>
          {success.status === 'completed' ? (
            <p>The driver has also confirmed. The trip is now fully <strong>COMPLETED</strong>.</p>
          ) : (
            <p>Your confirmation has been saved. <strong>Waiting for the driver to confirm</strong> before the trip is fully completed.</p>
          )}
          <button 
            onClick={() => router.push('/')}
            className="mt-6 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Confirm Delivery Received</h1>
      
      <div className="bg-white p-6 rounded-lg shadow space-y-4 border border-gray-200">
        <p className="text-gray-700">
          You are confirming that the goods have been successfully delivered to <strong>{destinationName}</strong> by driver <strong>{driverName}</strong>.
        </p>

        {driverConfirmed ? (
          <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm border border-blue-200">
            ℹ️ The driver has already confirmed completion. Submitting this will fully complete the trip.
          </div>
        ) : (
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm border border-yellow-200">
            ⚠️ The driver has not yet confirmed completion. The trip will remain in progress until they do.
          </div>
        )}

        {error && <div className="text-red-700 bg-red-50 p-3 rounded border border-red-200">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {loading ? 'Confirming...' : 'Confirm Delivery Received'}
        </button>
      </div>
    </div>
  );
}
