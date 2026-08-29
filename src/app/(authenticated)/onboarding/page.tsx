import { redirect } from 'next/navigation';
import { getFreightIdentity } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  const identity = await getFreightIdentity();

  if (!identity) {
    redirect('/login');
  }

  if (identity.verification_status !== 'PENDING') {
    redirect('/');
  }

  const supabase = await createClient();
  const { data: evidence } = await supabase
    .from('onboarding_evidence')
    .select('*')
    .eq('auth_id', identity.auth_id)
    .single();

  if (evidence) {
    return (
      <div className="flex-grow flex items-center justify-center p-6 mt-16">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Pending Verification</h1>
          <p className="text-gray-600 mb-6">
            Your evidence has been submitted and is currently under review. 
            You will be granted access to the application once an administrator verifies your identity.
          </p>
          <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm text-left space-y-2">
            <p><strong>Role Requested:</strong> {identity.requested_role}</p>
            <p><strong>Evidence Type:</strong> {evidence.document_type}</p>
            <p><strong>Status:</strong> {evidence.status}</p>
            {evidence.rejection_reason && (
              <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
                <strong>Rejection Reason:</strong> {evidence.rejection_reason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 mt-16">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Onboarding</h1>
        <p className="text-gray-600 mb-6">
          You have requested to join as a <span className="font-semibold">{identity.requested_role}</span>. 
          Please provide the required verification details below.
        </p>
        <OnboardingForm requestedRole={identity.requested_role} authId={identity.auth_id} />
      </div>
    </div>
  );
}
