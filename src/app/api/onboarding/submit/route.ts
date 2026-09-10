import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const identity = await getFreightIdentity();
    
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (identity.verification_status !== 'PENDING' && identity.verification_status !== 'REJECTED') {
      return NextResponse.json({ error: 'Account is not in a valid state for submission' }, { status: 400 });
    }

    const { document_type, storage_path, mime_type, size_bytes } = await request.json();

    if (!document_type || !storage_path) {
      return NextResponse.json({ error: 'Document type and storage path are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { supabaseServer } = await import('@/lib/supabase-server');
    
    // Check if there is an existing submission (safely handle multiple previous submissions)
    const { data: existingRecords } = await supabase
      .from('onboarding_evidence')
      .select('version')
      .eq('auth_id', identity.auth_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const existing = existingRecords?.[0];
    const newVersion = existing ? (existing.version || 1) + 1 : 1;

    // Do NOT delete the old evidence. It is required for Reviewer History integrity.
    
    // Insert new evidence row for the current submission
    const { error } = await supabase
      .from('onboarding_evidence')
      .insert({
        auth_id: identity.auth_id,
        role_type: identity.requested_role,
        document_type,
        storage_path,
        mime_type,
        size_bytes,
        version: newVersion,
        status: 'PENDING'
      });

    if (error) {
      console.error('Evidence submission error:', error);
      return NextResponse.json({ error: 'Failed to submit evidence' }, { status: 500 });
    }

    if (identity.verification_status === 'REJECTED') {
      // Must use service role because users do not have UPDATE privileges on their identity
      const { error: idError } = await supabaseServer
        .from('freight_identities')
        .update({
          verification_status: 'PENDING',
          reviewed_at: null
        })
        .eq('id', identity.id);

      if (idError) {
        console.error('Identity status update error:', idError);
        return NextResponse.json({ error: 'Failed to update identity status. Please contact support.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
