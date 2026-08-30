'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import { Suspense } from 'react';

function UpdatePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const hash = searchParams.get('token_hash');
    if (hash) {
      setTokenHash(hash);
    }
  }, [searchParams]);

  const handleVerify = async () => {
    if (!tokenHash) return;
    
    setVerifying(true);
    setError('');
    
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid or expired recovery link.');
      } else {
        setIsVerified(true);
      }
    } catch (err) {
      setError('An error occurred during verification.');
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to update password');
      } else {
        router.push('/login?message=Password+updated+successfully');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenHash && !isVerified) {
    return (
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Link</h1>
        <p className="text-gray-600 mb-6">No recovery token found. Please request a new password reset link.</p>
        <Link href="/forgot-password" className="text-blue-600 hover:underline">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {isVerified ? 'Set New Password' : 'Confirm Password Reset'}
      </h1>
      
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      
      {!isVerified ? (
        <div className="space-y-6">
          <p className="text-gray-600 text-center text-sm">
            You have requested to reset your password. Please click the button below to continue and verify your request.
          </p>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying...' : 'Continue to reset password'}
          </button>
          <div className="text-center">
            <Link href="/login" className="text-sm text-gray-500 hover:underline">
              Cancel
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
        <UpdatePasswordForm />
      </Suspense>
    </div>
  );
}
