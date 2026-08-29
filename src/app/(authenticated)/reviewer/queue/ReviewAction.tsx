'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ReviewAction({ identityId, storagePath }: { identityId: string, storagePath?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedUrl, setSignedUrl] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const loadEvidence = async () => {
    if (!storagePath) return;
    try {
      const { data, error } = await supabase.storage
        .from('onboarding_evidence')
        .createSignedUrl(storagePath, 60); // 60 seconds

      if (error) {
        setError('Failed to load evidence URL.');
      } else if (data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      }
    } catch (err) {
      setError('An error occurred loading evidence.');
    }
  };

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    let rejection_reason = '';
    if (action === 'REJECT') {
      const reason = prompt('Please provide a reason for rejection:');
      if (reason === null) return; // cancelled
      if (!reason.trim()) {
        alert('A reason is required to reject.');
        return;
      }
      rejection_reason = reason.trim();
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity_id: identityId, action, rejection_reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      {!signedUrl ? (
        <button 
          onClick={loadEvidence}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          View Evidence Document
        </button>
      ) : (
        <div className="space-y-2">
          <a 
            href={signedUrl} 
            target="_blank" 
            rel="noreferrer"
            className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-200"
          >
            Open Document (Valid for 60s)
          </a>
        </div>
      )}

      <div className="flex space-x-3 mt-4">
        <button
          onClick={() => handleAction('APPROVE')}
          disabled={loading}
          className="bg-green-600 text-white rounded py-2 px-4 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400"
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={() => handleAction('REJECT')}
          disabled={loading}
          className="bg-red-600 text-white rounded py-2 px-4 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-400"
        >
          {loading ? 'Processing...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
