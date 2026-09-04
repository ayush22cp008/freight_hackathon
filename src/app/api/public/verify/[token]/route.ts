import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { checkAnonymousRateLimit } from '@/lib/public-share';
import { getPublicVerificationData } from '@/lib/public-share-lookup';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // 1. Anonymous rate limiting
    const headersList = await headers();
    // Default to 'anonymous' if IP can't be resolved, in real deployment use x-forwarded-for
    const ip = headersList.get('x-forwarded-for') || 'anonymous';
    if (!checkAnonymousRateLimit(ip, token)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. Resolve data using shared helper
    const publicProjection = await getPublicVerificationData(token);
    if (!publicProjection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Return projection with no-cache headers
    return NextResponse.json(publicProjection, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (err) {
    console.error('Public verification error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
