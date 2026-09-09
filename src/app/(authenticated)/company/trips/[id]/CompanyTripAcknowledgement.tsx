'use client';

import { useEffect } from 'react';

export default function CompanyTripAcknowledgement({ tripId }: { tripId: string }) {
  useEffect(() => {
    if (tripId) {
      localStorage.setItem(`acked_completed_trip_${tripId}`, 'true');
    }
  }, [tripId]);

  return null;
}
