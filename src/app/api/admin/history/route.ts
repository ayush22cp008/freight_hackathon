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

    // 3. Query reviewer_decisions with newest-first ordering
    let historyQuery = supabaseServer
      .from('reviewer_decisions')
      .select(`
        *,
        identity:freight_identities(*),
        evidence:onboarding_evidence(*)
      `)
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });

    if (id) {
      historyQuery = historyQuery.eq('identity_id', id);
    } else {
      historyQuery = historyQuery.range(offset, offset + limit - 1);
    }

    const { data: decisions, error: historyError } = await historyQuery;
    if (historyError) {
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    if (!decisions || decisions.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 4. Transform to match the required Blueprint data shape
    const data = decisions.map((decision: any) => {
      return {
        decision_id: decision.id,
        decision_status: decision.decision,
        reviewed_at: decision.reviewed_at,
        identity: decision.identity,
        evidence: decision.evidence || null
      };
    });

    return NextResponse.json({ data });

  } catch (err) {
    console.error('Admin history read error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
