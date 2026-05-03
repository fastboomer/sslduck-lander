'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

const googleProvider = new GoogleAuthProvider();

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/fulfillment';

  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // If already signed in, redirect immediately
  useEffect(() => {
    const cookie = document.cookie.includes('firebase-session');
    if (cookie) router.replace(redirect);
  }, [redirect, router]);

  const createSession = async (idToken: string) => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Throw with a special code so friendlyError can surface the real message
      const err: any = new Error(body.detail || 'Session creation failed');
      err.code = 'session/failed';
      err.sessionDetail = body.detail || body.error || 'Unknown server error';
      throw err;
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      await createSession(idToken);
      router.replace(redirect);
    } catch (err: any) {
      setError(err.sessionDetail ? `Server error: ${err.sessionDetail}` : friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await createSession(idToken);
      router.replace(redirect);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.sessionDetail ? `Server error: ${err.sessionDetail}` : friendlyError(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
      });
      setResetSent(true);
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      {/* Logo / Brand */}
      <div className="login-brand">
        <div className="login-logo">S</div>
        <h1 className="login-title">SSLDUCK Members</h1>
        <p className="login-subtitle">
          {mode === 'signin' ? 'Sign in to access your content' : 'Reset your password'}
        </p>
      </div>

      {mode === 'signin' ? (
        <>
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="google-btn"
            id="login-google-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="divider"><span>or sign in with email</span></div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="login-form">
            <div className="field-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="field-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="submit-btn"
            >
              {loading ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                'Sign In to My Content'
              )}
            </button>
          </form>

          <button
            onClick={() => { setMode('reset'); setError(''); }}
            className="forgot-link"
            id="login-forgot-link"
          >
            Forgot password?
          </button>
        </>
      ) : (
        /* Password Reset Form */
        <form onSubmit={handlePasswordReset} className="login-form">
          {resetSent ? (
            <div className="reset-success">
              <div className="reset-icon">✉️</div>
              <p>Check your inbox! A password reset link has been sent to <strong>{email}</strong>.</p>
              <button
                onClick={() => { setMode('signin'); setResetSent(false); }}
                className="submit-btn"
                style={{ marginTop: '16px' }}
                id="login-back-signin-btn"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="field-group">
                <label htmlFor="reset-email">Your email address</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {error && <p className="login-error" role="alert">{error}</p>}
              <button
                id="login-reset-submit-btn"
                type="submit"
                disabled={loading}
                className="submit-btn"
              >
                {loading ? <span className="spinner" aria-hidden="true" /> : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className="forgot-link"
                id="login-cancel-reset-btn"
              >
                ← Back to Sign In
              </button>
            </>
          )}
        </form>
      )}

      <p className="login-footer">
        Not a member yet?{' '}
        <a href="/" id="login-purchase-link">Get access here →</a>
      </p>
    </div>
  );
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    // Modern Firebase SDK v10+ error codes
    'auth/invalid-login-credentials':    'Email or password is incorrect.',
    'auth/invalid-credential':           'Email or password is incorrect.',
    // Legacy error codes (still used in some flows)
    'auth/wrong-password':               'Incorrect password. Try again or reset it below.',
    'auth/user-not-found':               'No account found with that email.',
    'auth/invalid-email':                'Please enter a valid email address.',
    'auth/too-many-requests':            'Too many attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed':       'Network error. Check your connection and try again.',
    'auth/user-disabled':                'This account has been disabled. Please contact support.',
    'auth/email-already-in-use':         'An account with this email already exists.',
    'auth/weak-password':                'Password must be at least 6 characters.',
    'auth/operation-not-allowed':        'Email/password sign-in is not enabled. Please contact support.',
    'auth/popup-closed-by-user':         '', // silent — user intentionally closed
    'auth/popup-blocked':                'Popup was blocked. Please allow popups for this site and try again.',
    'auth/cancelled-popup-request':      '', // silent
    'auth/account-exists-with-different-credential': 'An account already exists with this email. Try signing in with Google instead.',
  };
  // Show the raw code in fallback so we can always diagnose
  return map[code] ?? (code ? `Auth error: ${code}` : 'Something went wrong. Please try again.');
}

export default function LoginPage() {
  return (
    <>
      <style>{`
        :root {
          --purple-deep: #0f0a1e;
          --purple-mid: #1a0f3a;
          --purple-accent: #7c3aed;
          --purple-light: #a78bfa;
          --purple-glow: rgba(124, 58, 237, 0.3);
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --border: rgba(167, 139, 250, 0.15);
          --input-bg: rgba(255,255,255,0.04);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.2) 0%, transparent 60%),
                      radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.1) 0%, transparent 60%),
                      #080712;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(15, 10, 30, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 40px 36px;
          box-shadow: 0 0 60px rgba(124,58,237,0.15), 0 24px 48px rgba(0,0,0,0.4);
        }

        .login-brand { text-align: center; margin-bottom: 32px; }

        .login-logo {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 24px; font-weight: 800; color: white;
          margin-bottom: 16px;
          box-shadow: 0 0 30px var(--purple-glow);
        }

        .login-title {
          font-size: 22px; font-weight: 700; color: var(--text-primary);
          margin-bottom: 6px;
        }

        .login-subtitle { font-size: 14px; color: var(--text-secondary); }

        .google-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 12px 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 15px; font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 20px;
        }
        .google-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(167,139,250,0.4); }
        .google-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .divider {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 20px;
          color: var(--text-secondary); font-size: 13px;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }

        .login-form { display: flex; flex-direction: column; gap: 16px; }

        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-group label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .field-group input {
          padding: 11px 14px;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
        }
        .field-group input:focus { border-color: var(--purple-accent); }
        .field-group input::placeholder { color: #475569; }

        .login-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
        }

        .submit-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          border: none; border-radius: 10px;
          color: white; font-size: 15px; font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          display: flex; align-items: center; justify-content: center;
          min-height: 46px;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .forgot-link {
          background: none; border: none;
          color: var(--purple-light);
          font-size: 13px; cursor: pointer;
          text-align: center; width: 100%;
          margin-top: 8px;
          padding: 4px;
          transition: opacity 0.2s;
        }
        .forgot-link:hover { opacity: 0.75; }

        .reset-success { text-align: center; }
        .reset-icon { font-size: 40px; margin-bottom: 16px; }
        .reset-success p { color: var(--text-secondary); line-height: 1.6; font-size: 14px; }
        .reset-success strong { color: var(--text-primary); }

        .login-footer {
          text-align: center;
          margin-top: 28px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .login-footer a { color: var(--purple-light); text-decoration: none; }
        .login-footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="login-page">
        <Suspense fallback={<div style={{ color: '#a78bfa' }}>Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
