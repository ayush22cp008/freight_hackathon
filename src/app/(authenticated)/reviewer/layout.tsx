import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseServer } from '@/lib/supabase-server';
import ReviewerNavbar from './ReviewerNavbar';

export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/login');
  }

  const { data: reviewerAuth } = await supabaseServer
    .from('reviewer_authorizations')
    .select('auth_id')
    .eq('auth_id', data.user.id)
    .single();

  if (!reviewerAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">You do not have reviewer permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <ReviewerNavbar userEmail={data.user.email} />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
