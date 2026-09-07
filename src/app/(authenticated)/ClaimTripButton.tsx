'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ClaimTripButton({ tripId }: { tripId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClaimed, setIsClaimed] = useState(false);
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

      setIsClaimed(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isClaimed) {
    return (
      <div className="text-center bg-green-50 p-6 rounded-lg border border-green-200 w-full">
        <h3 className="text-lg font-bold text-green-800 mb-2">Trip Successfully Claimed</h3>
        <p className="text-green-700 mb-6">Your trip is now active. Continue your delivery from My Active Trip.</p>
        <Link
          href="/driver/active"
          className="inline-block bg-green-700 text-white font-medium py-3 px-6 rounded-md hover:bg-green-800 transition-colors"
        >
          Go to My Active Trip
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="text-red-600 text-sm mb-2 text-center">{error}</p>}
      <button
        onClick={handleClaim}
        disabled={loading}
        className="bg-blue-600 text-white font-bold py-3 px-12 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Claiming...' : 'Claim Trip'}
      </button>
    </div>
  );
}
