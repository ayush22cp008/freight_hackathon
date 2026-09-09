import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import CompanyHistoryClient from './CompanyHistoryClient';

export const metadata = {
  title: 'History | Freight Company',
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: company } = await supabaseServer
    .from('companies')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!company) {
    redirect('/onboarding');
  }

  // Fetch trips where the company was either the creator or the receiver and status is completed
  const { data: completedTrips } = await supabaseServer
    .from('trips')
    .select('id, facility_name, destination_name, status, created_at, company_id, receiving_company_id')
    .or(`company_id.eq.${company.id},receiving_company_id.eq.${company.id}`)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <CompanyHistoryClient trips={completedTrips || []} currentCompanyId={company.id} />
    </main>
  );
}
