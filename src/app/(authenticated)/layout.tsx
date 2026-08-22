import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from './Navbar';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar userEmail={data.user.email} />
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}
