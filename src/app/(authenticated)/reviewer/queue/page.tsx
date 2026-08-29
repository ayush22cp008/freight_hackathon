import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import ReviewAction from './ReviewAction';

export default async function ReviewerQueuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check reviewer authorization
  const { data: reviewerAuth } = await supabaseServer
    .from('reviewer_authorizations')
    .select('auth_id')
    .eq('auth_id', user.id)
    .single();

  if (!reviewerAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have reviewer permissions.</p>
        </div>
      </div>
    );
  }

  // Fetch pending applications (joining evidence and identities)
  // For simplicity since Supabase doesn't support complex joins seamlessly across different FKs sometimes,
  // we'll fetch evidence where status = PENDING and get the email from auth.users (requires service role)
  // Or simply fetch from freight_identities where verification_status = PENDING
  
  const { data: pendingIdentities } = await supabaseServer
    .from('freight_identities')
    .select('*')
    .eq('verification_status', 'PENDING');

  const { data: pendingEvidence } = await supabaseServer
    .from('onboarding_evidence')
    .select('*')
    .eq('status', 'PENDING');

  const pendingList = pendingIdentities?.map(identity => {
    const evidence = pendingEvidence?.find(e => e.auth_id === identity.auth_id);
    return {
      identity,
      evidence
    };
  }).filter(item => item.evidence) || [];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Reviewer Queue</h1>
      
      {pendingList.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <p className="text-gray-600">No pending applications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingList.map((item) => (
            <div key={item.identity.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{item.identity.email}</h2>
                  <p className="text-gray-600">Requested Role: <span className="font-semibold">{item.identity.requested_role}</span></p>
                  <p className="text-gray-600 text-sm">Evidence Type: {item.evidence?.document_type}</p>
                  <p className="text-gray-600 text-sm">Mime Type: {item.evidence?.mime_type}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <ReviewAction 
                  identityId={item.identity.id} 
                  storagePath={item.evidence?.storage_path} 
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
