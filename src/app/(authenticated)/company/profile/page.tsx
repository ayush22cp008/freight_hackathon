import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Company Profile | DeliveryProof',
};

export default async function CompanyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: company } = await supabaseServer
    .from('companies')
    .select('id, name, created_at')
    .eq('auth_id', user.id)
    .single();

  if (!company) {
    redirect('/onboarding');
  }

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Company Profile</h1>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-500">Company Name</label>
          <div className="mt-1 text-lg font-semibold text-gray-900">{company.name}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Account ID</label>
          <div className="mt-1 text-md text-gray-700">{company.id}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Member Since</label>
          <div className="mt-1 text-md text-gray-700">{new Date(company.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </main>
  );
}
