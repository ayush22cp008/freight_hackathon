'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClaimTripButton({ tripId }: { tripId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleClaim = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/trips/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to claim trip');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        onClick={handleClaim}
        disabled={loading}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Claiming...' : 'Claim Trip'}
      </button>
    </div>
  );
}
