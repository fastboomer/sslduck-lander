'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractTextFromFile } from '@/lib/extract-text';
import * as LZString from 'lz-string';
import * as QRCode from 'qrcode';

// ── FileInput Component ───────────────────────────────────────────────────────
function FileInput({
  id,
  label,
  required,
  onChange,
  onTextExtracted,
}: {
  id: string;
  label: string;
  required?: boolean;
  onChange: (file: File | null) => void;
  onTextExtracted: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileName(file?.name ?? '');
    onChange(file);
    setError('');

    if (file) {
      setLoading(true);
      try {
        const text = await extractTextFromFile(file);
        onTextExtracted(text);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onTextExtracted('');
      } finally {
        setLoading(false);
      }
    } else {
      onTextExtracted('');
    }
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = '';
    setFileName('');
    onChange(null);
    setError('');
    onTextExtracted('');
  };

  return (
    <div className="iv-field">
      <label className="iv-label" htmlFor={id}>
        {label}
        {required && <span className="iv-required"> *</span>}
      </label>
      <div className="iv-file-row">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={handleChange}
          className="iv-file-input"
        />
        {fileName && (
          <button type="button" onClick={handleClear} className="iv-clear-btn" title="Clear file">
            ✕
          </button>
        )}
      </div>
      {loading && <span className="iv-file-loading"><span className="iv-spinner-small"></span>Extracting text...</span>}
      {error && <span className="iv-file-error">⚠️ {error}</span>}
      {fileName && !loading && !error && <span className="iv-filename">✅ Ready: {fileName}</span>}
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function VoiceInterviewPage() {
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [showResumeEditor, setShowResumeEditor] = useState(false);

  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobText, setJobText] = useState('');

  const [deviceMode, setDeviceMode] = useState<'pc' | 'mobile'>('pc');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // QR string states
  const [compressedParam, setCompressedParam] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [textStats, setTextStats] = useState({ originalLength: 0, compressedLength: 0 });

  // Reset copied status
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(t);
  }, [copied]);

  // Master Prompt Constructor
  const getMasterPrompt = (resText: string, jobDText: string) => {
    return `[SYSTEM INSTRUCTION - DO NOT BREAK CHARACTER]
You are a highly experienced hiring manager conducting a realistic mock interview for the position described in the JOB DESCRIPTION below. Your evaluation must be based strictly on the candidate's RESUME attached below.

YOUR INTERVIEW BEHAVIOR RULES:
1. Ask exactly ONE question at a time. Wait for my verbal response before moving on.
2. Mix standard behavioral questions with targeted, tough questions that intentionally probe gaps, short tenures, or skill shortcomings evident in my resume relative to the job requirements.
3. After I answer a question, pause the interview briefly to discuss my answer. Provide constructive feedback on how I can better align my answer with the STAR strategy (Situation, Task, Action, Result).
4. CRITICAL: The VERY FIRST TIME you provide STAR feedback, you must first give a brief, clear explanation of how the STAR system works, what each letter stands for, and why it matters. For subsequent questions, skip the formal definition and just provide the inline optimization strategy.

[TARGET JOB DESCRIPTION]
"${jobDText.trim()}"

[USER RESUME]
"${resText.trim()}"

Begin the interview now by introducing yourself and asking the first question.`;
  };

  // Compile QR Code values dynamically as texts change
  useEffect(() => {
    if (!resumeText.trim() || !jobText.trim()) {
      setCompressedParam('');
      setQrUrl('');
      setQrCodeDataUrl('');
      setTextStats({ originalLength: 0, compressedLength: 0 });
      return;
    }

    const masterPrompt = getMasterPrompt(resumeText, jobText);
    const compressed = LZString.compressToEncodedURIComponent(masterPrompt);
    setCompressedParam(compressed);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sslduck-lander.vercel.app';
    const finalQrUrl = `${baseUrl}/m?p=${compressed}`;
    setQrUrl(finalQrUrl);

    setTextStats({
      originalLength: masterPrompt.length,
      compressedLength: compressed.length
    });

    // Generate pure image-based Base64 Data URL for the QR code
    QRCode.toDataURL(
      finalQrUrl,
      {
        width: 300,
        margin: 2,
        color: {
          dark: '#002366',
          light: '#FFFFFF'
        }
      },
      (err, url) => {
        if (err) {
          console.error('QR generation error:', err);
          setQrCodeDataUrl('');
        } else {
          setQrCodeDataUrl(url);
        }
      }
    );
  }, [resumeText, jobText]);

  const handleCombineAndLaunchPC = async () => {
    if (!resumeText.trim() || !jobText.trim()) {
      setErrorMsg('Please upload your Resume and Job Description (or paste it) first.');
      return;
    }
    setErrorMsg('');

    try {
      const masterPrompt = getMasterPrompt(resumeText, jobText);
      await navigator.clipboard.writeText(masterPrompt);
      setCopied(true);

      // Open Google Gemini web app in new tab
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to copy automatically. Please select and copy the prompt text manually.');
    }
  };

  const isFormValid = resumeText.trim().length > 0 && jobText.trim().length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .iv-page {
          min-height: 100vh;
          background: #ffffff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
          display: flex;
          flex-direction: column;
        }

        /* ── Nav ───────────────────────────────── */
        .iv-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 40px;
          border-bottom: 2px solid #002366;
          background: #ffffff;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .iv-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          cursor: pointer;
        }
        .iv-nav-logo-img {
          height: 40px;
          width: auto;
        }
        .iv-nav-logo-text {
          display: flex;
          flex-direction: column;
        }
        .iv-nav-logo-name {
          font-size: 17px;
          font-weight: 900;
          color: #002366;
          letter-spacing: -0.5px;
          line-height: 1;
          font-family: Georgia, serif;
        }
        .iv-nav-logo-tagline {
          font-size: 8px;
          font-weight: 700;
          color: rgba(0,35,102,0.4);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .iv-nav-back {
          background: none;
          border: 2px solid #002366;
          color: #002366;
          font-size: 13px;
          font-weight: 700;
          padding: 7px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .iv-nav-back:hover { background: #002366; color: #ffffff; }

        /* ── Body ──────────────────────────────── */
        .iv-body {
          max-width: 860px;
          width: 100%;
          margin: 0 auto;
          padding: 52px 32px 80px;
          flex-grow: 1;
        }

        /* ── Page Header ───────────────────────── */
        .iv-header {
          margin-bottom: 40px;
        }
        .iv-header-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 12px;
        }
        .iv-header h1 {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 900;
          color: #002366;
          letter-spacing: -1px;
          line-height: 1.15;
          margin-bottom: 14px;
        }
        .iv-header-sub {
          font-size: 0.95rem;
          color: #475569;
          line-height: 1.6;
          font-weight: 500;
          max-width: 720px;
        }

        /* ── Card ──────────────────────────────── */
        .iv-card {
          border: 2px solid #002366;
          padding: 36px;
          margin-bottom: 28px;
          background: #ffffff;
        }
        .iv-card-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #002366;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0,35,102,0.15);
        }

        /* ── Form Fields ───────────────────────── */
        .iv-field {
          margin-bottom: 24px;
        }
        .iv-field:last-child { margin-bottom: 0; }
        .iv-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #002366;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }
        .iv-required { color: #dc2626; }

        .iv-file-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .iv-file-input {
          flex: 1;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          color: #002366;
          background: rgba(0,35,102,0.04);
          border: 1px solid rgba(0,35,102,0.25);
          border-radius: 6px;
          padding: 9px 12px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .iv-file-input:hover { border-color: #002366; }
        
        .iv-clear-btn {
          background: none;
          border: 1px solid #dc2626;
          color: #dc2626;
          font-size: 12px;
          font-weight: 700;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .iv-clear-btn:hover { background: #fee2e2; }
        
        .iv-filename {
          display: block;
          font-size: 12px;
          color: #047857;
          margin-top: 6px;
          font-weight: 600;
        }
        .iv-file-loading {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #475569;
          margin-top: 6px;
          font-weight: 500;
        }
        .iv-file-error {
          display: block;
          font-size: 12px;
          color: #dc2626;
          margin-top: 6px;
          font-weight: 600;
        }

        .iv-textarea {
          width: 100%;
          min-height: 120px;
          resize: vertical;
          border: 1px solid rgba(0,35,102,0.25);
          background: rgba(0,35,102,0.01);
          border-radius: 6px;
          padding: 12px;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.5;
          color: #0f172a;
          margin-bottom: 0;
          transition: border-color 0.2s;
        }
        .iv-textarea:focus { outline: 2px solid #002366; border-color: #002366; }

        .iv-toggle-editor {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 11px;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          margin-top: 6px;
        }
        .iv-toggle-editor:hover { color: #1d4ed8; }

        /* ── Device Toggle Switch ──────────────── */
        .iv-toggle-container {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin: 32px 0 24px;
        }
        .iv-toggle-btn {
          flex: 1;
          max-width: 220px;
          padding: 12px 20px;
          background: #ffffff;
          border: 2px solid rgba(0,35,102,0.2);
          border-radius: 8px;
          color: #475569;
          font-family: inherit;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .iv-toggle-btn:hover {
          border-color: rgba(0,35,102,0.5);
          color: #002366;
        }
        .iv-toggle-active {
          border-color: #002366;
          background: rgba(0,35,102,0.04);
          color: #002366;
          box-shadow: inset 0 2px 4px rgba(0,35,102,0.05);
        }

        /* ── Action Buttons ────────────────────── */
        .iv-action-card {
          border: 2px solid #002366;
          padding: 36px;
          background: #ffffff;
          text-align: center;
        }
        
        .iv-primary-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 480px;
          padding: 14px 28px;
          background: linear-gradient(to bottom, #4DA3FF 0%, #006BFF 45%, #0047B3 100%);
          color: #ffffff;
          border: 1px solid #003A99;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Inter', system-ui, sans-serif;
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(0,35,102,0.3);
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .iv-primary-btn::before {
          content: "";
          position: absolute;
          top: 0; left: 8%;
          width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%;
          pointer-events: none;
        }
        .iv-primary-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #66B3FF 0%, #0077FF 45%, #0052CC 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 6px 16px rgba(0,35,102,0.4);
          transform: translateY(-1px);
        }
        .iv-primary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .iv-success-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 6px;
          margin-top: 14px;
          animation: fadeIn 0.3s ease-out;
        }

        .iv-error-alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: left;
        }

        /* ── QR Code View ──────────────────────── */
        .iv-qr-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 20px 0;
        }
        .iv-qr-border {
          padding: 18px;
          background: #ffffff;
          border: 3px solid #002366;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,35,102,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .iv-qr-stats {
          font-size: 11px;
          color: #64748b;
          margin-top: 10px;
          font-weight: 500;
        }

        .iv-alert-banner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
          font-size: 12px;
          font-weight: 500;
          padding: 12px 14px;
          border-radius: 6px;
          margin-top: 16px;
          text-align: left;
          line-height: 1.5;
        }

        .iv-instructions {
          text-align: left;
          background: rgba(0,35,102,0.03);
          border-left: 4px solid #002366;
          padding: 20px;
          border-radius: 0 8px 8px 0;
          margin-top: 28px;
        }
        .iv-instructions-title {
          font-size: 13px;
          font-weight: 800;
          color: #002366;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .iv-instructions-list {
          list-style: none;
        }
        .iv-instructions-list li {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 8px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .iv-instructions-list li strong {
          color: #002366;
        }
        .iv-bullet-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: #002366;
          color: #ffffff;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* ── Spinner ───────────────────────────── */
        .iv-spinner-small {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(0,35,102,0.2);
          border-top-color: #002366;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Footer ────────────────────────────── */
        .iv-footer {
          border-top: 2px solid #002366;
          padding: 20px 40px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }

        @media (max-width: 640px) {
          .iv-nav { padding: 14px 20px; }
          .iv-body { padding: 32px 16px 60px; }
          .iv-card { padding: 24px 20px; }
          .iv-action-card { padding: 24px 20px; }
          .iv-footer { padding: 20px; }
        }
      `}</style>

      <div className="iv-page">
        {/* Nav */}
        <nav className="iv-nav">
          <a href="https://sslduck-lander.vercel.app" className="iv-nav-logo">
            <img src="/logo.png" alt="SSLDuck Logo" className="iv-nav-logo-img" />
            <div className="iv-nav-logo-text">
              <span className="iv-nav-logo-name">SSLDUCK</span>
              <span className="iv-nav-logo-tagline">VERSION 12-PRO</span>
            </div>
          </a>
          <button className="iv-nav-back" onClick={() => router.push('/fulfillment')}>
            ← Back to Suite
          </button>
        </nav>

        {/* Body */}
        <div className="iv-body">
          {/* Page Header */}
          <div className="iv-header">
            <p className="iv-header-eyebrow">AI Career Suite · Voice Interactive Practice</p>
            <h1>Interactive Voice Mock Interview</h1>
            <p className="iv-header-sub">
              Conduct a highly realistic, responsive mock interview modeled on actual hiring manager interactions. Weave your specific background and the target requirements into a high-density AI context tailored for Gemini voice dialogue.
            </p>
          </div>

          {/* Form Card */}
          <div className="iv-card">
            <p className="iv-card-title">1. Upload Documents</p>

            {/* Resume Upload Dropzone */}
            <FileInput
              id="iv-resume"
              label="Upload Current Resume (PDF, Word, or TXT)"
              required
              onChange={setResumeFile}
              onTextExtracted={(text) => {
                setResumeText(text);
                if (text) {
                  setErrorMsg('');
                }
              }}
            />

            {resumeText && (
              <div className="iv-field" style={{ marginTop: '-8px' }}>
                <button
                  type="button"
                  onClick={() => setShowResumeEditor(!showResumeEditor)}
                  className="iv-toggle-editor"
                >
                  {showResumeEditor ? 'Hide Extracted Resume Text' : 'View / Edit Extracted Resume Text'}
                </button>
                {showResumeEditor && (
                  <textarea
                    className="iv-textarea"
                    style={{ marginTop: '8px', minHeight: '160px', fontFamily: 'monospace', fontSize: '12px' }}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Job Description Zone */}
            <div className="iv-field" style={{ marginTop: '28px' }}>
              <FileInput
                id="iv-job-file"
                label="Upload Target Job Description (Optional PDF, Word, or TXT)"
                onChange={setJobFile}
                onTextExtracted={(text) => {
                  if (text) {
                    setJobText(text);
                    setErrorMsg('');
                  }
                }}
              />
            </div>

            <div className="iv-field">
              <label className="iv-label" htmlFor="iv-jobdesc">
                📂 PASTE OR REFINE TARGET JOB REQUIREMENTS <span className="iv-required"> *</span>
              </label>
              <textarea
                id="iv-jobdesc"
                className="iv-textarea"
                placeholder="Paste the employer's target job description or paste requirements text here. Make sure you include the job title and employer name!"
                value={jobText}
                onChange={(e) => {
                  setJobText(e.target.value);
                  if (e.target.value) {
                    setErrorMsg('');
                  }
                }}
              />
            </div>
          </div>

          {/* Device selection toggle */}
          <div className="iv-toggle-container">
            <button
              type="button"
              className={`iv-toggle-btn ${deviceMode === 'pc' ? 'iv-toggle-active' : ''}`}
              onClick={() => setDeviceMode('pc')}
            >
              💻 Practice on PC / Laptop
            </button>
            <button
              type="button"
              className={`iv-toggle-btn ${deviceMode === 'mobile' ? 'iv-toggle-active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
            >
              📱 Practice on Mobile Phone
            </button>
          </div>

          {/* Action Area */}
          <div className="iv-action-card">
            {errorMsg && <div className="iv-error-alert">{errorMsg}</div>}

            {deviceMode === 'pc' ? (
              // 💻 PC MODE
              <div>
                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                  Clicking the button below copies your generated <strong>Master Interview Prompt</strong> directly to your clipboard and opens Gemini in a new window. Simply paste the prompt into Gemini to initiate your mock interview.
                </p>
                <button
                  type="button"
                  className="iv-primary-btn"
                  onClick={handleCombineAndLaunchPC}
                  disabled={!isFormValid}
                  id="launch-voice-pc-btn"
                >
                  🚀 Copy Prompt & Launch Gemini
                </button>
                <br />
                {copied && (
                  <div className="iv-success-indicator">
                    <span>✓</span> Prompt copied successfully! Opening Gemini...
                  </div>
                )}

                <div className="iv-instructions">
                  <p className="iv-instructions-title">How to Practice on PC:</p>
                  <ul className="iv-instructions-list">
                    <li>
                      <span className="iv-bullet-num">1</span>
                      <span>Click the button above to copy the Master Prompt and launch Gemini.</span>
                    </li>
                    <li>
                      <span className="iv-bullet-num">2</span>
                      <span>In the Gemini page, paste (Ctrl+V) the prompt into the message box.</span>
                    </li>
                    <li>
                      <span className="iv-bullet-num">3</span>
                      <span>To conduct the mock interview using your voice, click the <strong>Microphone icon</strong> inside the Gemini text box. Speak naturally to answer!</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              // 📱 MOBILE MODE
              <div>
                <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                  Scan the dynamic QR code below using your mobile phone&apos;s camera to seamlessly hand off the prompt. Your phone will open a secure landing page where you can copy the prompt and launch Gemini instantly!
                </p>

                {!isFormValid ? (
                  <div style={{ padding: '40px', border: '2px dashed rgba(0,35,102,0.15)', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                    Please upload your resume and job description to generate your dynamic QR code.
                  </div>
                ) : (
                  <div className="iv-qr-container">
                    <div className="iv-qr-border">
                      {qrCodeDataUrl ? (
                        <img
                          src={qrCodeDataUrl}
                          alt="Voice Interview Practice Mobile Handoff QR Code"
                          style={{
                            width: '280px',
                            height: '280px',
                            display: 'block',
                            borderRadius: '8px'
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', height: '280px', justifyContent: 'center', width: '280px' }}>
                          <span className="iv-spinner-small"></span> Generating secure QR code...
                        </div>
                      )}
                    </div>
                    <div className="iv-qr-stats">
                      Handoff Package size: {textStats.originalLength} chars (Compressed to {textStats.compressedLength} bytes)
                    </div>

                    {textStats.compressedLength > 2900 && (
                      <div className="iv-alert-banner">
                        <span>ℹ️</span>
                        <span>
                          <strong>Pro Tip:</strong> Your resume or job description is very detailed. The QR code is dense but fully functional. When scanning, hold your phone steady about 10–12 inches back from the computer screen to let your camera scan it with ease.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="iv-instructions">
                  <p className="iv-instructions-title">How to Practice on Mobile:</p>
                  <ul className="iv-instructions-list">
                    <li>
                      <span className="iv-bullet-num">1</span>
                      <span>Scan the QR code using your phone camera (or a QR reader app).</span>
                    </li>
                    <li>
                      <span className="iv-bullet-num">2</span>
                      <span>Tap the link that appears to load your secure mobile handoff screen.</span>
                    </li>
                    <li>
                      <span className="iv-bullet-num">3</span>
                      <span>Tap <strong>&quot;Copy Prompt &amp; Launch Gemini&quot;</strong> on your phone.</span>
                    </li>
                    <li>
                      <span className="iv-bullet-num">4</span>
                      <span>Paste the prompt into the mobile Gemini application, tap the microphone to start speaking, and enjoy a hands-free voice mock interview!</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="iv-footer">
          <p className="iv-footer-copy">© 2026 SSLDUCK Career Suite. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
