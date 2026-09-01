import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';
import { getFreightIdentity } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const trip_id = formData.get('trip_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }
    
    if (!trip_id) {
      return NextResponse.json({ error: 'Missing trip_id' }, { status: 400 });
    }

    // 1. Identify user
    const identity = await getFreightIdentity();
    let folderPath = '';

    if (identity?.trusted_role === 'COMPANY') {
      // Company Authorization
      const { data: company } = await supabaseServer
        .from('companies')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!company) {
        return NextResponse.json({ error: 'Company profile not found' }, { status: 403 });
      }

      const { data: activeTrip } = await supabaseServer
        .from('trips')
        .select('id')
        .eq('id', trip_id)
        .eq('receiving_company_id', company.id)
        .in('status', ['active', 'claimed', 'in_progress'])
        .single();

      if (!activeTrip) {
        return NextResponse.json({ error: 'Not authorized for this trip or trip is not active' }, { status: 403 });
      }

      folderPath = company.id;
    } else {
      // Default to Driver Authorization
      const { data: driver } = await supabaseServer
        .from('drivers')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!driver) {
        return NextResponse.json({ error: 'Driver profile not found' }, { status: 403 });
      }

      const { data: activeTrip } = await supabaseServer
        .from('trips')
        .select('id')
        .eq('id', trip_id)
        .eq('driver_id', driver.id)
        .in('status', ['active', 'claimed', 'in_progress'])
        .single();

      if (!activeTrip) {
        return NextResponse.json({ error: 'Not authorized for this trip or trip is not active' }, { status: 403 });
      }

      folderPath = driver.id;
    }

    // 3. Generate secure, deterministic path: {folderPath}/{trip_id}/{timestamp}-{random}.{ext}
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${folderPath}/${trip_id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseServer
      .storage
      .from('event-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseServer
      .storage
      .from('event-photos')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
