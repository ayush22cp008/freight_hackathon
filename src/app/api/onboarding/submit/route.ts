import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const identity = await getFreightIdentity();
    
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (identity.verification_status !== 'PENDING') {
      return NextResponse.json({ error: 'Account is not in pending status' }, { status: 400 });
    }

    const { document_type, storage_path, mime_type, size_bytes } = await request.json();

    if (!document_type || !storage_path) {
      return NextResponse.json({ error: 'Document type and storage path are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Check if there is an existing submission
    const { data: existing } = await supabase
      .from('onboarding_evidence')
      .select('version')
      .eq('auth_id', identity.auth_id)
      .single();

    let newVersion = 1;
    if (existing) {
      newVersion = (existing.version || 1) + 1;
      // Delete old evidence record so we can insert new (or we could update, but deleting/inserting keeps it simple if using UPSERT, but we don't have UPSERT by default unless using unique constraint. Let's just delete first)
      await supabase.from('onboarding_evidence').delete().eq('auth_id', identity.auth_id);
    }
    
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
