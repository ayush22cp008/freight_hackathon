import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';
import EvidenceViewerClient from './EvidenceViewerClient';

export default async function VerificationRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: identity, error } = await supabaseServer
    .from('freight_identities')
    .select('*')
    .eq('id', id)
    .in('verification_status', ['VERIFIED', 'REJECTED'])
    .single();

  if (error || !identity) return notFound();

  const { data: evidence } = await supabaseServer
    .from('onboarding_evidence')
    .select('*')
    .eq('auth_id', identity.auth_id)
    .single();

  const isVerified = identity.verification_status === 'VERIFIED';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back nav */}
      <Link
        href="/reviewer/history"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Verification History
      </Link>

      {/* Read-only badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Read-only Verification Record
        </span>
      </div>

      {/* Applicant Info Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isVerified ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <span className={`font-bold text-lg ${isVerified ? 'text-emerald-300' : 'text-red-300'}`}>
              {(identity.email?.[0] ?? '?').toUpperCase()}
            </span>
          </div>
          <div className="flex-grow">
            <h1 className="text-xl font-bold text-white mb-2">{identity.email}</h1>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                identity.requested_role === 'DRIVER'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
              }`}>
                Claimed Role: {identity.requested_role}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isVerified
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-300 border border-red-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {isVerified ? 'Verified' : 'Rejected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Details Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 mb-4">
        <h2 className="text-white font-semibold mb-4">Decision Details</h2>
        <dl className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <dt className="text-slate-500 text-sm w-40">Final Decision</dt>
            <dd className={`text-sm font-semibold ${isVerified ? 'text-emerald-300' : 'text-red-300'}`}>
              {isVerified ? 'Approved — Identity Verified' : 'Rejected'}
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <dt className="text-slate-500 text-sm w-40">Decision Date/Time</dt>
            <dd className="text-slate-200 text-sm">
              {identity.reviewed_at
                ? new Date(identity.reviewed_at).toLocaleString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })
                : '—'}
            </dd>
          </div>
          {!isVerified && (
            <div className="flex flex-col gap-1 pt-2">
              <dt className="text-slate-500 text-sm">Rejection Reason</dt>
              <dd className="mt-1 bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-3 text-slate-200 text-sm">
                {evidence?.rejection_reason || 'No reason recorded.'}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Submitted Evidence Viewer Card */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Submitted Evidence</h2>
        <EvidenceViewerClient evidence={evidence ?? null} />
      </div>
    </div>
  );
}
