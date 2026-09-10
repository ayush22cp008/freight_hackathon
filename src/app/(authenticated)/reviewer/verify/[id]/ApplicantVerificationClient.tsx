'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

type IdentityRecord = {
  id: string;
  auth_id: string;
  email: string;
  requested_role: string;
  verification_status: string;
};

type Props = {
  identity: IdentityRecord;
  evidence: EvidenceRecord | null;
};

type DecisionState = 'idle' | 'verified' | 'processing' | 'success' | 'error';
type DecisionOutcome = 'APPROVE' | 'REJECT' | null;

export default function ApplicantVerificationClient({ identity, evidence }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [identityVerified, setIdentityVerified] = useState(false);
  const [decisionState, setDecisionState] = useState<DecisionState>('idle');
  const [decisionOutcome, setDecisionOutcome] = useState<DecisionOutcome>(null);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Approve confirm modal
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Evidence viewer
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');

  // Server error
  const [serverError, setServerError] = useState('');
  const [resultData, setResultData] = useState<{ status: string; email: string; role: string; reason?: string } | null>(null);

  const loadEvidence = async () => {
    if (!evidence?.storage_path) return;
    setEvidenceLoading(true);
    setEvidenceError('');
    try {
      const { data, error } = await supabase.storage
        .from('onboarding_evidence')
        .createSignedUrl(evidence.storage_path, 120);
      if (error || !data?.signedUrl) {
        setEvidenceError('Could not load evidence document. Please try again.');
      } else {
        setSignedUrl(data.signedUrl);
      }
    } catch {
      setEvidenceError('An unexpected error occurred while loading evidence.');
    } finally {
      setEvidenceLoading(false);
    }
  };

  const submitDecision = async (action: 'APPROVE' | 'REJECT', rejectionReason?: string) => {
    setDecisionState('processing');
    setDecisionOutcome(action);
    setServerError('');
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_id: identity.id,
          action,
          rejection_reason: rejectionReason ?? '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Decision failed');
      }
      setResultData({
        status: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED',
        email: identity.email,
        role: identity.requested_role,
        reason: rejectionReason,
      });
      setDecisionState('success');
    } catch (err: any) {
      setServerError(err.message || 'Server error. The applicant remains in Pending Verification.');
      setDecisionState('error');
      setDecisionOutcome(null);
    }
  };

  const handleApproveConfirm = () => {
    setShowApproveModal(false);
    submitDecision('APPROVE');
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      setRejectError('A rejection reason is required.');
      return;
    }
    setShowRejectModal(false);
    submitDecision('REJECT', rejectReason.trim());
  };

  const docLabel = evidence?.document_type === 'DRIVING_LICENCE' ? 'Driving Licence' : evidence?.document_type === 'GST' ? 'GST Document' : evidence?.document_type ?? 'Document';

  // --- Success / Decision Result State ---
  if (decisionState === 'success' && resultData) {
    const isVerified = resultData.status === 'VERIFIED';
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-10 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
            isVerified ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-red-500/15 border border-red-500/30'
          }`}>
            {isVerified ? (
              <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isVerified ? 'text-emerald-300' : 'text-red-300'}`}>
            {isVerified ? 'Applicant Verified' : 'Applicant Rejected'}
          </h2>
          <p className="text-slate-300 font-medium">{resultData.email}</p>
          <p className="text-slate-500 text-sm mt-1">Claimed Role: {resultData.role}</p>
          {!isVerified && resultData.reason && (
            <div className="mt-4 bg-red-900/20 border border-red-700/30 rounded-xl px-5 py-3 text-left">
              <p className="text-red-300 text-xs font-semibold uppercase tracking-wider mb-1">Rejection Reason</p>
              <p className="text-slate-300 text-sm">{resultData.reason}</p>
            </div>
          )}
          <button
            onClick={() => router.push('/reviewer/queue')}
            className="mt-8 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Verification Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back nav */}
      <button
        onClick={() => router.push('/reviewer/queue')}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Verification Queue
      </button>

      {/* Processing overlay */}
      {decisionState === 'processing' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">Processing decision…</p>
            <p className="text-slate-400 text-sm mt-1">Please wait, do not close this page.</p>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-300 font-bold text-lg">{(identity.email?.[0] ?? '?').toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{identity.email}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                identity.requested_role === 'DRIVER'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
              }`}>
                Claimed Role: {identity.requested_role}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Pending Verification
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Examination Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">Evidence Examination</h2>
            <p className="text-slate-400 text-xs mt-0.5">Document: {docLabel}</p>
          </div>
          {!signedUrl && (
            <button
              onClick={loadEvidence}
              disabled={evidenceLoading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {evidenceLoading ? (
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
              {evidenceLoading ? 'Loading…' : 'Load Evidence'}
            </button>
          )}
        </div>

        {evidenceError && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-300 text-sm font-medium">Evidence load error</p>
              <p className="text-slate-400 text-xs mt-0.5">{evidenceError}</p>
              <button onClick={loadEvidence} className="text-indigo-400 text-xs mt-1 hover:underline">Retry</button>
            </div>
          </div>
        )}

        {!evidence && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
            No evidence document found for this applicant.
          </div>
        )}

        {signedUrl && (
          <div className="space-y-3">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <iframe
                src={signedUrl}
                className="w-full h-96 rounded-xl"
                title="Evidence Document Viewer"
              />
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
          </div>
        )}

        {!signedUrl && !evidenceError && !evidenceLoading && evidence && (
          <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-8 text-center">
            <svg className="w-10 h-10 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-sm">Click <strong className="text-slate-400">Load Evidence</strong> to examine the submitted document.</p>
          </div>
        )}
      </div>

      {/* Identity / Role Verification Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 mb-4">
        <h2 className="text-white font-semibold mb-1">Identity / Role Verification</h2>
        <p className="text-slate-400 text-sm mb-4">
          After examining the evidence, confirm whether it supports the applicant&apos;s claimed identity and role. This is a human verification step — it does not alter the applicant&apos;s status.
        </p>

        {!identityVerified ? (
          <button
            onClick={() => setIdentityVerified(true)}
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Confirm: Identity / Role Verified
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-emerald-300 font-semibold text-sm">Identity / Role Verified</span>
            </div>
            <button
              onClick={() => setIdentityVerified(false)}
              className="text-slate-500 hover:text-slate-300 text-xs ml-3 transition-colors"
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {/* Decision Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-1">Final Decision</h2>
        <p className="text-slate-400 text-sm mb-4">
          {identityVerified
            ? 'You may now approve or reject this applicant. The decision is permanent.'
            : 'Complete the Identity / Role Verification step above before making a final decision.'}
        </p>

        {serverError && decisionState === 'error' && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 mb-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-300 text-sm font-medium">Decision failed</p>
              <p className="text-slate-400 text-xs mt-0.5">{serverError} The applicant remains in Pending Verification.</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowApproveModal(true)}
            disabled={!identityVerified || decisionState === 'processing'}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </button>
          <button
            onClick={() => { setRejectReason(''); setRejectError(''); setShowRejectModal(true); }}
            disabled={decisionState === 'processing'}
            className="flex items-center gap-2 bg-red-700/30 hover:bg-red-700/50 border border-red-700/50 text-red-300 font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        </div>
        {!identityVerified && (
          <p className="text-slate-600 text-xs mt-3">Approve is disabled until Identity / Role Verification is confirmed.</p>
        )}
      </div>

      {/* Approve Confirm Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-white font-bold text-lg mb-2">Confirm Approval</h3>
            <p className="text-slate-400 text-sm mb-1">You are approving:</p>
            <p className="text-white font-medium mb-1">{identity.email}</p>
            <p className="text-slate-400 text-sm mb-6">Claimed Role: <span className="text-white">{identity.requested_role}</span></p>
            <p className="text-amber-300 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-6">
              This action is permanent and will grant the applicant their requested role.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleApproveConfirm}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Confirm Approval
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-white font-bold text-lg mb-2">Reject Applicant</h3>
            <p className="text-slate-400 text-sm mb-4">{identity.email} — {identity.requested_role}</p>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => { setRejectReason(e.target.value); setRejectError(''); }}
              placeholder="Provide a clear reason for rejection (e.g. document is blurry, name mismatch, expired licence)…"
              rows={4}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none mb-2"
            />
            {rejectError && <p className="text-red-400 text-xs mb-3">{rejectError}</p>}
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleRejectConfirm}
                className="flex-1 bg-red-700 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
