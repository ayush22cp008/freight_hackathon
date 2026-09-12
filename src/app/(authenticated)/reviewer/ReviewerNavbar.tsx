'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function ReviewerNavbar({ userEmail }: { userEmail?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isQueue = pathname === '/reviewer/queue' || pathname?.startsWith('/reviewer/verify');
  const isHistory = pathname?.startsWith('/reviewer/history');

  return (
    <nav className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand + Nav Links */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">DeliveryProof <span className="text-indigo-400 font-normal text-sm">Reviewer</span></span>
            </div>

            {/* Navigation links */}
            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/reviewer/queue"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isQueue
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Verification Queue
              </Link>
              <Link
                href="/reviewer/history"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isHistory
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verification History
              </Link>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-slate-500 text-sm hidden sm:block">{userEmail}</span>
            )}
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex gap-2 pb-3">
          <Link
            href="/reviewer/queue"
            className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
              isQueue ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Queue
          </Link>
          <Link
            href="/reviewer/history"
            className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors ${
              isHistory ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            History
          </Link>
        </div>
      </div>
    </nav>
  );
}
