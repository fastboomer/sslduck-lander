'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

function PurchaseSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setErrorMsg('No session ID found. Please check your email for your account setup link.');
      setStatus('error');
      return;
    }

    const activate = async () => {
      try {
        // 1. Verify purchase with Stripe — get Firebase custom token
        const res = await fetch(`/api/gap-analysis/verify-purchase?session_id=${sessionId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Could not verify purchase');
        }
        const { customToken } = await res.json();

        // 2. Sign in to Firebase with custom token
        const credential = await signInWithCustomToken(auth, customToken);
        const idToken = await credential.user.getIdToken();

        // 3. Exchange ID token for httpOnly session cookie
        const sessionRes = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (!sessionRes.ok) throw new Error('Failed to create session cookie');

        // 4. All done — take them to their content
        router.replace('/fulfillment?new_member=1');
      } catch (err: any) {
        console.error('Purchase activation error:', err);
        setErrorMsg(
          "We had trouble signing you in automatically. No worries — check your email for a password setup link, then sign in at /login to access your content."
        );
        setStatus('error');
      }
    };

    activate();
  }, [sessionId, router]);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ps-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.2) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.1) 0%, transparent 60%),
                      #080712;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; font-family: 'Inter', system-ui, sans-serif;
        }
        .ps-card {
          width: 100%; max-width: 480px;
          background: rgba(15,10,30,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(167,139,250,0.15);
          border-radius: 24px; padding: 48px 40px;
          box-shadow: 0 0 60px rgba(124,58,237,0.15), 0 24px 48px rgba(0,0,0,0.4);
          text-align: center;
        }
        .ps-logo {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          border-radius: 16px; display: inline-flex; align-items: center;
          justify-content: center; font-size: 28px; font-weight: 900; color: white;
          margin-bottom: 24px;
          box-shadow: 0 0 30px rgba(124,58,237,0.4);
        }
        .ps-title { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 10px; }
        .ps-sub { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 32px; }

        .ps-spinner {
          width: 48px; height: 48px;
          border: 3px solid rgba(167,139,250,0.2);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ps-steps { text-align: left; margin-bottom: 24px; }
        .ps-step {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0; border-bottom: 1px solid rgba(167,139,250,0.08);
          font-size: 13px; color: #94a3b8;
        }
        .ps-step:last-child { border-bottom: none; }
        .ps-step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(167,139,250,0.3); flex-shrink: 0;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); background: #a78bfa; }
        }

        .ps-error-icon { font-size: 48px; margin-bottom: 16px; }
        .ps-error-msg {
          font-size: 14px; color: #94a3b8; line-height: 1.7;
          margin-bottom: 28px;
        }
        .ps-btn {
          display: inline-block;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: white; padding: 12px 28px; border-radius: 10px;
          text-decoration: none; font-weight: 700; font-size: 15px;
          transition: opacity 0.2s;
        }
        .ps-btn:hover { opacity: 0.88; }
        .ps-note { font-size: 12px; color: #475569; margin-top: 20px; }
      `}</style>

      <div className="ps-page">
        <div className="ps-card">
          <div className="ps-logo">S</div>

          {status === 'processing' ? (
            <>
              <h1 className="ps-title">Setting Up Your Account</h1>
              <p className="ps-sub">Your payment was successful! We&apos;re logging you in now — this only takes a moment.</p>
              <div className="ps-spinner" />
              <div className="ps-steps">
                <div className="ps-step"><div className="ps-step-dot" />Verifying your purchase with Stripe</div>
                <div className="ps-step"><div className="ps-step-dot" />Creating your member account</div>
                <div className="ps-step"><div className="ps-step-dot" />Unlocking your content access</div>
              </div>
              <p className="ps-note">A password setup email is also on its way to your inbox.</p>
            </>
          ) : (
            <>
              <div className="ps-error-icon">✉️</div>
              <h1 className="ps-title">Check Your Email</h1>
              <p className="ps-error-msg">{errorMsg}</p>
              <a href="/login" className="ps-btn">Go to Login →</a>
              <p className="ps-note">Need help? Reply to your confirmation email and we&apos;ll sort it out.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <PurchaseSuccessContent />
    </Suspense>
  );
}
