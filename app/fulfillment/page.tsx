'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';

interface AccessInfo {
  plan_type: string;
  expiration_date: { toDate: () => Date };
  purchase_date: { toDate: () => Date };
}

// ── Tool definitions ────────────────────────────────────────────────────────
const tools = [
  {
    id: 'resume-360',
    title: 'Resume 360 + Professional Profile',
    description: 'Generate resume with Professional profile plus 2 additional profile variations.',
    icon: '📄',
    featured: true,  // spans 2 columns on md+
    href: '/fulfillment/resume-360',
    cta: 'Launch Tool',
  },
  {
    id: 'cover-letter',
    title: 'Cover Letter Generator',
    description: 'Custom cover letter plus 2 additional variations.',
    icon: '✉️',
    href: '/fulfillment/cover-letter',
    cta: 'Launch',
    comingSoon: false,
  },
  {
    id: 'interview-prep',
    title: 'Interview Prep AI',
    description: 'Practice with realistic interview simulations. Receive real-time feedback on your answers and delivery.',
    icon: '🎤',
    href: null,
    cta: 'Launch',
    comingSoon: true,
  },
  {
    id: 'gap-analysis',
    title: 'GAP Analysis & Actionable Advice',
    description: 'Goals And Profile of Target Company with actionable advice based on resume and job analysis.',
    icon: '🎯',
    href: '/fulfillment/gap-analysis',
    cta: 'Launch',
    comingSoon: false,
  },
  {
    id: 'suitability-study',
    title: 'Suitability Study & Job Options',
    description: 'See how well you measure up for your target job, and identify alternate jobs matching your profile.',
    icon: '🔍',
    href: null,
    cta: 'Launch',
    comingSoon: true,
  },
  {
    id: 'linkedin-headline',
    title: 'LinkedIn Headline',
    description: "Your headline speaks before you do, so let's get it right. Don't waste the chance to align your skills with opportunity.",
    icon: '💼',
    href: null,
    cta: 'Launch',
    comingSoon: true,
  },
  {
    id: 'linkedin-about',
    title: 'LinkedIn About Profile',
    description: 'The About section is an opportunity to humanize your experience by bridging past achievements and future ambitions, creating clarity and confidence in who you really are.',
    icon: '🖊️',
    href: '/fulfillment/linkedin-about',
    cta: 'Launch',
    comingSoon: false,
  },
  {
    id: 'resume-early',
    title: 'Resume Tool – Early and Student',
    description: 'Generate Resume for Early Career, Student, and Internships.',
    icon: '🎓',
    href: '/fulfillment/resume-student',
    cta: 'Launch',
    comingSoon: false,
  },
];

// ── Main Dashboard Component ────────────────────────────────────────────────
function FulfillmentDashboard() {
  const searchParams = useSearchParams();
  const isNewMember = searchParams.get('new_member') === '1';

  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      try {
        const snap = await getDoc(doc(db, 'user_access', u.uid));
        if (snap.exists()) setAccess(snap.data() as AccessInfo);
      } catch {
        // WithAuth already enforces access; this read is display-only.
      }
    });
    return () => unsub();
  }, []);

  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Member';

  const handleLogout = async () => {
    await signOut(auth);
    await fetch('/api/auth/session', { method: 'DELETE' });
    window.location.href = '/login';
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const daysLeft = access
    ? Math.max(0, Math.ceil((access.expiration_date.toDate().getTime() - Date.now()) / 86400000))
    : null;

  const planLabel = access?.plan_type === '12_month' ? '12-Month' : '6-Month';

  const handleToolLaunch = (href: string | null, comingSoon?: boolean) => {
    if (comingSoon || !href) return;
    window.location.href = href;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .bd-page {
          min-height: 100vh;
          background-color: #FFFFFF;
          color: #000000;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* ── New Member Banner ───────────── */
        .bd-new-banner {
          background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04));
          border-bottom: 2px solid rgba(0,35,102,0.12);
          padding: 13px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 14px;
          color: #002366;
          font-weight: 500;
        }
        .bd-new-banner-dismiss {
          background: none;
          border: 1px solid rgba(0,35,102,0.3);
          color: #002366;
          padding: 4px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          white-space: nowrap;
          font-weight: 600;
          transition: background 0.2s;
        }
        .bd-new-banner-dismiss:hover { background: rgba(0,35,102,0.06); }

        /* ── Nav ─────────────────────────── */
        .bd-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 40px;
          border-bottom: 2px solid #002366;
          background: #FFFFFF;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .bd-logo-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .bd-logo-img {
          height: 44px;
          width: auto;
        }
        .bd-logo-text {
          display: flex;
          flex-direction: column;
        }
        .bd-logo-name {
          font-size: 18px;
          font-weight: 900;
          color: #002366;
          letter-spacing: -0.5px;
          line-height: 1;
          font-family: Georgia, serif;
        }
        .bd-logo-tagline {
          font-size: 8px;
          font-weight: 700;
          color: rgba(0,35,102,0.4);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .bd-nav-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .bd-email {
          font-size: 13px;
          color: #475569;
          font-weight: 500;
        }
        .bd-signout {
          background: #002366;
          color: #FFFFFF;
          border: none;
          font-size: 13px;
          font-weight: 700;
          padding: 7px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .bd-signout:hover { background: #003a99; }

        /* ── Body ────────────────────────── */
        .bd-body {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 52px 32px 80px;
          flex-grow: 1;
        }

        /* ── Header ──────────────────────── */
        .bd-header {
          text-align: center;
          margin-bottom: 48px;
        }
        .bd-header h1 {
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 900;
          color: #002366;
          letter-spacing: -1px;
          line-height: 1.1;
          margin-bottom: 14px;
        }
        .bd-header-sub {
          font-size: 1.1rem;
          font-weight: 500;
          color: #1e293b;
        }
        .bd-header-sub strong {
          font-weight: 800;
          color: #002366;
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 4px;
        }

        /* ── Access badge ─────────────────── */
        .bd-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0,35,102,0.07);
          border: 2px solid #002366;
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 12px;
          color: #002366;
          font-weight: 700;
          letter-spacing: 0.3px;
          margin-top: 16px;
        }
        .bd-badge-dot {
          width: 8px;
          height: 8px;
          background: #002366;
          border-radius: 50%;
          animation: bdpulse 2s infinite;
        }
        @keyframes bdpulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

        /* ── Bento Grid ──────────────────── */
        .bd-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 900px) {
          .bd-grid { grid-template-columns: repeat(2, 1fr); }
          .bd-card-featured { grid-column: span 2; }
        }
        @media (max-width: 580px) {
          .bd-grid { grid-template-columns: 1fr; }
          .bd-card-featured { grid-column: span 1; }
        }

        /* ── Card ────────────────────────── */
        .bd-card {
          border: 2px solid #002366;
          border-radius: 0;
          background: #FFFFFF;
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1);
          min-height: 260px;
        }
        .bd-card:hover {
          box-shadow: 0 10px 30px -4px rgba(0,35,102,0.15), 0 4px 12px -2px rgba(0,35,102,0.08);
          transform: translateY(-3px);
        }
        .bd-card-featured { grid-column: span 2; }

        /* Card top row */
        .bd-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .bd-card-icon {
          width: 44px;
          height: 44px;
          background: #002366;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .bd-featured-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          background: #002366;
          color: #FFFFFF;
          padding: 4px 10px;
        }
        .bd-coming-soon-tag {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #b45309;
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.35);
          border-radius: 4px;
          padding: 3px 10px;
        }

        /* Card content */
        .bd-card h2, .bd-card h3 {
          color: #002366;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .bd-card h2 { font-size: 1.5rem; }
        .bd-card h3 { font-size: 1.1rem; }
        .bd-card p {
          color: #1e293b;
          font-size: 0.92rem;
          line-height: 1.7;
          flex-grow: 1;
          margin-bottom: 28px;
        }

        /* ── Launch Button ───────────────── */
        .bd-launch-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(to bottom, #4DA3FF 0%, #006BFF 45%, #0047B3 100%);
          color: #FFFFFF;
          border: 1px solid #003A99;
          border-radius: 10px;
          padding: 13px 28px;
          font-size: 16px;
          font-weight: 700;
          font-family: 'Inter', system-ui, sans-serif;
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.5),
            0 4px 12px rgba(0,35,102,0.3);
          cursor: pointer;
          transition: all 0.2s;
          display: inline-block;
          text-decoration: none;
        }
        .bd-launch-btn::before {
          content: "";
          position: absolute;
          top: 0; left: 8%;
          width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%;
          pointer-events: none;
        }
        .bd-launch-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #66B3FF 0%, #0077FF 45%, #0052CC 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.65),
            0 6px 16px rgba(0,35,102,0.4);
          transform: translateY(-1px);
        }
        .bd-launch-btn:disabled {
          cursor: not-allowed;
        }
        .bd-launch-btn-full { width: 100%; }

        /* ── Membership Status ───────────── */
        .bd-section-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 16px;
          margin-top: 52px;
        }
        .bd-status-card {
          border: 2px solid #002366;
          padding: 28px 32px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 24px;
          margin-bottom: 28px;
          background: rgba(0,35,102,0.02);
        }
        .bd-status-item label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #64748b;
          font-weight: 700;
        }
        .bd-status-item p {
          font-size: 16px;
          font-weight: 800;
          color: #002366;
          margin-top: 6px;
        }

        /* ── Renewal strip ───────────────── */
        .bd-renew-strip {
          border: 2px solid #002366;
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          background: #002366;
          color: #FFFFFF;
        }
        .bd-renew-strip p { font-size: 14px; color: #FFFFFF; font-weight: 500; }
        .bd-renew-strip strong { color: #7dd3fc; }
        .bd-renew-cta {
          background: #FFFFFF;
          color: #002366;
          border: none;
          padding: 10px 24px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 0.2s;
          border-radius: 6px;
        }
        .bd-renew-cta:hover { opacity: 0.88; }

        /* ── Footer ─────────────────────── */
        .bd-footer {
          border-top: 2px solid #002366;
          padding: 28px 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }
        @media (min-width: 640px) {
          .bd-footer {
            flex-direction: row;
            justify-content: space-between;
          }
        }
        .bd-footer-links {
          display: flex;
          gap: 28px;
        }
        .bd-footer-link {
          font-size: 14px;
          font-weight: 600;
          color: #002366;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .bd-footer-link:hover { color: #2563eb; }
        .bd-footer-copy {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
        }

        @media (max-width: 640px) {
          .bd-nav { padding: 14px 20px; }
          .bd-body { padding: 36px 16px 60px; }
          .bd-card { padding: 24px 20px; }
          .bd-status-card { padding: 20px; }
          .bd-renew-strip { padding: 16px 20px; }
          .bd-footer { padding: 24px 20px; }
        }
      `}</style>

      <div className="bd-page">

        {/* ── New Member Banner ──────────────────────────────────────────── */}
        {isNewMember && !bannerDismissed && (
          <div className="bd-new-banner">
            <span>
              ✉️ <strong>One more step:</strong> Check your email for a link to set your password — so you can log back in anytime.
              You&apos;re already signed in and ready to start!
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              id="dismiss-banner-btn"
              className="bd-new-banner-dismiss"
            >
              Got it ✕
            </button>
          </div>
        )}

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <nav className="bd-nav">
          <a href="https://sslduck-lander.vercel.app" className="bd-logo-link">
            <img src="/logo.png" alt="SSLDuck Logo" className="bd-logo-img" />
            <div className="bd-logo-text">
              <span className="bd-logo-name">SSLDUCK</span>
              <span className="bd-logo-tagline">VERSION 12-PRO</span>
            </div>
          </a>
          <div className="bd-nav-right">
            <span className="bd-email">{user?.email}</span>
            <button onClick={handleLogout} className="bd-signout" id="dash-logout-btn">
              Sign Out
            </button>
          </div>
        </nav>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="bd-body">

          {/* Header */}
          <header className="bd-header">
            <h1>Your AI Career Suite Portal</h1>
            <p className="bd-header-sub">
              Welcome {isNewMember ? '' : 'back'},{' '}
              <strong id="userName">{firstName}</strong>!
            </p>
            {access && (
              <div className="bd-badge">
                <div className="bd-badge-dot" />
                {planLabel} Member &mdash; {daysLeft} days remaining
              </div>
            )}
          </header>

          {/* ── Bento Grid ─────────────────────────────────────────────── */}
          <main className="bd-grid">

            {tools.map((tool) => (
              <div
                key={tool.id}
                className={`bd-card${tool.featured ? ' bd-card-featured' : ''}`}
              >
                {/* Top row: icon + badge */}
                <div className="bd-card-top">
                  <div className="bd-card-icon" aria-hidden="true">
                    {tool.icon}
                  </div>
                  {tool.featured && (
                    <span className="bd-featured-tag">Featured Tool</span>
                  )}
                  {!tool.featured && tool.comingSoon && (
                    <span className="bd-coming-soon-tag">Coming Soon</span>
                  )}
                </div>

                {/* Title + description */}
                {tool.featured ? (
                  <h2>{tool.title}</h2>
                ) : (
                  <h3>{tool.title}</h3>
                )}
                <p>{tool.description}</p>

                {/* CTA */}
                <div style={{ marginTop: 'auto' }}>
                  <button
                    id={`launch-${tool.id}`}
                    className={`bd-launch-btn${!tool.featured ? ' bd-launch-btn-full' : ''}`}
                    disabled={tool.comingSoon === true}
                    onClick={() => handleToolLaunch(tool.href ?? null, tool.comingSoon)}
                    title={tool.comingSoon ? 'Coming soon — check back shortly!' : undefined}
                  >
                    {tool.cta}
                  </button>
                </div>
              </div>
            ))}

          </main>

          {/* ── Membership Status ────────────────────────────────────── */}
          {access && (
            <>
              <p className="bd-section-label">Your Membership</p>
              <div className="bd-status-card">
                <div className="bd-status-item">
                  <label>Plan</label>
                  <p>{planLabel} Access</p>
                </div>
                <div className="bd-status-item">
                  <label>Member Since</label>
                  <p style={{ fontSize: '14px' }}>{formatDate(access.purchase_date.toDate())}</p>
                </div>
                <div className="bd-status-item">
                  <label>Expires</label>
                  <p style={{ fontSize: '14px' }}>{formatDate(access.expiration_date.toDate())}</p>
                </div>
                <div className="bd-status-item">
                  <label>Days Remaining</label>
                  <p>{daysLeft} days</p>
                </div>
              </div>

              {daysLeft !== null && daysLeft <= 60 && (
                <div className="bd-renew-strip">
                  <p>⚡ <strong>{daysLeft} days</strong> left — lock in your rate before it increases.</p>
                  <a href="/fulfillment/gap-analysis/offer?renew=true" className="bd-renew-cta" id="dash-renew-btn">
                    Extend My Access →
                  </a>
                </div>
              )}
            </>
          )}

        </div>{/* /bd-body */}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="bd-footer">
          <div className="bd-footer-links">
            <a href="#" className="bd-footer-link" id="footer-support-link">Support</a>
            <a href="#" className="bd-footer-link" id="footer-account-link">Account Settings</a>
            <a href="/privacy-policy" className="bd-footer-link" id="footer-privacy-link">Privacy Policy</a>
          </div>
          <div className="bd-footer-copy">
            &copy; 2026 SSLDuck. All Rights Reserved.
          </div>
        </footer>

      </div>
    </>
  );
}

// ── Page Export ─────────────────────────────────────────────────────────────
export default function FulfillmentPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid rgba(0,35,102,0.15)',
          borderTopColor: '#002366',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <FulfillmentDashboard />
    </Suspense>
  );
}
