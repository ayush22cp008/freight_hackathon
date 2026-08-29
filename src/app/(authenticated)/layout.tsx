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

  if (!identity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-500">Identity not found. Please contact support.</p>
      </div>
    );
  }

  if (identity.verification_status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar userEmail={data.user.email} />
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Application Rejected</h1>
            <p className="text-gray-600">
              Unfortunately, your verification request has been rejected. Please contact support for more details.
            </p>
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
      <Navbar userEmail={data.user.email} />
      {children}
    </div>
  );
}
