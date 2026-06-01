'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import WithAuth from '@/app/components/WithAuth';

export default function FulfillmentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Public lead-generation, offer, and purchase-success routes should bypass WithAuth
  const isPublicPath = [
    '/fulfillment/gap-analysis/success',
    '/fulfillment/gap-analysis/offer',
    '/fulfillment/gap-analysis/purchase-success'
  ].some(path => pathname?.startsWith(path));

  if (isPublicPath) {
    return <>{children}</>;
  }

  return (
    <WithAuth>
      {children}
    </WithAuth>
  );
}

