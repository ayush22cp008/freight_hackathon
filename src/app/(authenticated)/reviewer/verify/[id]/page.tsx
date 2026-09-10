import { notFound, redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import ApplicantVerificationClient from './ApplicantVerificationClient';

export default async function VerifyApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: identity, error: idErr } = await supabaseServer
    .from('freight_identities')
    .select('*')
    .eq('id', id)
    .single();

  if (idErr || !identity) return notFound();

  // Only allow verification of PENDING applicants
  if (identity.verification_status !== 'PENDING') {
    redirect('/reviewer/queue');
  }

  const { data: evidenceRows } = await supabaseServer
    .from('onboarding_evidence')
    .select('*')
    .eq('auth_id', identity.auth_id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(1);

  const evidence = evidenceRows?.[0] ?? null;

  return (
    <ApplicantVerificationClient
      identity={identity}
      evidence={evidence ?? null}
    />
  );
}
