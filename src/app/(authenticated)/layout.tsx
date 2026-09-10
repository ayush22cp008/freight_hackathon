import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';
import Navbar from './Navbar';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/login');
  }

  const identity = await getFreightIdentity();
  let userRole: 'DRIVER' | 'COMPANY' | 'REVIEWER' | null = null;

  const { data: reviewerAuth } = await supabase
    .from('reviewer_authorizations')
    .select('auth_id')
    .eq('auth_id', data.user.id)
    .single();

  if (reviewerAuth) {
    userRole = 'REVIEWER';
  } else if (identity) {
    if (identity.trusted_role === 'COMPANY') {
      userRole = 'COMPANY';
    } else {
      userRole = 'DRIVER';
    }
  }

  if (!identity && !reviewerAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500">Identity not found. Please contact support.</p>
      </div>
    );
  }

  if (identity && identity.verification_status === 'REJECTED') {
    const { data: evidence } = await supabase
      .from('onboarding_evidence')
      .select('rejection_reason')
      .eq('auth_id', data.user.id)
      .single();

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar userEmail={data.user.email} role={userRole} />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Application Rejected</h1>
            {evidence?.rejection_reason ? (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-left">
                <h2 className="text-red-800 font-semibold mb-1 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Reason
                </h2>
                <p className="text-red-700 text-sm">{evidence.rejection_reason}</p>
              </div>
            ) : (
              <p className="text-gray-600">
                Unfortunately, your verification request has been rejected. Please contact support for more details.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Allow layout to render children.
  // The /onboarding page itself checks verification_status and handles the PENDING flow.
  // We'll let the child page handle redirecting if the user shouldn't be there.

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar userEmail={data.user.email} role={userRole} />
      {children}
    </div>
  );
}
