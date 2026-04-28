'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function WelcomePage() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';
  const isRenew = searchParams.get('renew') === 'true';
  const sessionId = searchParams.get('session_id');

  // Show a brief "provisioning" animation for new buyers
  const [provisionStep, setProvisionStep] = useState(0);
  const isNewPurchase = !!sessionId && !isExpired && !isRenew;

  useEffect(() => {
    if (!isNewPurchase) return;
    // Step through the provisioning animation: 0→1→2 over ~4 seconds
    const t1 = setTimeout(() => setProvisionStep(1), 1500);
    const t2 = setTimeout(() => setProvisionStep(2), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isNewPurchase]);

  const steps = [
    { label: 'Payment confirmed', done: provisionStep >= 0 },
    { label: 'Creating your account', done: provisionStep >= 1 },
    { label: 'Access granted!', done: provisionStep >= 2 },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .welcome-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at 40% 0%, rgba(124,58,237,0.25) 0%, transparent 55%),
                      radial-gradient(ellipse at 80% 90%, rgba(59,130,246,0.12) 0%, transparent 50%),
                      #080712;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          font-family: 'Inter', system-ui, sans-serif;
          color: #e2e8f0;
        }
        .welcome-card {
          width: 100%; max-width: 560px;
          background: rgba(15,10,30,0.9);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(167,139,250,0.18);
          border-radius: 24px;
          padding: 48px 40px;
          box-shadow: 0 0 80px rgba(124,58,237,0.2), 0 32px 64px rgba(0,0,0,0.5);
          text-align: center;
        }

        /* ── Header ── */
        .welcome-icon { font-size: 52px; margin-bottom: 16px; }
        .welcome-headline {
          font-size: 26px; font-weight: 800;
          background: linear-gradient(135deg, #e2e8f0, #a78bfa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 10px; line-height: 1.2;
        }
        .welcome-sub { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 32px; }

        /* ── Provisioning Steps ── */
        .steps { display: flex; flex-direction: column; gap: 12px; margin-bottom: 36px; text-align: left; }
        .step { display: flex; align-items: center; gap: 14px; }
        .step-dot {
          width: 26px; height: 26px; border-radius: 50%;
          border: 2px solid rgba(167,139,250,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 13px; transition: all 0.4s;
        }
        .step-dot.done { background: #7c3aed; border-color: #a78bfa; }
        .step-dot.pending { animation: pulse-dot 1.2s infinite; }
        .step-label { font-size: 14px; color: #94a3b8; transition: color 0.3s; }
        .step-label.done { color: #e2e8f0; font-weight: 500; }
        @keyframes pulse-dot { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }

        /* ── Offer Box ── */
        .offer-box {
          background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(167,139,250,0.08));
          border: 1px solid rgba(167,139,250,0.25);
          border-radius: 16px; padding: 28px 24px; margin-bottom: 28px;
          position: relative; overflow: hidden;
        }
        .offer-box::before {
          content: '⚡ LIMITED TIME';
          position: absolute; top: 12px; right: 16px;
          font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #a78bfa;
        }
        .offer-title { font-size: 17px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; }
        .offer-desc { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }

        /* ── Buttons ── */
        .btn-primary {
          display: block; width: 100%;
          padding: 15px 24px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: white; border: none; border-radius: 12px;
          font-size: 16px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          transition: opacity 0.2s, transform 0.15s;
          margin-bottom: 12px;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

        .btn-secondary {
          display: block; width: 100%;
          padding: 13px 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(167,139,250,0.2);
          color: #94a3b8; border-radius: 12px;
          font-size: 14px; font-weight: 500;
          cursor: pointer; text-decoration: none;
          transition: all 0.2s;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }

        .note { font-size: 12px; color: #475569; margin-top: 20px; line-height: 1.6; }

        /* ── Expired Specific ── */
        .expired-icon { font-size: 48px; margin-bottom: 16px; }
        .price-tag {
          font-size: 32px; font-weight: 800; color: #a78bfa;
          margin: 8px 0;
        }
        .price-note { font-size: 12px; color: #64748b; }
      `}</style>

      <div className="welcome-page">
        <div className="welcome-card">
          {isExpired || isRenew ? (
            /* ── Expired / Renewal Flow ─────────────────────── */
            <>
              <div className="expired-icon">🔑</div>
              <h1 className="welcome-headline">
                {isRenew ? 'Extend Your Access' : 'Your Access Has Expired'}
              </h1>
              <p className="welcome-sub">
                {isRenew
                  ? 'Lock in the current price before it increases. Your time will be added on top of your existing access.'
                  : 'Thank you so much for being an SSLDUCK member. We hope the content delivered value for you!'
                }
              </p>

              <div className="offer-box">
                <div className="offer-title">🎉 Welcome Back Rate — Still Available</div>
                <div className="offer-desc">
                  Prices are going up soon. As a returning member, you can still lock in the original founding-member rate for another 6 months. Once you click through, the price you see is your price — guaranteed.
                </div>
                <div className="price-tag">Same Low Price</div>
                <div className="price-note">Founding member rate · While it lasts</div>
              </div>

              <a
                href="/#pricing"
                className="btn-primary"
                id="welcome-renew-btn"
              >
                🔒 Lock In My Rate — Renew Now
              </a>
              <a href="/login" className="btn-secondary" id="welcome-login-btn">
                I already renewed — Sign In
              </a>
            </>
          ) : (
            /* ── New Purchase Flow ──────────────────────────── */
            <>
              <div className="welcome-icon">🎉</div>
              <h1 className="welcome-headline">
                Your SSLDUCK Access<br />is Being Activated!
              </h1>
              <p className="welcome-sub">
                Hang tight for just a moment — we&apos;re setting up your account and sending your login link.
              </p>

              {/* Provisioning Steps */}
              <div className="steps">
                {steps.map((step, i) => (
                  <div className="step" key={i}>
                    <div className={`step-dot ${step.done ? 'done' : i === provisionStep ? 'pending' : ''}`}>
                      {step.done ? '✓' : ''}
                    </div>
                    <span className={`step-label ${step.done ? 'done' : ''}`}>{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Upsell Offer */}
              <div className="offer-box">
                <div className="offer-title">💡 Double Your Access — While You&apos;re Here</div>
                <div className="offer-desc">
                  You just locked in 6 months at our founding rate. Extend to a full year right now and we&apos;ll add another 6 months on top — at the same low price before it goes up.
                </div>
                <a
                  href="/#pricing"
                  className="btn-primary"
                  id="welcome-upsell-btn"
                  style={{ fontSize: '14px', padding: '12px 20px' }}
                >
                  ⚡ Extend to 12 Months Now →
                </a>
              </div>

              <a
                href="/fulfillment"
                className="btn-secondary"
                id="welcome-enter-btn"
              >
                I&apos;m ready — Take me to the tool →
              </a>

              <p className="note">
                📧 Check your email for a link to set your password. If you signed up with Google, you can sign in directly. The link expires in 24 hours.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function WelcomeAndOfferPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#a78bfa' }}>Loading…</div>
      </div>
    }>
      <WelcomePage />
    </Suspense>
  );
}
