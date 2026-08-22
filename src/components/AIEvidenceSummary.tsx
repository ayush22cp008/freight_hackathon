'use client';

import { useState } from 'react';

export default function AIEvidenceSummary() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch('/api/summary', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI summary.');
      }

      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Network or unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">AI Evidence Summary</h2>
      
      {!summary && !loading && (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Generate a secure, factual AI summary of this trip based on the verified deterministic evidence.
          </p>
          <button
            onClick={generateSummary}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded font-medium hover:bg-purple-700 transition-colors"
          >
            Generate AI Summary
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-purple-600 font-medium animate-pulse">Analyzing deterministic evidence...</p>
        </div>
      )}

      {error && (
        <div className="text-red-700 bg-red-50 p-4 rounded border border-red-200">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-3 text-sm font-medium text-red-600 hover:underline"
          >
            Try Again
          </button>
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded border border-gray-100 whitespace-pre-wrap">
            {summary}
          </div>
          <button
            onClick={generateSummary}
            className="text-purple-600 text-sm font-medium hover:underline"
          >
            Regenerate Summary
          </button>
        </div>
      )}
    </div>
  );
}
