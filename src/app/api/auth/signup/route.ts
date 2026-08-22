import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { email, password, driver_code } = await request.json();

    if (!email || !password || !driver_code) {
      return NextResponse.json({ error: 'Email, password, and driver code are required' }, { status: 400 });
    }

    // 1. Verify driver code exists and is not already claimed
    const { data: driver, error: driverError } = await supabaseServer
      .from('drivers')
      .select('id, auth_id')
      .eq('driver_code', driver_code)
      .single();

    if (driverError || !driver) {
      return NextResponse.json({ error: 'Invalid driver code' }, { status: 400 });
    }

    if (driver.auth_id) {
      return NextResponse.json({ error: 'Driver code already has an account' }, { status: 400 });
    }

    // 2. Sign up the user via Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create account' }, { status: 400 });
    }

    // 3. Link the auth_id to the driver record
    const { error: updateError } = await supabaseServer
      .from('drivers')
      .update({ auth_id: authData.user.id })
      .eq('id', driver.id);

    if (updateError) {
      // Rollback is difficult without a transaction on auth, but we alert on failure
      console.error('Failed to link driver:', updateError);
      return NextResponse.json({ error: 'Account created but failed to link to driver' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
