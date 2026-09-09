import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const ITEMS_PER_PAGE = 20;

function StatusBadge({ status }: { status: string }) {
  const isVerified = status === 'VERIFIED';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      isVerified
        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
        : 'bg-red-500/15 text-red-300 border border-red-500/30'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {isVerified ? 'Verified' : 'Rejected'}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isDriver = role === 'DRIVER';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isDriver ? 'bg-sky-500/15 text-sky-300' : 'bg-violet-500/15 text-violet-300'
    }`}>
      {role}
    </span>
  );
}

export default async function VerificationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Total count for pagination
  const { count } = await supabaseServer
    .from('freight_identities')
    .select('*', { count: 'exact', head: true })
    .in('verification_status', ['VERIFIED', 'REJECTED']);

  const { data: completedIdentities } = await supabaseServer
    .from('freight_identities')
    .select('*')
    .in('verification_status', ['VERIFIED', 'REJECTED'])
    .order('reviewed_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  const totalPages = Math.ceil((count ?? 0) / ITEMS_PER_PAGE);
  const records = completedIdentities ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Verification History</h1>
          <p className="text-slate-400 text-sm mt-0.5">Completed verification records, newest first.</p>
        </div>
        <Link
          href="/reviewer/queue"
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Verification Queue
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-white font-semibold mb-1">No completed verification records yet.</h2>
          <p className="text-slate-500 text-sm mb-6">Completed verifications will appear here.</p>
          <Link
            href="/reviewer/queue"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Back to Verification Queue
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {records.map((item) => (
              <Link
                key={item.id}
                href={`/reviewer/history/${item.id}`}
                className="block bg-slate-900 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.verification_status === 'VERIFIED'
                      ? 'bg-emerald-500/15 border border-emerald-500/25'
                      : 'bg-red-500/15 border border-red-500/25'
                  }`}>
                    <span className={`font-bold text-sm ${item.verification_status === 'VERIFIED' ? 'text-emerald-300' : 'text-red-300'}`}>
                      {(item.email?.[0] ?? '?').toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-white font-medium text-sm truncate">{item.email}</p>
                      <RoleBadge role={item.requested_role} />
                      <StatusBadge status={item.verification_status} />
                    </div>
                    <p className="text-slate-500 text-xs">
                      Decision:{' '}
                      {item.reviewed_at
                        ? new Date(item.reviewed_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : '—'}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-sm">
                Page {page} of {totalPages} ({count} records)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/reviewer/history?page=${page - 1}`}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/reviewer/history?page=${page + 1}`}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
