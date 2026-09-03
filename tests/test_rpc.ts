import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log('Testing confirm_delivery RPC...');
  // Provide a dummy UUID
  const dummyUuid = '00000000-0000-0000-0000-000000000000';
  
  const { data, error } = await supabase.rpc('confirm_delivery', {
    p_trip_id: dummyUuid,
    p_role: 'DRIVER'
  });

  if (error) {
    console.error('RPC Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('RPC Data:', data);
  }
}

testRpc();
