'use client';

import { useState } from 'react';
import { getGpsLocation, GpsResult } from '@/lib/capture/getGpsLocation';
import { getServerTime } from '@/lib/capture/getServerTime';
import { uploadPhoto } from '@/lib/capture/uploadPhoto';

export default function TestDay2Page() {
  const [gps, setGps] = useState<GpsResult | null>(null);
  const [gpsError, setGpsError] = useState('');
  
  const [serverTime, setServerTime] = useState('');
  const [timeError, setTimeError] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleGps = async () => {
    setGps(null);
    setGpsError('');
    try {
      const loc = await getGpsLocation();
      setGps(loc);
    } catch (err: any) {
      setGpsError(err.message);
    }
  };

  const handleTime = async () => {
    setServerTime('');
    setTimeError('');
    try {
      const time = await getServerTime();
      setServerTime(time);
    } catch (err: any) {
      setTimeError(err.message);
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUrl('');
    setUploadError('');
    setUploading(true);

    try {
      const url = await uploadPhoto(file);
      setPhotoUrl(url);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Day 2: Event Capture Utils Test</h1>

      {/* GPS Test */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-xl mb-4">1. GPS Capture</h2>
        <button 
          onClick={handleGps}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-2 hover:bg-blue-700"
        >
          Capture GPS Location
        </button>
        {gps && (
          <pre className="bg-gray-100 p-2 text-sm mt-2 text-gray-900">
            {JSON.stringify(gps, null, 2)}
          </pre>
        )}
        {gpsError && <p className="text-red-500 mt-2">{gpsError}</p>}
      </div>

      {/* Server Time Test */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-xl mb-4">2. Server Timestamp</h2>
        <button 
          onClick={handleTime}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-2 hover:bg-blue-700"
        >
          Fetch Server Time
        </button>
        {serverTime && <p className="mt-2 font-mono">{serverTime}</p>}
        {timeError && <p className="text-red-500 mt-2">{timeError}</p>}
      </div>

      {/* Photo Upload Test */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-xl mb-4">3. Photo Upload</h2>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handlePhoto}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={uploading}
        />
        {uploading && <p className="mt-2 text-blue-600">Uploading...</p>}
        {uploadError && <p className="text-red-500 mt-2">{uploadError}</p>}
        {photoUrl && (
          <div className="mt-4">
            <p className="text-green-600 mb-2">Upload Success!</p>
            <p className="text-sm text-gray-600 break-all mb-2">{photoUrl}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Uploaded test" className="max-w-full h-auto rounded shadow-sm max-h-64 object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
