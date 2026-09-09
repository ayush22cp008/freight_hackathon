'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type EvidenceRecord = {
  id: string;
  auth_id: string;
  document_type: string;
  storage_path: string;
  status: string;
  rejection_reason?: string | null;
  mime_type?: string | null;
};

export default function EvidenceViewerClient({ evidence }: { evidence: EvidenceRecord | null }) {
  const supabase = createClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const docLabel = evidence?.document_type === 'LICENSE' ? 'Driving Licence' : evidence?.document_type === 'GST' ? 'GST Document' : evidence?.document_type ?? 'Document';

  const loadEvidence = async () => {
    if (!evidence?.storage_path) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: storageError } = await supabase.storage
        .from('onboarding_evidence')
        .createSignedUrl(evidence.storage_path, 120);
      if (storageError || !data?.signedUrl) {
        setError('Could not load evidence. Please try again.');
      } else {
        setSignedUrl(data.signedUrl);
      }
    } catch {
      setError('Unexpected error loading evidence.');
    } finally {
      setLoading(false);
    }
  };

  if (!evidence) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
        No evidence document found for this record.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Document: {docLabel}</p>
        {!signedUrl && (
          <button
            onClick={loadEvidence}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
            {loading ? 'Loading…' : 'Load Evidence'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-red-300 text-sm font-medium">Evidence load error</p>
            <p className="text-slate-400 text-xs mt-0.5">{error}</p>
            <button onClick={loadEvidence} className="text-indigo-400 text-xs mt-1 hover:underline">Retry</button>
          </div>
        </div>
      )}

      {signedUrl ? (
        <div className="space-y-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <iframe src={signedUrl} className="w-full h-96 rounded-xl" title="Submitted Evidence Viewer" />
          </div>
          <div className="flex gap-2">
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in new tab
            </a>
            <button
              onClick={loadEvidence}
              className="text-slate-400 hover:text-white text-xs border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              Refresh URL
            </button>
          </div>
          <p className="text-slate-600 text-xs">Evidence is view-only. No decision actions are available from completed records.</p>
        </div>
      ) : (
        !loading && (
          <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-8 text-center">
            <svg className="w-10 h-10 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-sm">Click <strong className="text-slate-400">Load Evidence</strong> to view the submitted document.</p>
          </div>
        )
      )}
    </div>
  );
}
