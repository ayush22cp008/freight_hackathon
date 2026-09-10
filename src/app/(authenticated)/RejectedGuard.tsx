'use client';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function RejectedGuard({
  isRejected,
  rejectionUI,
  children
}: {
  isRejected: boolean;
  rejectionUI: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  if (isRejected && pathname !== '/onboarding') {
    return <>{rejectionUI}</>;
  }
  
  return <>{children}</>;
}
