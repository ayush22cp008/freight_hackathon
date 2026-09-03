import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Connect to local Supabase emulator
// Note: We use the service role key to setup and teardown test data, 
// and simulate authenticated client requests for the test itself.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJh...'; // Replace with actual local anon/service key in practice

// We will use the database-level atomicity testing as a fallback. 
// Why? Testing the Next.js HTTP `/api/trips/claim` endpoint requires 
// 1) starting the Next.js server in the test CI, 
// 2) programmatically signing in users to acquire session cookies, 
// 3) sending valid HTTP POST requests with those exact cookie headers.
// This requires a much heavier e2e framework (like Playwright) rather than a simple Vitest script.
// Thus, as per instruction #5, we use the database-level atomicity fallback.

describe('Node 4: Atomic Claim Concurrency', () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let tripId: string;
  let driverA_Id: string;
  let driverB_Id: string;

  beforeAll(async () => {
    // We assume seed.sql has already populated the tables.
    // For safety, we fetch the known seeded trip and drivers.
    const { data: trip } = await supabase.from('trips').select('id').eq('status', 'published').is('driver_id', null).limit(1).single();
    if (trip) tripId = trip.id;

    const { data: drivers } = await supabase.from('drivers').select('id').limit(2);
    if (drivers && drivers.length >= 2) {
      driverA_Id = drivers[0].id;
      driverB_Id = drivers[1].id;
    }
  });

  it('Exactly one driver wins the claim under concurrent database updates', async () => {
    if (!tripId || !driverA_Id || !driverB_Id) {
      throw new Error('Test data missing. Make sure seed.sql is applied.');
    }

    // This simulates the exact query executed by the claim API route:
    // .update({ driver_id: driverId, status: 'claimed' })
    // .eq('id', tripId)
    // .eq('status', 'published')
    // .is('driver_id', null)

    const claimAttempt = async (driverId: string) => {
      const { data, error } = await supabase
        .from('trips')
        .update({ driver_id: driverId, status: 'claimed' })
        .eq('id', tripId)
        .eq('status', 'published')
        .is('driver_id', null)
        .select()
        .single();
        
      return { driverId, data, error };
    };

    // Execute concurrently!
    const results = await Promise.all([
      claimAttempt(driverA_Id),
      claimAttempt(driverB_Id)
    ]);

    // Exactly one should succeed (data exists, error is null)
    // Exactly one should fail (PGRST116: 0 rows returned from .single())
    const successes = results.filter(r => r.data !== null && !r.error);
    const failures = results.filter(r => r.error !== null);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    const winnerId = successes[0].driverId;
    const loserId = failures[0].driverId;

    expect(winnerId).not.toBe(loserId);

    // Verify the final state of the trip in the database
    const { data: finalTrip } = await supabase.from('trips').select('*').eq('id', tripId).single();
    
    expect(finalTrip.status).toBe('claimed');
    expect(finalTrip.driver_id).toBe(winnerId);
  });
});
