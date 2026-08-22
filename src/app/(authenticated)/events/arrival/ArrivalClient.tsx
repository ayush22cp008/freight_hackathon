'use client';

import { useState } from 'react';
import { getGpsLocation } from '@/lib/capture/getGpsLocation';
import { getServerTime } from '@/lib/capture/getServerTime';
import { uploadPhoto } from '@/lib/capture/uploadPhoto';
import { useRouter } from 'next/navigation';

export default function ArrivalClient({ tripId, facilityName }: { tripId: string; facilityName: string }) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!photoFile) return;
    
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      // 1. Capture GPS
      const loc = await getGpsLocation();
      
      // 2. Fetch Server Time
      const time = await getServerTime();
      
      // 3. Upload Photo
      const photoUrl = await uploadPhoto(photoFile);

      // 4. Submit to API
      const res = await fetch('/api/events/arrival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          gps_accuracy: loc.accuracy,
          server_timestamp: time,
          photo_url: photoUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit arrival');
      }

      setSuccess({ timestamp: data.event.server_timestamp, photo: photoUrl });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="bg-green-100 text-green-800 p-6 rounded-lg shadow border border-green-200">
          <h2 className="text-2xl font-bold mb-2">Arrival Recorded!</h2>
          <p><strong>Timestamp:</strong> {new Date(success.timestamp).toLocaleString()}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={success.photo} alt="Arrival proof" className="mt-4 max-w-sm rounded shadow-sm border border-gray-200" />
          <button 
            onClick={() => router.push('/')}
            className="mt-6 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Record Arrival: {facilityName}</h1>
      
      <div className="bg-white p-6 rounded-lg shadow space-y-4 border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proof of Arrival (Photo Required)
          </label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {error && <div className="text-red-700 bg-red-50 p-3 rounded border border-red-200">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={!photoFile || loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {loading ? 'Recording Arrival...' : 'Submit Arrival'}
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-2">
          Submitting will securely capture your current GPS location and fetch a verified server timestamp.
        </p>
      </div>
    </div>
  );
}
