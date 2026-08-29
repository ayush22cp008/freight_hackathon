'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Company = { id: string; name: string };
type Trip = {
  id: string;
  facility_name: string;
  destination_name: string;
  distance: number;
  duration: string;
  payout: number;
  status: string;
};

export default function CreateTripClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  
  const [step, setStep] = useState<'create' | 'review' | 'published'>('create');
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);
  
  const [formData, setFormData] = useState({
    facility_name: '',
    destination_name: '',
    receiving_company_id: '',
    distance: '',
    duration: '',
    payout: ''
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch('/api/companies/lookup');
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
        }
      } catch (err) {
        console.error('Failed to load companies', err);
      } finally {
        setLoadingCompanies(false);
      }
    }
    fetchCompanies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/trips/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          distance: parseFloat(formData.distance),
          payout: parseFloat(formData.payout)
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create trip');
      
      setCreatedTrip(data.trip);
      setStep('review');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!createdTrip) return;
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/trips/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: createdTrip.id })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish trip');
      
      setCreatedTrip(data.trip);
      setStep('published');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'create') {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Create New Trip</h2>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Pickup Facility</label>
            <input required type="text" name="facility_name" value={formData.facility_name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. Warehouse A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Destination Facility</label>
            <input required type="text" name="destination_name" value={formData.destination_name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" placeholder="e.g. Distribution Center B" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Receiving Company</label>
            <select required name="receiving_company_id" value={formData.receiving_company_id} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
              <option value="">Select a company...</option>
              {!loadingCompanies && companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Distance (miles)</label>
              <input required type="number" step="0.1" name="distance" value={formData.distance} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration (e.g. 2 days)</label>
              <input required type="text" name="duration" value={formData.duration} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payout Offer ($)</label>
            <input required type="number" step="1" name="payout" value={formData.payout} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>
          <div className="pt-4">
            <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Create Draft Trip'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'review' && createdTrip) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Review Trip (Draft)</h2>
        {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-gray-500">Pickup</span>
            <span className="font-medium text-gray-900">{createdTrip.facility_name}</span>
          </div>
          <div>
            <span className="block text-gray-500">Destination</span>
            <span className="font-medium text-gray-900">{createdTrip.destination_name}</span>
          </div>
          <div>
            <span className="block text-gray-500">Distance & Duration</span>
            <span className="font-medium text-gray-900">{createdTrip.distance} mi • {createdTrip.duration}</span>
          </div>
          <div>
            <span className="block text-gray-500">Payout Offer</span>
            <span className="font-medium text-gray-900">${createdTrip.payout}</span>
          </div>
          <div>
            <span className="block text-gray-500">Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 uppercase tracking-wide">
              {createdTrip.status}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-3">
          <p className="text-sm text-gray-600">Review the details above. Publishing will make this trip available to eligible drivers.</p>
          <button onClick={handlePublish} disabled={isSubmitting} className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Publishing...' : 'Publish Trip'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'published' && createdTrip) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 space-y-4 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Trip Published Successfully!</h2>
        <p className="text-gray-600">This trip is now available for eligible drivers to claim.</p>
        <div className="pt-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  return null;
}
