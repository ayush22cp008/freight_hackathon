import { supabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';

function RoleBadge({ role }: { role: string }) {
  const isDriver = role === 'DRIVER';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isDriver ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isDriver ? 'bg-sky-400' : 'bg-violet-400'}`} />
      {role}
    </span>
  );
}

export default async function ReviewerQueuePage() {
  const { data: pendingIdentities } = await supabaseServer
    .from('freight_identities')
    .select('*')
    .eq('verification_status', 'PENDING')
    .order('created_at', { ascending: false });

  const { data: pendingEvidence } = await supabaseServer
    .from('onboarding_evidence')
    .select('*')
    .eq('status', 'PENDING');

  const pendingList = (pendingIdentities ?? []).map(identity => {
    const evidence = (pendingEvidence ?? []).find(e => e.auth_id === identity.auth_id);
    return { identity, evidence };
  }).filter(item => item.evidence);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Reviewer Dashboard</h1>
          {pendingList.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
              {pendingList.length} pending
            </span>
          )}
        </div>
        <p className="text-slate-400 text-sm">Applicants awaiting identity and evidence verification.</p>
      </div>

      {pendingList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">All clear</h2>
          <p className="text-slate-400 text-sm">No pending applications at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingList.map((item) => (
            <div
              key={item.identity.id}
              className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-slate-600 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-300 font-bold text-sm">
                  {(item.identity.email?.[0] ?? '?').toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-white font-medium text-sm truncate">{item.identity.email}</p>
                  <RoleBadge role={item.identity.requested_role} />
                </div>
                <p className="text-slate-500 text-xs">
                  Submitted {new Date(item.identity.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {item.evidence?.document_type === 'DRIVING_LICENCE' ? 'Driving Licence' : 'GST Document'}
                </p>
              </div>

              {/* Review CTA */}
              <Link
                href={`/reviewer/verify/${item.identity.id}`}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Review
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
