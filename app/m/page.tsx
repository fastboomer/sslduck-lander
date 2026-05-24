'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { decompressFromEncodedURIComponent } from 'lz-string';

// ── Mobile Content Component ──────────────────────────────────────────────────
function MobileHandoffContent() {
  const searchParams = useSearchParams();
  const rawParam = searchParams.get('p') || '';

  const [promptText, setPromptText] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Extract and decompress prompt from URL
  useEffect(() => {
    if (!rawParam) {
      setErrorMsg('No prompt data found in URL. Please scan the QR code again on your desktop screen.');
      return;
    }

    try {
      const decompressed = decompressFromEncodedURIComponent(rawParam);
      if (!decompressed) {
        throw new Error('Decompression resulted in empty data.');
      }
      setPromptText(decompressed);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to decompress interview prompt. The link may be incomplete or corrupted.');
    }
  }, [rawParam]);

  const handleCopyAndRedirect = async () => {
    if (!promptText) return;

    setErrorMsg('');
    try {
      // 1. Copy to clipboard (must be triggered by direct user gesture like onClick)
      await navigator.clipboard.writeText(promptText);
      setCopied(true);

      // 2. Short delay for visual feedback before launching Gemini
      setTimeout(() => {
        // Deep-link to Gemini Web app
        window.location.href = 'https://gemini.google.com/app';
      }, 1000);
    } catch (err) {
      console.error(err);
      // Fallback in case clipboard API fails (e.g. older mobile browsers or permission blocks)
      setErrorMsg('Clipboard write blocked. Please manually select the prompt below and copy it.');
    }
  };

  return (
    <div className="mv-card">
      <div className="mv-brand">
        <img src="/logo.png" alt="SSLDUCK Logo" className="mv-logo-img" />
        <div className="mv-brand-text">
          <span className="mv-brand-name">SSLDUCK</span>
          <span className="mv-brand-tagline">VERSION 12-PRO</span>
        </div>
      </div>

      <h1 className="mv-title">Voice Interview Practice</h1>
      <p className="mv-subtitle">Handoff Layer</p>

      {errorMsg && <div className="mv-error">{errorMsg}</div>}

      {promptText ? (
        <div style={{ width: '100%' }}>
          <p className="mv-prompt-status">
            ⚡ Interview Prompt Loaded! Tap the button below to copy it and open Gemini.
          </p>

          <button
            onClick={handleCopyAndRedirect}
            className={`mv-action-btn ${copied ? 'mv-action-btn-success' : ''}`}
            disabled={copied}
          >
            {copied ? (
              <>
                <span className="mv-check-icon">✓</span> Prompt Copied! Launching...
              </>
            ) : (
              '🎤 Copy Prompt & Launch Gemini'
            )}
          </button>

          {/* Manual textarea fallback if clipboard failed or if they want to copy manually */}
          {errorMsg.includes('Clipboard write blocked') && (
            <div style={{ marginTop: '20px' }}>
              <label className="mv-fallback-label">Prompt Content (Tap to Select All & Copy):</label>
              <textarea
                className="mv-textarea-fallback"
                value={promptText}
                readOnly
                onClick={(e) => {
                  (e.target as HTMLTextAreaElement).select();
                }}
              />
            </div>
          )}

          {/* Step by Step Visual Guide */}
          <div className="mv-instructions">
            <h3 className="mv-instructions-title">How to start voice interview:</h3>
            <ol className="mv-instructions-list">
              <li>
                <span className="mv-step-num">1</span>
                <span>Tap the button above. The prompt copies, and Gemini opens.</span>
              </li>
              <li>
                <span className="mv-step-num">2</span>
                <span>Paste the prompt into the message box in Gemini.</span>
              </li>
              <li>
                <span className="mv-step-num">3</span>
                <span>
                  Tap the <strong>Microphone icon</strong> next to the text box and say: <em>&quot;Let&apos;s start!&quot;</em>
                </span>
              </li>
              <li>
                <span className="mv-step-num">4</span>
                <span>Listen to the question, reply using your voice, and get active feed-back!</span>
              </li>
            </ol>
          </div>
        </div>
      ) : (
        !errorMsg && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '40px 0' }}>
            <div className="mv-spinner"></div>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '16px', fontWeight: 500 }}>
              Decrypting secure interview profile...
            </p>
          </div>
        )
      )}
    </div>
  );
}

// ── Main Page Wrapper ─────────────────────────────────────────────────────────
export default function MobileHandoffPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mv-body-wrapper {
          min-height: 100vh;
          background-color: #080712;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .mv-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 32px 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        /* ── Brand Logo ────────────────────────── */
        .mv-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .mv-logo-img {
          height: 32px;
          width: auto;
        }
        .mv-brand-text {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .mv-brand-name {
          font-size: 14px;
          font-weight: 900;
          color: #60a5fa;
          letter-spacing: -0.3px;
          line-height: 1;
          font-family: Georgia, serif;
        }
        .mv-brand-tagline {
          font-size: 7px;
          font-weight: 700;
          color: rgba(96, 165, 250, 0.5);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-top: 1px;
        }

        /* ── Titles ────────────────────────────── */
        .mv-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .mv-subtitle {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #60a5fa;
          letter-spacing: 2px;
          margin-top: 4px;
          margin-bottom: 24px;
        }

        /* ── Prompt Status Text ────────────────── */
        .mv-prompt-status {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 24px;
          font-weight: 500;
        }

        /* ── Button styling ────────────────────── */
        .mv-action-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease-out;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
        }
        .mv-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
        }
        .mv-action-btn:active {
          transform: translateY(0);
        }
        .mv-action-btn-success {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4) !important;
        }
        .mv-check-icon {
          display: inline-block;
          font-weight: 900;
          margin-right: 6px;
        }

        /* ── Error Panel ───────────────────────── */
        .mv-error {
          width: 100%;
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #fca5a5;
          font-size: 12px;
          font-weight: 600;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          line-height: 1.5;
          text-align: left;
        }

        /* ── Fallback Input Box ────────────────── */
        .mv-fallback-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #60a5fa;
          text-align: left;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .mv-textarea-fallback {
          width: 100%;
          height: 140px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px;
          font-family: monospace;
          font-size: 10px;
          color: #94a3b8;
          resize: none;
        }

        /* ── Steps Guide ────────────────────────── */
        .mv-instructions {
          text-align: left;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 20px;
          border-radius: 12px;
          margin-top: 32px;
        }
        .mv-instructions-title {
          font-size: 11px;
          font-weight: 800;
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 14px;
        }
        .mv-instructions-list {
          list-style: none;
        }
        .mv-instructions-list li {
          font-size: 12.5px;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .mv-instructions-list li:last-child {
          margin-bottom: 0;
        }
        .mv-instructions-list li strong {
          color: #ffffff;
        }
        .mv-step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: #3b82f6;
          color: #ffffff;
          border-radius: 50%;
          font-size: 9.5px;
          font-weight: 800;
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* ── Spinner ───────────────────────────── */
        .mv-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(96, 165, 250, 0.2);
          border-top-color: #60a5fa;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="mv-body-wrapper">
        <Suspense fallback={
          <div className="mv-card">
            <div className="mv-spinner"></div>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '16px', fontWeight: 500 }}>
              Initiating secure connection...
            </p>
          </div>
        }>
          <MobileHandoffContent />
        </Suspense>
      </div>
    </>
  );
}
