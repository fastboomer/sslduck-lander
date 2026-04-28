import { ReactNode } from 'react';
import WithAuth from '@/app/components/WithAuth';

export default function FulfillmentLayout({ children }: { children: ReactNode }) {
  return (
    <WithAuth>
      {children}
    </WithAuth>
  );
}
