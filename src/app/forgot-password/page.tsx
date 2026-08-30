'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client'; // Assuming client supabase logic exists, wait, let me just use standard fetch or createBrowserClient. I will make a standard fetch request to an API route to avoid client-side supabase setup if it doesn't exist, OR use createBrowserClient if the project already has it.

// Let's implement an API route to handle this securely, or use standard fetch if we build an API route for it.
// Actually, supabase client needs to be initialized. Let's create an API route for forgot password just to be consistent with login/signup, OR just use createBrowserClient if they have it.
// The project has `@supabase/ssr` according to the earlier file `src/lib/supabase/server.ts`. 
// Let's write the client page and it will call a new API route `/api/auth/forgot-password` so we don't worry about client lib structure if we haven't seen it.

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // To prevent enumeration, we always show a success message if the request was syntactically valid
      if (res.ok) {
        setMessage('If an account with that email exists, a password reset link has been sent.');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to request reset');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Reset Password</h1>
        
        {message ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 font-medium">{message}</p>
            <Link href="/login" className="text-blue-600 hover:underline block pt-4">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-gray-600 hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
