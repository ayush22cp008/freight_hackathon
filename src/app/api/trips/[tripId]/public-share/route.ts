import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseServer } from '@/lib/supabase-server';
import { generateSecureToken, hashToken } from '@/lib/public-share';

// POST: Create or replace a public share for a trip
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const supabase = await createClient();
    
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Check COMPANY role & trip ownership
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('id')
      .eq('auth_id', user.id)
      .single();
      
    if (companyErr || !company) {
      return NextResponse.json({ error: 'Forbidden: Company role required' }, { status: 403 });
    }

    const { data: trip, error: tripErr } = await supabaseServer
      .from('trips')
      .select('status, receiving_company_id')
      .eq('id', tripId)
      .single();
      
    if (tripErr || !trip || trip.receiving_company_id !== company.id) {
      return NextResponse.json({ error: 'Trip not found or unauthorized' }, { status: 404 });
    }

    if (trip.status !== 'completed') {
      return NextResponse.json({ error: 'Trip must be completed to share' }, { status: 400 });
    }

    // 3. Evidence check: must have DELIVERY_DEPARTED event
    const { data: events, error: eventsErr } = await supabaseServer
      .from('events')
      .select('id')
      .eq('trip_id', tripId)
      .eq('event_type', 'DELIVERY_DEPARTED')
      .limit(1);
      
    if (eventsErr || !events || events.length === 0) {
      return NextResponse.json({ error: 'Missing required evidence (Departure)' }, { status: 400 });
    }

    // 4. Generate fresh token
    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    // 5. Transaction: Revoke existing active share, insert new share
    // Since Supabase REST doesn't support generic RPC easily without writing a custom postgres function,
    // we use a defensive approach: revoke first, then insert.
    // If the insert fails due to partial unique index, it protects against concurrency.
    
    await supabaseServer
      .from('trip_public_shares')
      .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
      .eq('trip_id', tripId)
      .eq('status', 'ACTIVE');
      
    const { error: insertErr } = await supabaseServer
      .from('trip_public_shares')
      .insert({
        trip_id: tripId,
        token_hash: tokenHash,
        status: 'ACTIVE',
        created_by: user.id
      });

    if (insertErr) {
      console.error('Failed to create share:', insertErr);
      return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
    }

    // Build public URL server-side
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publicUrl = `${baseUrl}/share/${token}`;

    return NextResponse.json({ publicUrl });

  } catch (err) {
    console.error('Share creation error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Revoke a public share
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const supabase = await createClient();
    
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Check COMPANY role & trip ownership
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('id')
      .eq('auth_id', user.id)
      .single();
      
    if (companyErr || !company) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: trip, error: tripErr } = await supabaseServer
      .from('trips')
      .select('receiving_company_id')
      .eq('id', tripId)
      .single();
      
    if (tripErr || !trip || trip.receiving_company_id !== company.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });
    }

    // Revoke
    await supabaseServer
      .from('trip_public_shares')
      .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
      .eq('trip_id', tripId)
      .eq('status', 'ACTIVE');

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Share revocation error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
