'use client';

import { useState } from 'react';

export default function PublicShareManager({ tripId, hasActiveShare }: { tripId: string, hasActiveShare: boolean }) {
  const [active, setActive] = useState(hasActiveShare);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateOrReplace = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/trips/${tripId}/public-share`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate share');
      }
      setPublicUrl(data.publicUrl);
      setActive(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this share? Any existing links will instantly stop working.')) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/public-share`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke share');
      }
      setPublicUrl(null);
      setActive(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-md">
      <h4 className="text-sm font-semibold text-blue-900 mb-2">Public Evidence Share</h4>
      
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      
      {publicUrl && (
        <div className="mb-3">
          <p className="text-xs text-green-700 mb-1 font-medium">Share generated successfully! Copy this link now (it will not be shown again):</p>
          <div className="flex gap-2 items-center">
            <input 
              type="text" 
              readOnly 
              value={publicUrl} 
              className="text-xs flex-1 p-2 border border-blue-200 rounded bg-white"
            />
            <button 
              onClick={handleCopy}
              className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        {!active ? (
          <button
            onClick={handleCreateOrReplace}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-white border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Create Public Share'}
          </button>
        ) : (
          <>
            <span className="text-xs text-gray-600 font-medium mr-2">
              Status: <span className="text-green-600">Active</span>
            </span>
            <button
              onClick={handleCreateOrReplace}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-white border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Replace Share'}
            </button>
            <button
              onClick={handleRevoke}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-white border border-red-600 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Revoke Share'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
