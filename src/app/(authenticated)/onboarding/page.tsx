import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getFreightIdentity } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await props.searchParams;
  const identity = await getFreightIdentity();

  if (!identity) {
    redirect('/login');
  }

  if (identity.verification_status !== 'PENDING' && identity.verification_status !== 'REJECTED') {
    redirect('/');
  }

  const supabase = await createClient();
  const { data: evidenceRows } = await supabase
    .from('onboarding_evidence')
    .select('*')
    .eq('auth_id', identity.auth_id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(1);

  const evidence = evidenceRows?.[0] ?? null;

  if (identity.verification_status === 'PENDING' && evidence) {
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
            <p><strong>Evidence Type:</strong> {evidence?.document_type || 'Unknown'}</p>
            <p><strong>Status:</strong> {evidence?.status || 'PENDING'}</p>
            {evidence?.rejection_reason && (
              <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
                <strong>Rejection Reason:</strong> {evidence?.rejection_reason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (identity.verification_status === 'REJECTED' && params.reupload !== 'true') {
    const { data: rejectedRows } = await supabase
      .from('onboarding_evidence')
      .select('*')
      .eq('auth_id', identity.auth_id)
      .eq('status', 'REJECTED')
      .order('created_at', { ascending: false })
      .limit(1);

    const rejectedEvidence = rejectedRows?.[0] ?? null;

    return (
      <div className="flex-grow flex items-center justify-center p-6 mt-16">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center border border-gray-200">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Application Rejected</h1>
          <p className="text-gray-600 mb-6">
            Your application was rejected.
          </p>
          {rejectedEvidence?.rejection_reason && (
            <div className="bg-red-50 text-red-800 p-4 rounded-md text-sm text-left mb-6">
              <strong>Rejection Reason:</strong>
              <p className="mt-1">{rejectedEvidence.rejection_reason}</p>
            </div>
          )}
          <Link
            href="/onboarding?reupload=true"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors"
          >
            Re-upload Evidence
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 mt-16">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-lg w-full border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {identity.verification_status === 'REJECTED' ? 'Re-upload Evidence' : 'Complete Onboarding'}
        </h1>
        <p className="text-gray-600 mb-6">
          You have requested to join as a <span className="font-semibold">{identity.requested_role}</span>. 
          Please provide the required verification details below.
        </p>
        <OnboardingForm requestedRole={identity.requested_role} authId={identity.auth_id} />
      </div>
    </div>
  );
}
