import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // We construct the callback URL so that Supabase directs the user to our confirm API
    // request.url is something like http://localhost:3000/api/auth/forgot-password
    const requestUrl = new URL(request.url);
    const callbackUrl = `${requestUrl.origin}/api/auth/confirm?next=/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl,
    });

    if (error) {
      // In a real app we might want to log this but return success to avoid enumeration
      console.error('Password reset request error:', error.message);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
