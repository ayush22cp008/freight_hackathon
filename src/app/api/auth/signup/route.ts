import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password, requested_role } = await request.json();

    if (!email || !password || !requested_role) {
      return NextResponse.json({ error: 'Email, password, and requested role are required' }, { status: 400 });
    }

    if (!['DRIVER', 'COMPANY'].includes(requested_role)) {
      return NextResponse.json({ error: 'Invalid requested role' }, { status: 400 });
    }

    // Sign up the user via Supabase Auth
    // The database trigger will automatically create the freight_identities row with requested_role
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          requested_role,
        }
      }
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create account' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
