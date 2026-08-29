import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const identity = await getFreightIdentity();
  if (!identity || identity.trusted_role !== 'COMPANY' || identity.verification_status !== 'VERIFIED') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Workstream B: Fetch minimal company details for receiving company lookup
  const { data, error } = await supabaseServer
    .from('companies')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json({ companies: data });
}
