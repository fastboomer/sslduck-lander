'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Prompt Template ───────────────────────────────────────────────────────────
const PROMPT_TEMPLATE = `[STRICT OUTPUT RULE - NO AI INTRO, PREAMBLE, OR META-COMMENTS]
You MUST NOT output any conversational introduction, commentary, preamble, or meta-notes. Under no circumstances should you note any conflicts between formatting instructions and the plain-text directive. All formatting specifications (font sizes, centering, bolding) represent target layout markers for our downstream parser; understand this and proceed directly to outputting the Interview Strategy report without explanation. Your response MUST start IMMEDIATELY with the H2 title line.

[FORMATTING INSTRUCTION CLARIFICATION]
You are a text-generating AI model. You must output ONLY clean, 100% plain text. Do NOT attempt to produce actual rich text, HTML, RTF, or markdown formatting (do NOT use asterisks ** or __ for bold, or * or _ for italics, or # for headings). The formatting specifications in this prompt are instructions for the downstream parsing engine that will convert your plain text output into a Word Document.

PROMPT
Variables (extract from uploaded documents — if a value is not available, omit the label entirely):
first_name — from resume
last_name — from resume
job_title — from Job Description
company — from Job Description

PRACTICE INTERVIEW QUESTIONS BACKGROUND:
The user has uploaded their resume between <resume> and </resume> and an example Job Description between <job_description> and </job_description>. You are a friendly and highly experienced HR professional who will coach and prepare the user for an interview regarding the targeted job, using practice interview questions, especially questions that might be a result of weak points in the user's resume. You are thoughtful and encouraging, but to be helpful you must candidly address real shortfalls and problems the user may have in analyzing their resume vs what the job requirements call for. Your job is to spot potential interview problems and provide strategies for mitigating them.

TASK:

Begin report with this title on its own line, bold:
Interview Strategy for first_name last_name, job_title, company

blank line;
Display the following prepared explanation before the questions and answers:

For maximum benefit in your interview practice, use the STAR system. Here is how it works:
The STAR system is a simple structure for answering behavioral interview questions, especially questions that start with:
"Tell me about a time when..."
"Give me an example of..."
"Describe a situation where..."
Employers use these questions to understand how you handled real workplace situations in the past. The STAR method helps you answer clearly, without rambling.
STAR stands for:
S — Situation
Briefly explain the background.
Example: "While working as a customer service representative, our team was dealing with a sudden increase in support tickets after a software update."
T — Task
Explain your responsibility or goal.
Example: "My role was to help reduce the backlog while keeping customer satisfaction high."
A — Action
Describe the specific steps you took.
Example: "I organized the tickets by urgency, created quick-response templates for common problems, and personally handled the most frustrated customers."
R — Result
Share the outcome, ideally with numbers or a clear positive result.
Example: "We reduced the backlog by 40% in three days, and my manager later asked the team to use my response templates going forward."
Full STAR answer example:
Question: "Tell me about a time you handled a difficult customer."
Answer: "While working in customer service, I once helped a customer who was very upset because an order had arrived late before an important event. My task was to resolve the issue quickly while keeping the customer from canceling future orders. I listened carefully, apologized for the inconvenience, checked the shipping history, and arranged an expedited replacement along with a discount on their next order. As a result, the customer kept the order, left a positive review about the service, and later placed another order with us."
Why STAR works
STAR helps you show: What happened. What you were responsible for. What you personally did. What changed because of your actions.
That last part is important. Many job candidates describe duties, but stronger candidates describe results.
A good STAR answer should be: Clear, specific, and focused on one example. Try to keep your answer around 60 to 90 seconds. Use "I" more than "we" when describing your actions, because the interviewer wants to understand your contribution.
Quick formula
You can think of it like this: "The situation was... My responsibility was... I took these actions... The result was..."
For interview practice, prepare 5 to 7 STAR stories ahead of time covering common themes like teamwork, conflict, leadership, problem-solving, mistakes, deadlines, and customer service.

Please carefully read the resume located between <resume> and </resume> and the example job description located between <job_description> and </job_description> then prepare the following:

Display questions numbered 1 through 10 that best reflect key questions HR would ask in an interview for the position, followed by 10 additional questions numbered 11 through 20 that an interviewer would likely ask based on the resume's relationship to the job description. Develop questions based on potential resume weak points or shortcomings in qualifications in relation to the job requirements.

Follow each question with an example answer, with special consideration of answers that mitigate any user weak points.

IMPORTANT: DO NOT QUOTE SOURCES.
DO NOT OFFER FURTHER HELP SUCH AS WRITING THE PROFESSIONAL PROFILE, ETC.
IMPORTANT: Please do not request further input and please create this entire task without pause in one go.

[END OUTPUT CONTROL]`;

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
  id, label, required, onChange,
}: {
  id: string; label: string; required?: boolean; onChange: (file: File | null) => void;
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
        {label}{required && <span className="r3-required"> *</span>}
      </label>
      <div className="r3-file-row">
        <input ref={inputRef} id={id} type="file" accept=".txt,.pdf,.docx,.rtf"
          onChange={handleChange} className="r3-file-input" />
        {fileName && (
          <button type="button" onClick={handleClear} className="r3-clear-btn" title="Clear file">✕</button>
        )}
      </div>
      {fileName && <span className="r3-filename">{fileName}</span>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InterviewPrepPage() {
  const router = useRouter();

  const [resumeFile, setResumeFile]   = useState<File | null>(null);
  const [jobDescText, setJobDescText] = useState('');
  const [output, setOutput]           = useState('');
  const [processing, setProcessing]   = useState(false);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState('');

  const [llmOutput, setLlmOutput]     = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError]         = useState('');

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCombine = async () => {
    if (!resumeFile || !jobDescText.trim()) {
      setError('Please upload your Resume and paste the Job Description.');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const resumeText = await readFile(resumeFile);
      const finalPrompt = `\n${PROMPT_TEMPLATE}\n<resume>\n${resumeText}\n</resume>\n\n<job_description>\n${jobDescText}\n</job_description>\n`;
      setOutput(finalPrompt);
    } catch (err: unknown) {
      setError('Error processing files: ' + (err instanceof Error ? err.message : String(err)));
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
        .r3-nav-logo-img { height: 40px; width: auto; }
        .r3-nav-logo-text { display: flex; flex-direction: column; }
        .r3-nav-logo-name {
          font-size: 17px; font-weight: 900; color: #002366;
          letter-spacing: -0.5px; line-height: 1; font-family: Georgia, serif;
        }
        .r3-nav-logo-tagline {
          font-size: 8px; font-weight: 700; color: rgba(0,35,102,0.4);
          letter-spacing: 0.2em; text-transform: uppercase; margin-top: 2px;
        }
        .r3-nav-back {
          background: none; border: 2px solid #002366; color: #002366;
          font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 6px;
          cursor: pointer; transition: background 0.2s, color 0.2s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .r3-nav-back:hover { background: #002366; color: #ffffff; }

        /* ── Body ──────────────────────────────── */
        .r3-body { max-width: 820px; width: 100%; margin: 0 auto; padding: 52px 32px 80px; flex-grow: 1; }

        /* ── Page Header ───────────────────────── */
        .r3-header { margin-bottom: 40px; }
        .r3-header-eyebrow {
          font-size: 11px; font-weight: 800; letter-spacing: 2.5px;
          text-transform: uppercase; color: #475569; margin-bottom: 12px;
        }
        .r3-header h1 {
          font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; color: #002366;
          letter-spacing: -1px; line-height: 1.1; margin-bottom: 12px;
        }
        .r3-header-sub { font-size: 1rem; color: #475569; line-height: 1.6; font-weight: 500; max-width: 600px; }

        /* ── Card ──────────────────────────────── */
        .r3-card { border: 2px solid #002366; padding: 36px; margin-bottom: 28px; background: #ffffff; }
        .r3-card-title {
          font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
          color: #002366; margin-bottom: 24px; padding-bottom: 12px;
          border-bottom: 1px solid rgba(0,35,102,0.15);
        }

        /* ── Form Fields ───────────────────────── */
        .r3-field { margin-bottom: 24px; }
        .r3-field:last-child { margin-bottom: 0; }
        .r3-label { display: block; font-size: 13px; font-weight: 700; color: #002366; margin-bottom: 8px; letter-spacing: 0.2px; }
        .r3-required { color: #dc2626; }
        .r3-file-row { display: flex; align-items: center; gap: 8px; }
        .r3-file-input {
          flex: 1; font-family: 'Inter', system-ui, sans-serif; font-size: 13px; color: #002366;
          background: rgba(0,35,102,0.04); border: 1px solid rgba(0,35,102,0.25);
          border-radius: 6px; padding: 9px 12px; cursor: pointer; transition: border-color 0.2s;
        }
        .r3-file-input:hover { border-color: #002366; }
        .r3-file-input:focus { outline: 2px solid #002366; outline-offset: 2px; }
        .r3-clear-btn {
          background: none; border: 1px solid #dc2626; color: #dc2626; font-size: 12px; font-weight: 700;
          width: 28px; height: 28px; border-radius: 6px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; transition: background 0.15s;
        }
        .r3-clear-btn:hover { background: #fee2e2; }
        .r3-filename { display: block; font-size: 11px; color: #475569; margin-top: 5px; font-weight: 500; }

        /* ── Textarea ───────────────────────────── */
        .r3-textarea-jd {
          width: 100%; min-height: 180px; resize: vertical;
          border: 1px solid rgba(0,35,102,0.25); border-radius: 6px; padding: 12px 14px;
          font-family: 'Inter', system-ui, sans-serif; font-size: 13px; line-height: 1.6;
          color: #1e293b; background: rgba(0,35,102,0.02); transition: border-color 0.2s;
        }
        .r3-textarea-jd:focus { outline: 2px solid #002366; outline-offset: 2px; border-color: #002366; }
        .r3-textarea-jd::placeholder { color: #94a3b8; }

        /* ── Error ─────────────────────────────── */
        .r3-error {
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;
          padding: 12px 16px; font-size: 13px; font-weight: 600; color: #dc2626; margin-bottom: 20px;
        }

        /* ── Action Buttons ────────────────────── */
        .r3-combine-btn {
          position: relative; overflow: hidden; width: 100%; padding: 14px 28px;
          background: linear-gradient(to bottom, #4DA3FF 0%, #006BFF 45%, #0047B3 100%);
          color: #ffffff; border: 1px solid #003A99; border-radius: 10px;
          font-size: 15px; font-weight: 700; font-family: 'Inter', system-ui, sans-serif;
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(0,35,102,0.3);
          cursor: pointer; transition: all 0.2s; margin-bottom: 28px;
        }
        .r3-combine-btn::before {
          content: ""; position: absolute; top: 0; left: 8%;
          width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%; pointer-events: none;
        }
        .r3-combine-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #66B3FF 0%, #0077FF 45%, #0052CC 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 6px 16px rgba(0,35,102,0.4);
          transform: translateY(-1px);
        }
        .r3-combine-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* ── Output ────────────────────────────── */
        .r3-output-card { border: 2px solid #002366; padding: 28px 36px; background: #ffffff; margin-bottom: 16px; }
        .r3-output-hint { font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 12px; line-height: 1.5; }
        .r3-textarea {
          width: 100%; min-height: 280px; resize: vertical;
          border: 1px solid rgba(0,35,102,0.2); border-radius: 6px; padding: 14px;
          font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.6;
          color: #1e293b; background: rgba(0,35,102,0.02); margin-bottom: 0;
        }
        .r3-textarea:focus { outline: 2px solid #002366; outline-offset: 2px; }

        .r3-copy-btn {
          position: relative; overflow: hidden; width: 100%; padding: 14px 28px;
          background: linear-gradient(to bottom, #4DA3FF 0%, #006BFF 45%, #0047B3 100%);
          color: #ffffff; border: 1px solid #003A99; border-radius: 10px;
          font-size: 15px; font-weight: 700; font-family: 'Inter', system-ui, sans-serif;
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(0,35,102,0.3);
          cursor: pointer; transition: all 0.2s;
        }
        .r3-copy-btn::before {
          content: ""; position: absolute; top: 0; left: 8%; width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%; pointer-events: none;
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
        .r3-step3-card { border: 2px solid #002366; padding: 36px; margin-top: 40px; margin-bottom: 28px; background: #ffffff; }
        .r3-step3-tip {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(0,35,102,0.04); border: 1px solid rgba(0,35,102,0.15);
          border-radius: 6px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #475569; line-height: 1.5;
        }
        .r3-step3-tip-icon { flex-shrink: 0; font-size: 15px; }
        .r3-dl-btn {
          position: relative; overflow: hidden; width: 100%; padding: 14px 28px;
          background: linear-gradient(to bottom, #4DA3FF 0%, #006BFF 45%, #0047B3 100%);
          color: #ffffff; border: 1px solid #003A99; border-radius: 10px;
          font-size: 15px; font-weight: 700; font-family: 'Inter', system-ui, sans-serif;
          text-shadow: 0 1px 1px rgba(0,0,0,0.3);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 12px rgba(0,35,102,0.3);
          cursor: pointer; transition: all 0.2s; margin-top: 16px;
        }
        .r3-dl-btn::before {
          content: ""; position: absolute; top: 0; left: 8%; width: 84%; height: 45%;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          border-radius: 10px 10px 50% 50%; pointer-events: none;
        }
        .r3-dl-btn:hover:not(:disabled) {
          background: linear-gradient(to bottom, #66B3FF 0%, #0077FF 45%, #0052CC 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 6px 16px rgba(0,35,102,0.4);
          transform: translateY(-1px);
        }
        .r3-dl-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .r3-dl-error {
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;
          padding: 10px 14px; font-size: 13px; font-weight: 600; color: #dc2626; margin-top: 12px;
        }

        /* ── Spinner ───────────────────────────── */
        .r3-spinner {
          display: inline-block; width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.4); border-top-color: #ffffff;
          border-radius: 50%; animation: r3spin 0.7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes r3spin { to { transform: rotate(360deg); } }

        /* ── Footer ────────────────────────────── */
        .r3-footer {
          border-top: 2px solid #002366; padding: 20px 40px;
          text-align: center; font-size: 13px; font-weight: 600; color: #475569;
        }

        /* ── Responsive ────────────────────────── */
        @media (max-width: 640px) {
          .r3-nav { padding: 14px 20px; }
          .r3-body { padding: 32px 16px 60px; }
          .r3-card { padding: 24px 20px; }
          .r3-output-card { padding: 20px; }
          .r3-step3-card { padding: 24px 20px; }
          .r3-footer { padding: 20px; }
        }
      `}</style>

      <div className="r3-page">

        {/* ── Nav ─────────────────────────────────────────────────────── */}
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

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="r3-body">

          {/* Page Header */}
          <div className="r3-header">
            <p className="r3-header-eyebrow">AI Career Suite · Interview Tool</p>
            <h1>Interview Prep AI</h1>
            <p className="r3-header-sub">
              Upload your resume and paste the target job description. Click{' '}
              <strong>Build Interview Prep</strong> to assemble your personalized prompt,
              then paste it into your AI of choice to receive 20 practice questions with
              coached answers — including strategies for your resume&apos;s weak points.
            </p>
          </div>

          {/* ── Step 1: Upload ───────────────────────────────────────────── */}
          <div className="r3-card">
            <p className="r3-card-title">Step 1 — Upload Your Documents</p>

            <FileInput id="ip-resume" label="Your Resume" required onChange={setResumeFile} />

            <div className="r3-field">
              <label className="r3-label" htmlFor="ip-jobdesc">
                Target Job Description <span className="r3-required">*</span>
              </label>
              <textarea
                id="ip-jobdesc"
                className="r3-textarea-jd"
                value={jobDescText}
                onChange={(e) => setJobDescText(e.target.value)}
                placeholder="Paste the full job description here…"
              />
            </div>
          </div>

          {error && <div className="r3-error">{error}</div>}

          {/* Build Button */}
          <button
            id="ip-combine-btn"
            className="r3-combine-btn"
            onClick={handleCombine}
            disabled={processing}
          >
            {processing && <span className="r3-spinner" />}
            {processing ? 'Processing…' : 'Build Interview Prep'}
          </button>

          {/* ── Step 2: Copy & Paste ──────────────────────────────────────── */}
          <div className="r3-output-card">
            <p className="r3-card-title">Step 2 — Copy &amp; Paste to Your AI</p>
            <p className="r3-output-hint">
              Your complete prompt is ready below — resume, job description, and all coaching
              instructions are combined. Click <strong>Copy to Clipboard</strong> then paste
              into ChatGPT, Claude, Gemini, or any LLM with <strong>Ctrl+V</strong>.
            </p>
            <textarea
              id="ip-output"
              className="r3-textarea"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder="Your interview prep prompt will appear here after clicking Build Interview Prep…"
              spellCheck={false}
            />
          </div>

          <button
            id="ip-copy-btn"
            className={`r3-copy-btn${copied ? ' r3-copy-btn-success' : ''}`}
            onClick={handleCopy}
            disabled={!output}
          >
            {copied ? '✓ Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>

          {/* ── Step 3: Format & Download ─────────────────────────────────── */}
          <div className="r3-step3-card">
            <p className="r3-card-title">Step 3 — Format &amp; Download Word Doc</p>
            <div className="r3-step3-tip">
              <span className="r3-step3-tip-icon">💡</span>
              <span>
                After your AI returns the completed Interview Strategy report, paste the full
                output below. Click <strong>Download as Word Document</strong> to receive a
                neatly formatted <strong>.docx</strong> file — title, numbered questions,
                and example answers all laid out professionally.
              </span>
            </div>
            <div className="r3-field" style={{ marginBottom: 0 }}>
              <label className="r3-label" htmlFor="ip-llm-output">
                Paste AI Interview Prep Output Here
              </label>
              <textarea
                id="ip-llm-output"
                className="r3-textarea"
                style={{ minHeight: '340px' }}
                value={llmOutput}
                onChange={(e) => setLlmOutput(e.target.value)}
                placeholder="Paste the full interview strategy returned by your AI model here…"
                spellCheck={false}
              />
            </div>
            <button
              id="ip-download-btn"
              className="r3-dl-btn"
              disabled={!llmOutput.trim() || downloading}
              onClick={async () => {
                setDlError('');
                setDownloading(true);
                try {
                  const res = await fetch('/api/interview/format', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reportText: llmOutput }),
                  });
                  if (!res.ok) {
                    const e = await res.json();
                    throw new Error(e.error || 'Server error');
                  }
                  const blob = await res.blob();
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement('a');
                  a.href = url;
                  a.download = 'interview-prep.docx';
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

        </div>{/* /r3-body */}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="r3-footer">
          © 2026 SSLDuck. All Rights Reserved.
        </footer>

      </div>
    </>
  );
}
