import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

export default async function Profile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get driver using auth_id securely on the server
  const { data: driver } = await supabaseServer
    .from('drivers')
    .select('name')
    .eq('auth_id', user.id)
    .single();

  if (!driver) {
    return (
      <main className="p-8 max-w-xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">Profile Not Found</h1>
        <p className="text-gray-600">Could not load driver profile information.</p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="bg-red-50 text-red-700 hover:bg-red-100 py-2 px-4 rounded font-medium transition-colors"
          >
            Sign Out
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Driver Name</h2>
            <p className="text-xl font-medium text-gray-900">{driver.name}</p>
          </div>
          
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Account Email</h2>
            <p className="text-lg text-gray-800">{user.email}</p>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full sm:w-auto bg-gray-100 text-gray-800 hover:bg-gray-200 py-2 px-6 rounded-md font-medium transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
