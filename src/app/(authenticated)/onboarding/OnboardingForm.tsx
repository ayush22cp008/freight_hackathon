'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingForm({ requestedRole, authId }: { requestedRole: string, authId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const isDriver = requestedRole === 'DRIVER';
  const docLabel = isDriver ? 'Upload Driving Licence' : 'Upload Company GST Document';
  const docType = isDriver ? 'DRIVING_LICENCE' : 'GST';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${authId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('onboarding_evidence')
        .upload(storagePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Submit to API
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          document_type: docType, 
          storage_path: storagePath,
          mime_type: file.type,
          size_bytes: file.size
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="file_upload" className="block text-sm font-medium text-gray-700">
          {docLabel}
        </label>
        <input
          type="file"
          id="file_upload"
          accept="image/*,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Accepted formats: Images or PDF. Max size: 5MB.
        </p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Uploading...' : 'Submit Evidence'}
      </button>
    </form>
  );
}
