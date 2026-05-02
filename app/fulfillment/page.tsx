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
      const snap = await getDoc(doc(db, 'user_access', u.uid));
      if (snap.exists()) setAccess(snap.data() as AccessInfo);
    });
    return () => unsub();
  }, []);

  // Derive first name from Firebase display name or email
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

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dash-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at 20% 10%, rgba(124,58,237,0.15) 0%, transparent 50%),
                      #080712;
          font-family: 'Inter', system-ui, sans-serif;
          color: #e2e8f0;
        }
        .dash-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 32px;
          border-bottom: 1px solid rgba(167,139,250,0.1);
          backdrop-filter: blur(10px);
          position: sticky; top: 0; z-index: 10;
          background: rgba(8,7,18,0.8);
        }
        .dash-logo { font-size: 18px; font-weight: 800; color: #a78bfa; letter-spacing: -0.5px; }
        .dash-user { display: flex; align-items: center; gap: 12px; }
        .dash-email { font-size: 13px; color: #64748b; }
        .logout-btn {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(167,139,250,0.2);
          color: #94a3b8; font-size: 13px; padding: 6px 14px; border-radius: 6px;
          cursor: pointer; transition: all 0.2s;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }

        .dash-body { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
        .dash-welcome { margin-bottom: 40px; }
        .dash-welcome h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .dash-welcome h1 span { color: #a78bfa; }
        .dash-welcome p { color: #64748b; font-size: 15px; }

        .status-card {
          background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.06));
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: 16px; padding: 28px;
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 24px; margin-bottom: 40px;
        }
        .status-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
        .status-item p { font-size: 18px; font-weight: 700; color: #e2e8f0; margin-top: 4px; }
        .status-item p.days { color: #a78bfa; }

        .content-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .content-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(167,139,250,0.12);
          border-radius: 14px; padding: 24px;
          text-decoration: none; display: block;
          transition: all 0.2s; cursor: pointer;
        }
        .content-card:hover { background: rgba(167,139,250,0.06); border-color: rgba(167,139,250,0.3); transform: translateY(-2px); }
        .card-icon { font-size: 28px; margin-bottom: 12px; }
        .card-title { font-size: 16px; font-weight: 600; color: #e2e8f0; margin-bottom: 6px; }
        .card-desc { font-size: 13px; color: #64748b; line-height: 1.5; }

        .renew-strip {
          margin-top: 40px;
          background: linear-gradient(135deg, #1e0a3c, #0f172a);
          border: 1px solid rgba(167,139,250,0.25);
          border-radius: 14px; padding: 24px 28px;
          display: flex; align-items: center; justify-content: space-between; gap: 20px;
          flex-wrap: wrap;
        }
        .renew-strip p { font-size: 14px; color: #94a3b8; }
        .renew-strip strong { color: #a78bfa; }
        .renew-cta {
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: white; border: none; padding: 10px 22px;
          border-radius: 8px; font-weight: 700; font-size: 14px;
          cursor: pointer; text-decoration: none; white-space: nowrap;
          transition: opacity 0.2s;
        }
        .renew-cta:hover { opacity: 0.88; }
      `}</style>

      <div className="dash-page">
        {/* ── New Member: Password Setup Banner ─────────────────── */}
        {isNewMember && !bannerDismissed && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
            borderBottom: '1px solid rgba(16,185,129,0.25)',
            padding: '14px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap',
            fontSize: '14px', color: '#6ee7b7',
          }}>
            <span>
              ✉️ <strong>Check your email</strong> — we&apos;ve sent a link to set your password for future logins.
              You&apos;re already signed in and ready to go!
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              id="dismiss-banner-btn"
              style={{
                background: 'none', border: '1px solid rgba(16,185,129,0.3)',
                color: '#6ee7b7', padding: '4px 12px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap',
              }}
            >
              Got it ✕
            </button>
          </div>
        )}

        <nav className="dash-nav">
          <span className="dash-logo">SSLDUCK</span>
          <div className="dash-user">
            <span className="dash-email">{user?.email}</span>
            <button onClick={handleLogout} className="logout-btn" id="dash-logout-btn">Sign Out</button>
          </div>
        </nav>

        <main className="dash-body">
          <div className="dash-welcome">
            <h1>Welcome{isNewMember ? '' : ' back'}, <span>{firstName}</span> 👋</h1>
            <p>{isNewMember ? 'Your purchase is confirmed. Your content is ready below.' : 'Your premium content is ready and waiting.'}</p>
          </div>

          {/* Access Status Card */}
          {access && (
            <div className="status-card">
              <div className="status-item">
                <label>Plan</label>
                <p>{access.plan_type === '12_month' ? '12-Month' : '6-Month'} Access</p>
              </div>
              <div className="status-item">
                <label>Member Since</label>
                <p>{formatDate(access.purchase_date.toDate())}</p>
              </div>
              <div className="status-item">
                <label>Expires</label>
                <p>{formatDate(access.expiration_date.toDate())}</p>
              </div>
              <div className="status-item">
                <label>Days Remaining</label>
                <p className="days">{daysLeft} days</p>
              </div>
            </div>
          )}

          {/* Content Links — add new cards here as you build more pages */}
          <div className="content-grid">
            <a href="/fulfillment/course-materials" className="content-card" id="dash-link-course">
              <div className="card-icon">📚</div>
              <div className="card-title">Course Materials</div>
              <div className="card-desc">Access all your downloadable resources and training content.</div>
            </a>
            <a href="/fulfillment/bonus-videos" className="content-card" id="dash-link-videos">
              <div className="card-icon">🎬</div>
              <div className="card-title">Bonus Videos</div>
              <div className="card-desc">Exclusive video walkthroughs and deep-dive sessions.</div>
            </a>
            {/* ↓ Add new content links here as you create new pages */}
          </div>

          {/* Renewal Strip */}
          {daysLeft !== null && daysLeft <= 60 && (
            <div className="renew-strip">
              <p>⚡ <strong>{daysLeft} days</strong> left on your membership — lock in the current rate before it rises.</p>
              <a href="/welcome-and-offer?renew=true" className="renew-cta" id="dash-renew-btn">
                Extend My Access →
              </a>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default function FulfillmentPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(167,139,250,0.2)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <FulfillmentDashboard />
    </Suspense>
  );
}
