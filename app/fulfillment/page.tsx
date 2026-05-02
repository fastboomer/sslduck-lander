'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';
import { extractTextFromFile } from '@/lib/extract-text';
import { buildPrompt, estimatePromptStats } from '@/lib/prompt-template';

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

  // Resume tool state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      const snap = await getDoc(doc(db, 'user_access', u.uid));
      if (snap.exists()) setAccess(snap.data() as AccessInfo);
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

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file);
    setResumeText('');
    setExtractError(null);
    setIsExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.length < 50) throw new Error('Could not extract readable text. Try a different file format.');
      setResumeText(text);
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Failed to read file.');
      setResumeFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBuildAndCopy = async () => {
    if (!resumeText || !jobDescription.trim()) return;
    setCopyError(null);
    const prompt = buildPrompt({ resumeText, jobDescription, additionalComments });
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 4000);
    } catch {
      setCopyError('Clipboard access denied. Please copy manually from the preview below.');
    }
  };

  const promptStats = resumeText && jobDescription
    ? estimatePromptStats(buildPrompt({ resumeText, jobDescription, additionalComments }))
    : null;

  const isReady = !!resumeText && jobDescription.trim().length > 20;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .dash-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 20% 10%, rgba(124,58,237,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 90%, rgba(59,130,246,0.08) 0%, transparent 50%),
            #080712;
          font-family: 'Inter', system-ui, sans-serif;
          color: #e2e8f0;
        }

        /* ── Nav ───────────────────────────────────────── */
        .dash-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 32px;
          border-bottom: 1px solid rgba(167,139,250,0.1);
          backdrop-filter: blur(10px);
          position: sticky; top: 0; z-index: 20;
          background: rgba(8,7,18,0.85);
        }
        .dash-logo { font-size: 18px; font-weight: 900; color: #a78bfa; letter-spacing: -0.5px; }
        .dash-user { display: flex; align-items: center; gap: 12px; }
        .dash-email { font-size: 13px; color: #475569; }
        .logout-btn {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(167,139,250,0.2);
          color: #94a3b8; font-size: 13px; padding: 6px 14px; border-radius: 6px;
          cursor: pointer; transition: all 0.2s;
        }
        .logout-btn:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }

        /* ── Body ──────────────────────────────────────── */
        .dash-body { max-width: 860px; margin: 0 auto; padding: 48px 24px 80px; }

        /* ── Welcome ───────────────────────────────────── */
        .dash-welcome { margin-bottom: 8px; }
        .dash-welcome h1 { font-size: 30px; font-weight: 800; line-height: 1.2; }
        .dash-welcome h1 span { color: #a78bfa; }
        .dash-welcome p { color: #64748b; font-size: 15px; margin-top: 8px; }

        /* ── Access badge ──────────────────────────────── */
        .access-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(124,58,237,0.1); border: 1px solid rgba(167,139,250,0.2);
          border-radius: 999px; padding: 5px 14px; font-size: 12px;
          color: #a78bfa; font-weight: 600; letter-spacing: 0.3px;
          margin-bottom: 36px;
        }
        .access-dot { width: 7px; height: 7px; background: #a78bfa; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

        /* ── Section label ─────────────────────────────── */
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: #475569; margin-bottom: 16px;
        }

        /* ── Intro card ────────────────────────────────── */
        .intro-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(167,139,250,0.12);
          border-radius: 20px; padding: 32px 36px; margin-bottom: 40px;
        }
        .intro-card h2 {
          font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 14px;
        }
        .intro-card p {
          font-size: 14px; color: #94a3b8; line-height: 1.75; margin-bottom: 10px;
        }
        .intro-card p:last-child { margin-bottom: 0; }

        /* ── How it works steps ────────────────────────── */
        .steps-row {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px; margin: 28px 0 0;
        }
        .step-box {
          background: rgba(124,58,237,0.06); border: 1px solid rgba(167,139,250,0.15);
          border-radius: 14px; padding: 20px 18px; text-align: center;
        }
        .step-num {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: white;
          margin-bottom: 12px;
        }
        .step-title { font-size: 13px; font-weight: 700; color: #e2e8f0; margin-bottom: 6px; }
        .step-desc { font-size: 12px; color: #64748b; line-height: 1.5; }

        /* ── Tool card ─────────────────────────────────── */
        .tool-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(167,139,250,0.15);
          border-radius: 20px; padding: 36px; margin-bottom: 40px;
        }
        .tool-card h2 {
          font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 6px;
        }
        .tool-card > p {
          font-size: 13px; color: #64748b; margin-bottom: 32px;
        }

        /* ── Input groups ──────────────────────────────── */
        .input-group { margin-bottom: 28px; }
        .input-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 10px;
        }
        .input-label .badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; padding: 2px 7px; border-radius: 4px;
        }
        .badge-required { background: rgba(124,58,237,0.2); color: #a78bfa; }
        .badge-optional { background: rgba(100,116,139,0.15); color: #64748b; }

        /* Upload drop zone */
        .upload-zone {
          border: 2px dashed rgba(167,139,250,0.25);
          border-radius: 12px; padding: 28px 20px;
          text-align: center; cursor: pointer;
          transition: all 0.2s; position: relative;
          background: rgba(124,58,237,0.03);
        }
        .upload-zone:hover { border-color: rgba(167,139,250,0.5); background: rgba(124,58,237,0.07); }
        .upload-zone input[type="file"] {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        .upload-icon { font-size: 28px; margin-bottom: 10px; }
        .upload-title { font-size: 14px; font-weight: 600; color: #cbd5e1; margin-bottom: 4px; }
        .upload-sub { font-size: 12px; color: #475569; }
        .upload-file-name {
          margin-top: 10px; font-size: 12px; color: #a78bfa; font-weight: 600;
          background: rgba(124,58,237,0.12); padding: 4px 12px; border-radius: 6px;
          display: inline-block;
        }

        /* Textarea */
        .dash-textarea {
          width: 100%; padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(167,139,250,0.18);
          border-radius: 12px;
          color: #e2e8f0; font-size: 14px; font-family: inherit;
          resize: vertical; min-height: 130px; line-height: 1.6;
          outline: none; transition: border-color 0.2s;
        }
        .dash-textarea::placeholder { color: #334155; }
        .dash-textarea:focus { border-color: rgba(167,139,250,0.45); }

        /* ── CTA button ────────────────────────────────── */
        .build-btn {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          border: none; border-radius: 12px;
          color: white; font-size: 16px; font-weight: 800;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-top: 8px;
        }
        .build-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .build-btn:disabled {
          opacity: 0.3; cursor: not-allowed; transform: none;
          background: rgba(100,116,139,0.3);
        }
        .build-btn-note {
          text-align: center; font-size: 12px; color: #475569; margin-top: 10px;
        }

        /* ── Coming soon overlay ───────────────────────── */
        .coming-soon-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1px; color: #f59e0b;
          background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25);
          border-radius: 6px; padding: 3px 10px; margin-left: 10px;
        }

        /* ── Access status ─────────────────────────────── */
        .status-card {
          background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(167,139,250,0.04));
          border: 1px solid rgba(167,139,250,0.15);
          border-radius: 16px; padding: 24px 28px;
          display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 20px; margin-bottom: 32px;
        }
        .status-item label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
        .status-item p { font-size: 16px; font-weight: 700; color: #e2e8f0; margin-top: 4px; }
        .status-item p.days { color: #a78bfa; }

        /* ── Renewal strip ─────────────────────────────── */
        .renew-strip {
          background: linear-gradient(135deg, #1e0a3c, #0f172a);
          border: 1px solid rgba(167,139,250,0.2);
          border-radius: 14px; padding: 20px 24px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; margin-top: 32px;
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

        @media (max-width: 600px) {
          .dash-nav { padding: 14px 16px; }
          .dash-body { padding: 32px 16px 60px; }
          .tool-card { padding: 24px 20px; }
          .intro-card { padding: 24px 20px; }
        }
      `}</style>

      <div className="dash-page">

        {/* ── New Member Banner ───────────────────────────────── */}
        {isNewMember && !bannerDismissed && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
            borderBottom: '1px solid rgba(16,185,129,0.2)',
            padding: '13px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#6ee7b7',
          }}>
            <span>
              ✉️ <strong>One more step:</strong> Check your email for a link to set your password — so you can log back in anytime.
              You&apos;re already signed in and ready to start!
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

        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="dash-nav">
          <span className="dash-logo">SSLDUCK</span>
          <div className="dash-user">
            <span className="dash-email">{user?.email}</span>
            <button onClick={handleLogout} className="logout-btn" id="dash-logout-btn">Sign Out</button>
          </div>
        </nav>

        <main className="dash-body">

          {/* ── Welcome ─────────────────────────────────────────── */}
          <div className="dash-welcome">
            <h1>
              {isNewMember ? 'Welcome, ' : 'Welcome back, '}
              <span>{firstName}</span> 👋
            </h1>
            <p>
              {isNewMember
                ? 'Your purchase is confirmed — your resume optimizer is ready below.'
                : 'Your resume optimizer is ready. Pick up where you left off.'}
            </p>
          </div>

          {/* Access badge */}
          {access && (
            <div className="access-badge">
              <div className="access-dot" />
              {planLabel} Member &mdash; {daysLeft} days remaining
            </div>
          )}

          {/* ── Introduction ────────────────────────────────────── */}
          <p className="section-label">How This Works</p>
          <div className="intro-card">
            <h2>Your AI-Powered Resume Optimizer</h2>
            <p>
              This tool gives you the most powerful resume optimization workflow available — without expensive monthly
              subscriptions or sharing your personal documents with anyone. Everything happens on <strong style={{ color: '#e2e8f0' }}>your device</strong>, in your browser.
            </p>
            <p>
              You upload your resume and the job description you&apos;re targeting. The program assembles a precision-engineered
              prompt — built on years of professional resume writing expertise — and copies it to your clipboard. You then paste
              it into the AI of your choice (ChatGPT, Claude, Gemini, etc.) and get an elite-quality gap analysis in seconds.
            </p>
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              💡 <em>Your documents never leave your computer. Nothing is uploaded to our servers. Use it as many times as you like.</em>
            </p>

            <div className="steps-row">
              <div className="step-box">
                <div className="step-num">1</div>
                <div className="step-title">Upload Your Resume</div>
                <div className="step-desc">PDF or Word doc — we extract the text right in your browser</div>
              </div>
              <div className="step-box">
                <div className="step-num">2</div>
                <div className="step-title">Paste the Job Description</div>
                <div className="step-desc">Copy it directly from the job posting — full text works best</div>
              </div>
              <div className="step-box">
                <div className="step-num">3</div>
                <div className="step-title">Build &amp; Copy Prompt</div>
                <div className="step-desc">One click assembles everything and copies it to your clipboard</div>
              </div>
              <div className="step-box">
                <div className="step-num">4</div>
                <div className="step-title">Paste Into Any AI</div>
                <div className="step-desc">ChatGPT, Claude, Gemini — your choice, your account, your privacy</div>
              </div>
            </div>
          </div>

          {/* ── Resume Tool ──────────────────────────────────────── */}
          <p className="section-label">Resume Optimizer</p>
          <div className="tool-card">
            <h2>Build Your Optimization Prompt</h2>
            <p>Upload your resume and paste the job description — we&apos;ll assemble your expert prompt instantly.</p>

            {/* Input 1: Resume Upload */}
            <div className="input-group">
              <div className="input-label">
                <span>📄 Your Resume</span>
                <span className="badge badge-required">Required</span>
              </div>
              <div className="upload-zone">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  id="resume-upload"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }}
                />
                <div className="upload-icon">
                  {isExtracting ? '⏳' : resumeText ? '✅' : '📎'}
                </div>
                <div className="upload-title">
                  {isExtracting ? 'Reading your resume...' : resumeText ? resumeFile?.name : 'Click to upload your resume'}
                </div>
                <div className="upload-sub">
                  {isExtracting ? 'Extracting text in your browser — nothing leaves your device'
                    : resumeText ? `${resumeText.length.toLocaleString()} characters extracted ✓`
                    : 'PDF, Word (.docx), or plain text — max 5MB'}
                </div>
                {extractError && (
                  <div style={{ marginTop: 10, color: '#f87171', fontSize: 12 }}>⚠ {extractError}</div>
                )}
              </div>
            </div>

            {/* Input 2: Job Description */}
            <div className="input-group">
              <div className="input-label">
                <span>🎯 Target Job Description</span>
                <span className="badge badge-required">Required</span>
              </div>
              <textarea
                id="job-description-input"
                className="dash-textarea"
                placeholder="Paste the full job description here — include responsibilities, qualifications, and keywords from the posting. The more complete, the better your results."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={7}
              />
              {jobDescription.trim().length > 0 && (
                <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textAlign: 'right' }}>
                  {jobDescription.trim().length.toLocaleString()} characters
                </div>
              )}
            </div>

            {/* Input 3: Additional Comments */}
            <div className="input-group">
              <div className="input-label">
                <span>💬 Additional Notes</span>
                <span className="badge badge-optional">Optional</span>
              </div>
              <textarea
                id="additional-comments-input"
                className="dash-textarea"
                placeholder="Anything else for the AI to consider — career goals, gaps to address, achievements to highlight, tone preferences, etc."
                value={additionalComments}
                onChange={(e) => setAdditionalComments(e.target.value)}
                rows={4}
              />
            </div>

            {/* Prompt stats */}
            {promptStats && (
              <div style={{
                background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(167,139,250,0.15)',
                borderRadius: 10, padding: '10px 16px', marginBottom: 20,
                display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, color: '#94a3b8',
              }}>
                <span>📝 <strong style={{ color: '#a78bfa' }}>{promptStats.words.toLocaleString()}</strong> words</span>
                <span>🔤 <strong style={{ color: '#a78bfa' }}>{promptStats.chars.toLocaleString()}</strong> characters</span>
                <span>🧠 ~<strong style={{ color: '#a78bfa' }}>{promptStats.approxTokens.toLocaleString()}</strong> tokens (fits all major LLMs)</span>
              </div>
            )}

            {/* CTA */}
            <button
              id="build-prompt-btn"
              className="build-btn"
              disabled={!isReady || isExtracting}
              onClick={handleBuildAndCopy}
              style={isCopied ? { background: 'linear-gradient(135deg, #059669, #10b981)' } : undefined}
            >
              <span>{isCopied ? '✅' : '📋'}</span>
              {isCopied ? 'Copied to Clipboard!' : 'Build & Copy My Optimization Prompt'}
            </button>

            {copyError && (
              <p style={{ color: '#f87171', fontSize: 12, marginTop: 8, textAlign: 'center' }}>{copyError}</p>
            )}

            <p className="build-btn-note">
              {isCopied
                ? 'Now paste it into ChatGPT, Claude, Gemini, or any AI of your choice.'
                : isReady
                ? '✓ Ready — click to assemble your expert prompt and copy it to clipboard'
                : !resumeText
                ? 'Upload your resume to continue'
                : 'Paste a job description (at least a few sentences) to continue'}
            </p>
          </div>


          {/* ── Access Status ────────────────────────────────────── */}
          {access && (
            <>
              <p className="section-label">Your Membership</p>
              <div className="status-card">
                <div className="status-item">
                  <label>Plan</label>
                  <p>{planLabel} Access</p>
                </div>
                <div className="status-item">
                  <label>Member Since</label>
                  <p style={{ fontSize: '14px' }}>{formatDate(access.purchase_date.toDate())}</p>
                </div>
                <div className="status-item">
                  <label>Expires</label>
                  <p style={{ fontSize: '14px' }}>{formatDate(access.expiration_date.toDate())}</p>
                </div>
                <div className="status-item">
                  <label>Days Remaining</label>
                  <p className="days">{daysLeft} days</p>
                </div>
              </div>

              {daysLeft !== null && daysLeft <= 60 && (
                <div className="renew-strip">
                  <p>⚡ <strong>{daysLeft} days</strong> left — lock in your rate before it increases.</p>
                  <a href="/gap-analysis/offer?renew=true" className="renew-cta" id="dash-renew-btn">
                    Extend My Access →
                  </a>
                </div>
              )}
            </>
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
