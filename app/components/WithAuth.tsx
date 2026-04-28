'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';

interface AccessDoc {
  expiration_date: { toDate: () => Date };
  is_active: boolean;
  plan_type: string;
}

interface WithAuthProps {
  children: ReactNode;
  /** Pass the current pathname so we can redirect back after login */
  redirectTo?: string;
}

/**
 * WithAuth — Higher-Order Component
 *
 * Wraps any page/component and enforces:
 *   1. User must be signed in (Firebase Auth)
 *   2. User must have an active, non-expired user_access document in Firestore
 *
 * If expired → redirect to /welcome-and-offer?expired=true (renewal page)
 * If not signed in → redirect to /login
 */
export default function WithAuth({ children, redirectTo }: WithAuthProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'expired'>('loading');
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setStatus('unauthorized');
        const path = redirectTo || window.location.pathname;
        router.replace(`/login?redirect=${encodeURIComponent(path)}`);
        return;
      }

      setUser(currentUser);

      try {
        // Check Firestore for access doc
        const accessRef = doc(db, 'user_access', currentUser.uid);
        const accessSnap = await getDoc(accessRef);

        if (!accessSnap.exists()) {
          // No access doc — send to renewal page
          setStatus('expired');
          router.replace('/welcome-and-offer?expired=true');
          return;
        }

        const data = accessSnap.data() as AccessDoc;

        if (!data.is_active) {
          setStatus('expired');
          router.replace('/welcome-and-offer?expired=true');
          return;
        }

        const expiryDate = data.expiration_date.toDate();
        const now = new Date();

        if (expiryDate <= now) {
          setStatus('expired');
          router.replace('/welcome-and-offer?expired=true');
          return;
        }

        // Calculate days remaining for the warning banner
        const msLeft = expiryDate.getTime() - now.getTime();
        const days = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        setDaysLeft(days);
        setStatus('authorized');
      } catch (err) {
        console.error('WithAuth Firestore check failed:', err);
        // On error, don't lock them out — let through but log it
        setStatus('authorized');
      }
    });

    return () => unsubscribe();
  }, [router, redirectTo]);

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080712',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(167,139,250,0.2)',
          borderTopColor: '#a78bfa',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#64748b', fontSize: '14px' }}>Verifying your access…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status !== 'authorized') return null;

  return (
    <>
      {/* Expiry warning banner — shown when ≤ 30 days left */}
      {daysLeft !== null && daysLeft <= 30 && (
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed22, #a78bfa11)',
          borderBottom: '1px solid rgba(167,139,250,0.2)',
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#a78bfa',
        }}>
          ⚡ Your membership expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.{' '}
          <a href="/welcome-and-offer?renew=true" style={{ color: '#c4b5fd', fontWeight: 700 }}>
            Renew now at the current low rate →
          </a>
        </div>
      )}
      {children}
    </>
  );
}
