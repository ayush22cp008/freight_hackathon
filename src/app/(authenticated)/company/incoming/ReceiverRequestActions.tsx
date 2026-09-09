'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceiverRequestActions({ requestId, tripId }: { requestId: string, tripId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: 'accept' | 'reject') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/receiver-request/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reason: action === 'reject' ? 'Rejected by receiver' : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to perform action');
      } else {
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-3">
        <button
          onClick={() => handleAction('accept')}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Accept Request'}
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="bg-red-100 text-red-700 px-4 py-2 rounded font-medium hover:bg-red-200 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
