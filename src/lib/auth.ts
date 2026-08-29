import { createClient } from '@/lib/supabase/server';

export type FreightIdentity = {
  id: string;
  auth_id: string;
  requested_role: string;
  verification_status: 'PENDING' | 'REJECTED' | 'VERIFIED';
  trusted_role: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export async function getFreightIdentity(): Promise<FreightIdentity | null> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return null;
  }

  const { data: identity, error: identityError } = await supabase
    .from('freight_identities')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (identityError || !identity) {
    return null;
  }

  return identity as FreightIdentity;
}
