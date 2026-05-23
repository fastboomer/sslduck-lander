'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Prompt Template ───────────────────────────────────────────────────────────
// Address of the prompt: app/fulfillment/linkedin-headline/page.tsx
const PROMPT_TEMPLATE = `[STRICT OUTPUT RULE - NO AI INTRO, PREAMBLE, OR META-COMMENTS]
You MUST NOT output any conversational introduction, commentary, preamble, or meta-notes. Under no circumstances should you note any conflicts between formatting instructions and the plain-text directive. All formatting specifications represent target layout markers for our downstream parser; understand this and proceed directly to outputting the LinkedIn Headlines without explanation. Your response MUST start IMMEDIATELY with the title "LinkedIn Headlines for [first_name last_name]".

[STRICT LENGTH CONTROL RULE]
Each of the 5 LinkedIn Headlines MUST be under 220 characters. Ensure high impact and professional formatting. You must count characters and ensure each version stays strictly under the 220-character limit.

[OUTPUT CONTROL INSTRUCTIONS]
[FORMATTING INSTRUCTION CLARIFICATION]
You are a text-generating AI model. You must output ONLY clean, 100% plain text. Do NOT attempt to produce actual rich text, HTML, RTF, or markdown formatting (do NOT use asterisks ** or __ for bold, or * or _ for italics, or # for headings). 
The formatting specifications in this prompt are instructions for the downstream parsing engine that will convert your plain text output into a Word Document. 
To satisfy these specifications, simply structure your plain text output according to the layout rules (e.g., using exact headers like "VERSION 1:" etc.). The parser will handle applying the bolding, font sizes, alignments, and fonts in the final Word Document. 
Your output must be 100% plain text, without any HTML tags, RTF tags, or markdown stars/underscores.

PROMPT:
SYSTEM INSTRUCTIONS: You are responding as a friendly, professional, highly experienced career adviser, and expert LinkedIn writer.

BACKGROUND: I have included in this prompt a resume placed between <resume> and </resume>; I have also included target job description between <job_description> and </job_description> which you will carefully analyze.

TASK: Using the resume and job description provided, create 5 optimized LinkedIn "Professional Headlines" in similar but different versions (e.g. one keyword-rich, one outcome-driven, one hybrid/creative).
Length: Each headline MUST be under 220 characters.

FORMAT: Please display the title: "LinkedIn Headlines for [first_name last_name]"
Then, create 5 LinkedIn Headlines clearly separated as:
VERSION 1
[Headline 1 text]

VERSION 2
[Headline 2 text]

VERSION 3
[Headline 3 text]

VERSION 4
[Headline 4 text]

VERSION 5
[Headline 5 text]

CLOSING: After completing the 5 Headlines, finish by writing a personal paragraph starting with "Hi first_name"! and begin your comments by telling them about the features of the 5 headlines you have just written. Finish by wishing them all success. Use this signature:
Wishing you all the best,
Glo
`;

// ── File reading helpers ──────────────────────────────────────────────────────
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function readPdfFile(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@5.7.284/legacy/build/pdf.worker.min.mjs';
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text += content.items.map((item: any) => item.str ?? '').join(' ') + '\n';
  }
  return text;
}

async function readDocxFile(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function readFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return readPdfFile(file);
  if (name.endsWith('.docx')) return readDocxFile(file);
  return readTextFile(file);
}

// ── FileInput component ───────────────────────────────────────────────────────
function FileInput({
  id,
  label,
  required,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileName(f?.name ?? '');
    onChange(f);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = '';
    setFileName('');
    onChange(null);
  };

  return (
    <div className="r3-field">
      <label className="r3-label" htmlFor={id}>
        {label}
        {required && <span className="r3-required"> *</span>}
      </label>
      <div className="r3-file-row">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".txt,.pdf,.docx,.rtf"
          onChange={handleChange}
          className="r3-file-input"
        />
        {fileName && (
          <button type="button" onClick={handleClear} className="r3-clear-btn" title="Clear file">
            ✕
          </button>
        )}
      </div>
      {fileName && <span className="r3-filename">{fileName}</span>}
    </div>
  );
}

export default function LinkedInHeadlinePage() {
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescFile, setJobDescFile] = useState<File | null>(null);
  const [model, setModel] = useState<'default' | 'gemini'>('default');
  const [output, setOutput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Step 3 state
  const [llmOutput, setLlmOutput] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState('');

  interface LengthCheckResult {
    version: number;
    charCount: number;
    exceeded: boolean;
  }
  const [warnings, setWarnings] = useState<LengthCheckResult[]>([]);

  // Reset copied state after 2.5 s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  // Client-side length validation hook for headlines
  useEffect(() => {
    if (!llmOutput.trim()) {
      setWarnings([]);
      return;
    }

    let text = llmOutput
      .replace(/<(div|p|br|h[1-6]|section|article|header)[^>]*>/gi, '\n')
      .replace(/<\/(div|p|h[1-6]|section|article|header)>/gi, '\n')
      .replace(/<[^>]+>/g, '');

    const rawLines = text.split('\n');
    const cleanLines: string[] = [];

    for (const line of rawLines) {
      let t = line.replace(/[\xa0\u200b\u200c\u200d\ufeff\t]+/g, ' ').trim();
      if (/^```[a-zA-Z0-9]*\s*$/.test(t)) continue;
      t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      if (
        t.toLowerCase().includes('page break') ||
        t.toLowerCase().includes('page breaks') ||
        /^[-*_\s—–|*~=\[\]]*page\s*(\d+|break|breaks)[-*_\s—–|*~=\[\]]*$/i.test(t)
      ) {
        continue;
      }
      if (/^[-\s_—–|*~=]+$/.test(t)) continue;
      t = t.replace(/^#+\s+/, '');
      t = t.replace(/\*\*|__/g, '');
      t = t.replace(/\*(?!\s)([^*]+)\*/g, '$1');
      t = t.replace(/_(?!\s)([^_]+)_/g, '$1');
      if (t.startsWith('*') && !t.startsWith('* ')) t = t.slice(1);
      if (t.endsWith('*') && !t.endsWith(' *')) t = t.slice(0, -1);
      if (t.startsWith('_') && !t.startsWith('_ ')) t = t.slice(1);
      if (t.endsWith('_') && !t.endsWith(' _')) t = t.slice(0, -1);
      const cleaned = t.trim();
      if (cleaned) cleanLines.push(cleaned);
    }

    const headlinesTexts: string[] = ['', '', '', '', ''];
    let currentVersion = 0;
    let inNotes = false;

    for (const line of cleanLines) {
      const t = line.trim();
      if (!t) continue;

      if (/^(hi|hello|dear)\b/i.test(t)) {
        inNotes = true;
      }
      if (inNotes) continue;
      if (t.toLowerCase().includes('linkedin headlines for')) continue;

      const versionMatch = t.match(/^(version|headline|alternative|variation|profile)\s*(\d+)/i) ||
        (t.match(/^(\d+)[\.\)]\s*$/) && t.length < 5);

      if (versionMatch) {
        const num = parseInt(versionMatch[2] || versionMatch[1], 10);
        if (num >= 1 && num <= 5) {
          currentVersion = num;
        }
        continue;
      }

      if (currentVersion >= 1 && currentVersion <= 5) {
        const cleanedText = t.replace(/^[\s\-\*—–_:]+/g, '').trim();
        if (cleanedText) {
          headlinesTexts[currentVersion - 1] += (headlinesTexts[currentVersion - 1] ? ' ' : '') + cleanedText;
        }
      }
    }

    const results: LengthCheckResult[] = [];
    for (let i = 0; i < 5; i++) {
      const val = headlinesTexts[i].trim();
      if (val) {
        const charCount = val.length;
        results.push({
          version: i + 1,
          charCount,
          exceeded: charCount > 220
        });
      }
    }
    setWarnings(results);
  }, [llmOutput]);

  const handleCombine = async () => {
    if (!resumeFile || !jobDescFile) {
      setError('Please upload both the Resume and the Job Description.');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const [resumeText, jobDescText] = await Promise.all([
        readFile(resumeFile),
        readFile(jobDescFile),
      ]);

      const finalPrompt = `\n${PROMPT_TEMPLATE}\n<resume>\n${resumeText}\n</resume>\n\n<job_description>\n${jobDescText}\n</job_description>\n`;

      setOutput(finalPrompt);

      // Automatically copy to clipboard
      try {
        await navigator.clipboard.writeText(finalPrompt);
        setCopied(true);
      } catch {
        // Silently catch clipboard blocking
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Error processing files: ' + msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      setError('Failed to copy — please select all text in the box and copy manually.');
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .r3-page {
          min-height: 100vh;
          background: #ffffff;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
          display: flex;
          flex-direction: column;
        }

        /* ── Nav ───────────────────────────────── */
        .r3-nav {
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
        .r3-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          cursor: pointer;
        }
        .r3-nav-logo-img {
          height: 40px;
          width: auto;
        }
        .r3-nav-logo-text {
          display: flex;
          flex-direction: column;
        }
        .r3-nav-logo-name {
          font-size: 17px;
          font-weight: 900;
          color: #002366;
          letter-spacing: -0.5px;
          line-height: 1;
          font-family: Georgia, serif;
        }
        .r3-nav-logo-tagline {
          font-size: 8px;
          font-weight: 700;
          color: rgba(0,35,102,0.4);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .r3-nav-back {
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
        .r3-nav-back:hover { background: #002366; color: #ffffff; }

        /* ── Body ──────────────────────────────── */
        .r3-body {
          max-width: 820px;
          width: 100%;
          margin: 0 auto;
          padding: 52px 32px 80px;
          flex-grow: 1;
        }

        /* ── Page Header ───────────────────────── */
        .r3-header {
          margin-bottom: 40px;
        }
        .r3-header-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 12px;
        }
        .r3-header h1 {
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 900;
          color: #002366;
          letter-spacing: -1px;
          line-height: 1.1;
          margin-bottom: 12px;
        }
        .r3-header-sub {
          font-size: 1rem;
          color: #475569;
          line-height: 1.6;
          font-weight: 500;
          max-width: 600px;
        }

        /* ── Card ──────────────────────────────── */
        .r3-card {
          border: 2px solid #002366;
          padding: 36px;
          margin-bottom: 28px;
          background: #ffffff;
        }
        .r3-card-title {
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
        .r3-field {
          margin-bottom: 24px;
        }
        .r3-field:last-child { margin-bottom: 0; }
        .r3-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #002366;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }
        .r3-required { color: #dc2626; }

        .r3-file-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .r3-file-input {
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
        .r3-file-input:hover { border-color: #002366; }
        .r3-file-input:focus { outline: 2px solid #002366; outline-offset: 2px; }
        .r3-clear-btn {
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
        .r3-clear-btn:hover { background: #fee2e2; }
        .r3-filename {
          display: block;
          font-size: 11px;
          color: #475569;
          margin-top: 5px;
          font-weight: 500;
        }

        /* ── Model selector ────────────────────── */
        .r3-select {
          width: 100%;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #002366;
          background: rgba(0,35,102,0.04);
          border: 1px solid rgba(0,35,102,0.25);
          border-radius: 6px;
          padding: 10px 12px;
          cursor: pointer;
          appearance: auto;
          transition: border-color 0.2s;
        }
        .r3-select:hover { border-color: #002366; }
        .r3-select:focus { outline: 2px solid #002366; outline-offset: 2px; }

        /* ── Error ─────────────────────────────── */
        .r3-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #dc2626;
          margin-bottom: 20px;
        }

        /* ── Action Buttons ────────────────────── */
        .r3-combine-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
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
          margin-bottom: 28px;
        }
        .r3-combine-btn::before {
          content: "";
          position: absolute;
          top: 0; left: 8%;
          width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%;
          pointer-events: none;
        }
        .r3-combine-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #66B3FF 0%, #0077FF 45%, #0052CC 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 6px 16px rgba(0,35,102,0.4);
          transform: translateY(-1px);
        }
        .r3-combine-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* ── Output ────────────────────────────── */
        .r3-output-card {
          border: 2px solid #002366;
          padding: 28px 36px;
          background: #ffffff;
          margin-bottom: 16px;
        }
        .r3-output-hint {
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .r3-textarea {
          width: 100%;
          min-height: 280px;
          resize: vertical;
          border: 1px solid rgba(0,35,102,0.2);
          border-radius: 6px;
          padding: 14px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #1e293b;
          background: rgba(0,35,102,0.02);
          margin-bottom: 0;
        }
        .r3-textarea:focus { outline: 2px solid #002366; outline-offset: 2px; }

        .r3-copy-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
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
        }
        .r3-copy-btn::before {
          content: "";
          position: absolute;
          top: 0; left: 8%;
          width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%;
          pointer-events: none;
        }
        .r3-copy-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #66B3FF 0%, #0077FF 45%, #0052CC 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 6px 16px rgba(0,35,102,0.4);
          transform: translateY(-1px);
        }
        .r3-copy-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .r3-copy-btn-success {
          background: linear-gradient(to bottom, #34d399 0%, #059669 45%, #047857 100%) !important;
          border-color: #065f46 !important;
        }

        /* ── Step 3 ─────────────────────────────── */
        .r3-step3-card {
          border: 2px solid #002366;
          padding: 36px;
          margin-top: 40px;
          margin-bottom: 28px;
          background: #ffffff;
        }
        .r3-step3-tip {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(0,35,102,0.04);
          border: 1px solid rgba(0,35,102,0.15);
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #475569;
          line-height: 1.5;
        }
        .r3-step3-tip-icon { flex-shrink: 0; font-size: 15px; }
        .r3-dl-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
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
          margin-top: 16px;
        }
        .r3-dl-btn::before {
          content: "";
          position: absolute;
          top: 0; left: 8%;
          width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%;
          pointer-events: none;
        }
        .r3-dl-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #66B3FF 0%, #0077FF 45%, #0052CC 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 6px 16px rgba(0,35,102,0.4);
          transform: translateY(-1px);
        }
        .r3-dl-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .r3-dl-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          color: #dc2626;
          margin-top: 12px;
        }

        /* ── Spinner ───────────────────────────── */
        .r3-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: r3spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes r3spin { to { transform: rotate(360deg); } }

        /* ── Footer ────────────────────────────── */
        .r3-footer {
          border-top: 2px solid #002366;
          padding: 20px 40px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }

        /* ── Responsive ────────────────────────── */
        @media (max-width: 640px) {
          .r3-nav { padding: 14px 20px; }
          .r3-body { padding: 32px 16px 60px; }
          .r3-card { padding: 24px 20px; }
          .r3-output-card { padding: 20px; }
          .r3-footer { padding: 20px; }
        }
      `}</style>

      <div className="r3-page">
        {/* Nav */}
        <nav className="r3-nav">
        <a href="https://sslduck-lander.vercel.app" className="r3-nav-logo">
          <img src="/logo.png" alt="SSLDuck Logo" className="r3-nav-logo-img" />
          <div className="r3-nav-logo-text">
            <span className="r3-nav-logo-name">SSLDUCK</span>
            <span className="r3-nav-logo-tagline">VERSION 12-PRO</span>
          </div>
        </a>
        <button className="r3-nav-back" onClick={() => router.push('/fulfillment')}>
          ← Back to Suite
        </button>
      </nav>

      {/* Body */}
      <div className="r3-body">
        {/* Page Header */}
        <div className="r3-header">
          <p className="r3-header-eyebrow">AI Career Suite · LinkedIn Headline Tool</p>
          <h1>LinkedIn Headline Generator</h1>
          <p className="r3-header-sub">
            Upload your resume and your target job description. Click <strong>Combine Documents</strong> to bundle everything into a specialized LinkedIn Headline prompt, copy it to your clipboard, and paste it into your favorite LLM.
          </p>
        </div>

        {/* Input Card */}
        <div className="r3-card">
          <p className="r3-card-title">Step 1 — Upload Your Documents</p>

          <div className="r3-field">
            <label className="r3-label" htmlFor="r3-model">
              Select AI Model <span className="r3-required">*</span>
            </label>
            <select
              id="r3-model"
              className="r3-select"
              value={model}
              onChange={(e) => setModel(e.target.value as 'default' | 'gemini')}
            >
              <option value="default">Claude / ChatGPT / Other</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <FileInput
            id="r3-resume"
            label="Current Resume"
            required
            onChange={setResumeFile}
          />
          <FileInput
            id="r3-jobdesc"
            label="Target Job Description"
            required
            onChange={setJobDescFile}
          />
        </div>

        {error && <div className="r3-error">{error}</div>}

        {/* Combine Button */}
        <button
          id="r3-combine-btn"
          className="r3-combine-btn"
          onClick={handleCombine}
          disabled={processing}
        >
          {processing && <span className="r3-spinner" />}
          {processing ? 'Processing...' : 'Combine Documents'}
        </button>

        {/* Output Card */}
        <div className="r3-output-card">
          <p className="r3-card-title">Step 2 — Copy &amp; Paste to Your AI</p>
          <p className="r3-output-hint">
            The window below contains your combined prompt. Click <strong>Copy to Clipboard</strong> then paste into your AI model window with <strong>Ctrl+V</strong>.
          </p>
          <textarea
            id="r3-output"
            className="r3-textarea"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder="Your combined prompt will appear here after you click Combine Documents…"
            spellCheck={false}
          />
        </div>

        {/* Copy Button */}
        <button
          id="r3-copy-btn"
          className={`r3-copy-btn${copied ? ' r3-copy-btn-success' : ''}`}
          onClick={handleCopy}
          disabled={!output}
        >
          {copied ? '✓ Copied to Clipboard!' : 'Copy to Clipboard'}
        </button>

        {/* Step 3: Format & Download */}
        <div className="r3-step3-card">
          <p className="r3-card-title">Step 3 — Format &amp; Download Word Doc</p>
          <div className="r3-step3-tip">
            <span className="r3-step3-tip-icon">💡</span>
            <span>
              After your AI returns the completed headlines, paste the full output below. Click <strong>Download as Word Document</strong> to receive a perfectly formatted <strong>.docx</strong> file with Arial font and standard layout.
            </span>
          </div>

          <div className="r3-field">
            <label className="r3-label" htmlFor="r3-llm-output">
              Paste AI Headline Output Here
            </label>
            <textarea
              id="r3-llm-output"
              className="r3-textarea"
              style={{ minHeight: '340px' }}
              value={llmOutput}
              onChange={(e) => setLlmOutput(e.target.value)}
              placeholder="Paste the full headline text returned by your AI model here…"
              spellCheck={false}
            />
          </div>

          {/* Validation warnings display */}
          {warnings.length > 0 && (
            <div style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {warnings.map((w) => (
                <div
                  key={w.version}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: w.exceeded ? '1px solid #fecaca' : '1px solid #a7f3d0',
                    backgroundColor: w.exceeded ? '#fef2f2' : '#ecfdf5',
                    color: w.exceeded ? '#dc2626' : '#059669',
                  }}
                >
                  <span>Version {w.version} Headline:</span>
                  <span>{w.charCount} / 220 chars {w.exceeded ? '⚠️ Exceeds limit!' : '✓ Good Length'}</span>
                </div>
              ))}
            </div>
          )}

          <button
            id="r3-download-btn"
            className="r3-dl-btn"
            disabled={!llmOutput.trim() || downloading}
            onClick={async () => {
              setDlError('');
              setDownloading(true);
              try {
                const res = await fetch('/api/linkedin-headline/format', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ headlineText: llmOutput }),
                });
                if (!res.ok) {
                  const e = await res.json();
                  throw new Error(e.error || 'Server error');
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'linkedin_headlines.docx';
                a.click();
                URL.revokeObjectURL(url);
              } catch (err: unknown) {
                setDlError(err instanceof Error ? err.message : String(err));
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading && <span className="r3-spinner" />}
            {downloading ? 'Generating…' : '⬇ Download as Word Document'}
          </button>
          {dlError && <div className="r3-dl-error">{dlError}</div>}
        </div>
      </div>

      {/* Footer */}
      <footer className="r3-footer">
        © 2026 SSLDuck. All Rights Reserved.
      </footer>
    </div>
    </>
  );
}


