import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // 1. Verify caller is an authorized reviewer
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: reviewerCheck } = await supabaseServer
      .from('reviewer_authorizations')
      .select('auth_id')
      .eq('auth_id', user.id)
      .single();
    
    if (!reviewerCheck) {
      return NextResponse.json({ error: 'Forbidden. Reviewer access required.' }, { status: 403 });
    }

    // 2. Parse pagination and record-selection parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const id = searchParams.get('id'); // For fetching a single completed record

    // 3. Query completed identities with newest-first ordering on the decision timestamp
    let idQuery = supabaseServer
      .from('freight_identities')
      .select('*')
      .in('verification_status', ['VERIFIED', 'REJECTED'])
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });

    if (id) {
      idQuery = idQuery.eq('id', id);
    } else {
      idQuery = idQuery.range(offset, offset + limit - 1);
    }

    const { data: identities, error: idError } = await idQuery;
    if (idError) {
      return NextResponse.json({ error: 'Failed to fetch identities' }, { status: 500 });
    }

    if (!identities || identities.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 4. Fetch corresponding evidence references for these identities
    const authIds = identities.map(i => i.auth_id);
    const { data: evidences, error: evError } = await supabaseServer
      .from('onboarding_evidence')
      .select('*')
      .in('auth_id', authIds);

    if (evError) {
      return NextResponse.json({ error: 'Failed to fetch evidence' }, { status: 500 });
    }

    // 5. Stitch identities and evidence together to match the required Blueprint data shape
    const data = identities.map(identity => {
      const evidence = evidences?.find(e => e.auth_id === identity.auth_id);
      return {
        identity,
        evidence: evidence || null
      };
    });

    return NextResponse.json({ data });

  } catch (err) {
    console.error('Admin history read error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
