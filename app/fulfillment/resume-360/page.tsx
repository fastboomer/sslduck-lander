'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Prompt Template ───────────────────────────────────────────────────────────
const PROMPT_TEMPLATE = `RESUME TAILORING PROMPT

ROLE
You are an expert resume writer and career counselor with deep knowledge of recruiting, ATS systems, and hiring practices. Working only from the three inputs below, you produce: one tailored resume (with a primary Professional Profile), two alternate Professional Profile variations, and a short personal note to the client.

INPUTS
Input-1 — Current resume: between <doc1-resume> and </doc1-resume>
Input-2 — Additional information (optional): between <doc2-new-info> and </doc2-new-info>
Input-3 — Target job description: between <doc3-job-description> and </doc3-job-description>

Use only information found in these inputs. Never invent employers, dates, titles, skills, certifications, or achievements.

METHOD (internal — do NOT print)
Reason through these steps silently. This analysis must not appear in your output; only the deliverables in the OUTPUT section should be printed.
1. Extract from Inputs 1–2: work history (reverse chronological), accomplishments, hard and soft skills, certifications, achievements, education.
2. Extract from Input-3: required skills, responsibilities, qualifications, desired attributes.
3. Compare: identify direct matches, transferable skills, and the client's strongest selling points for this role.
4. Synthesize and revise: build the resume around the strongest matches, then check ATS keyword coverage and every formatting rule before finalizing.

OUTPUT (print only the following, in this order)

=== RESUME (max 2 pages) ===

Header / contact block
- Name
- City, State (no street address)
- LinkedIn URL
- Email
- Phone, formatted xxx-xxx-xxxx (no parentheses)

PROFESSIONAL PROFILE
- The exact job title from Input-3.
- Three traits matching the top three requirements of Input-3, each two words max, separated by " | ".
- A profile paragraph of 75–95 words. Use the client's first name once, action-oriented language, and ATS keywords from Input-3. Do not use "candidate," "applicant," any personal pronoun beyond the single first-name use, or the target employer's name.

SKILLS
- One line of skills, each 3–4 words max, separated by " | ".

PROFESSIONAL EXPERIENCE (reverse chronological)
For each role:
- Company  Location
- Job Title  Start date to End date (or "Present")
- Achievement bullets, each starting with "• "
- Blank line before the next role.
(Optional) OTHER EXPERIENCE — same format, for high-value older/adjacent roles or to fill space.

CERTIFICATIONS (if any) — one paragraph, items separated by "; "
ACHIEVEMENTS (if any) — one paragraph, items separated by "; "
PROFESSIONAL ORGANIZATIONS (if any) — one line, each 3–4 words max, separated by " | "

EDUCATION (always the final section)
- School
- Area of study (no graduation date)
- Repeat for each school.

=== PAGE 3: Additional Professional Profile Variations ===
Repeat the job title and three-trait line, then provide two alternate profiles (same 75–95 word, first-name-once, no-pronoun rules, same role focus):
- Variation 1: different tone (e.g., leadership- or teamwork-forward).
- Variation 2: emphasize a different set of skills or experiences from Inputs 1–2.

=== Final Notes / Rationale ===
A warm note written directly to the client, addressing them as "you":

Hi [first name]!
3–5 sentences: name the three traits you led with and why each maps to a top requirement of this role; add one or two specific, positive observations about their background and fit; close on an encouraging note about their prospects.
Wishing you all the best,
Glo

TRAIT SELECTION RULES
Choose the three traits the job most demands, cross-referenced to real qualifications in Inputs 1–2. If there is no exact match, choose the closest genuine trait — never fabricate. Each trait is two words max. Your reasoning belongs only in the Final Notes section.

CONTENT RULES
- ATS-optimized: mirror relevant keywords from Input-3.
- Quantify achievements wherever the inputs support it (e.g., "cut costs 18%").
- No personal pronouns in the resume body; the single first-name use in the profile is the only exception.
- Include nothing that is not present in Inputs 1–3.

FORMATTING REFERENCE (for the downstream Word parser)
These font/size/alignment notes tell the parser how to style your plain text — you output plain text only (see OUTPUT FORMAT). Single spacing throughout unless noted; "blank line above" means leave one empty line before that element.
- Name: left, 14pt bold Arial.
- City/State, LinkedIn, Email, Phone: left, 11pt Arial.
- PROFESSIONAL PROFILE: all caps, centered, 14pt bold Arial, blank line above.
- Job title (under the profile header): centered, 11pt bold Arial.
- Three traits: centered, 11pt Arial, separated by " | ".
- Profile paragraph: left, 11pt Arial, blank line above.
- Section headers SKILLS, PROFESSIONAL EXPERIENCE, OTHER EXPERIENCE, CERTIFICATIONS, ACHIEVEMENTS, EDUCATION: all caps, centered, 11pt bold Arial, blank line above (PROFESSIONAL EXPERIENCE also has a blank line below).
- Skills paragraph and Professional Organizations paragraph: left, 11pt Arial.
- Company: left, 11pt bold Arial; location follows on the same line after two spaces, not bold.
- Job title line: left, 11pt italics Arial; date range on the same line, right-justified, 11pt Arial; the two are separated by two spaces.
- Bullets: "• ", 11pt Arial.
- Certifications / Achievements: paragraph form, items separated by "; ".
- School: left, 11pt bold Arial; next line area of study, left, 11pt Arial, not bold; no dates.
- "Additional Professional Profile Variations" (page 3) and "Final Notes / Rationale": centered, 11pt bold Arial.

FITTING TO 2 PAGES — apply only as needed, in this order:
1. Drop the skills-paragraph entries to 10pt (all headers stay 11pt bold centered).
2. Drop the entire body to 10pt Arial (headers stay 11pt centered).
3. Set top and bottom margins to 0.5".
4. Set side margins to 0.75".
5. Remove roles older than 7 years and add: "Additional work history available on request."

OUTPUT FORMAT
Output 100% plain text. Do not produce real or literal markdown, HTML, or RTF — no **, __, *, _, #, or tags. The FORMATTING REFERENCE is for the parser, not for you to render. Structural conventions the parser depends on:
- Section headers on their own lines.
- Bullets begin with "• ".
- Company and location on one line, separated by two spaces.
- Job title and date range on one line, separated by two spaces.
- Separate list items and roles with a blank line.`;


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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Resume360Page() {
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
  // New Information Dual Input States
  const [newInfoFile, setNewInfoFile] = useState<File | null>(null);
  const [newInfoFileText, setNewInfoFileText] = useState('');
  const [newInfoDescText, setNewInfoDescText] = useState('');

  // Target Job Description Dual Input States
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobFileText, setJobFileText] = useState('');
  const [jobDescText, setJobDescText] = useState('');

  const [model, setModel] = useState<'default' | 'gemini'>('default');
  const [output, setOutput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Step 3 state
  const [llmOutput, setLlmOutput] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState('');

  // Reset copied state after 2.5 s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  // File Change Handlers for Dual Inputs
  const handleNewInfoFileChange = async (file: File | null) => {
    setNewInfoFile(file);
    if (file) {
      try {
        setError('');
        const text = await readFile(file);
        setNewInfoFileText(text);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError('Error reading new information file: ' + msg);
        setNewInfoFileText('');
      }
    } else {
      setNewInfoFileText('');
    }
  };

  const handleJobFileChange = async (file: File | null) => {
    setJobFile(file);
    if (file) {
      try {
        setError('');
        const text = await readFile(file);
        setJobFileText(text);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError('Error reading job description file: ' + msg);
        setJobFileText('');
      }
    } else {
      setJobFileText('');
    }
  };

  const handleCombine = async () => {
    const finalJobText = jobFile ? jobFileText : jobDescText;
    const finalNewInfo = newInfoFile ? newInfoFileText : newInfoDescText;

    if (!resumeFile || !finalJobText.trim()) {
      setError('Please upload your Resume and provide a Job Description (either by file upload or copy/paste).');
      return;
    }

    setError('');
    setProcessing(true);
    try {
      const resumeText = await readFile(resumeFile);

      const finalPrompt = `\n${PROMPT_TEMPLATE}\n<doc1-resume>\n${resumeText}\n</doc1-resume>\n\n<doc2-new-info>\n${finalNewInfo || 'No additional information provided.'}\n</doc2-new-info>\n\n<doc3-job-description>\n${finalJobText}\n</doc3-job-description>\n`;

      setOutput(finalPrompt);

      // Automatically copy to clipboard for convenience
      try {
        await navigator.clipboard.writeText(finalPrompt);
        setCopied(true);
      } catch {
        // Fallback silently if browser blocks clipboard API without user interaction
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
            <p className="r3-header-eyebrow">AI Career Suite · Resume Tool</p>
            <h1>Resume 360 + Professional Profile</h1>
            <p className="r3-header-sub">
              Upload your resume, an optional new information file, and the target job description.
              Click <strong>Combine Documents</strong>, then copy the result and paste it directly
              into any AI model.
            </p>
          </div>

          {/* ── Input Card ──────────────────────────────────────────────── */}
          <div className="r3-card">
            <p className="r3-card-title">Step 1 — Upload Your Documents</p>

            {/* Model selector */}
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
              label="Resume"
              required
              onChange={setResumeFile}
            />
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
              <FileInput
                id="r3-newinfo-file"
                label="New Information (Optional File PDF, Word, or TXT)"
                onChange={handleNewInfoFileChange}
              />
            </div>

            <div className="r3-field">
              <label className="r3-label" htmlFor="r3-newinfo-text" style={{ opacity: newInfoFile ? 0.55 : 1 }}>
                Or Copy/Paste New Information (Optional)
              </label>
              {newInfoFile && (
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>
                  ℹ️ New information uploaded as a file above. Clear the file to enable raw pasting instead.
                </p>
              )}
              <textarea
                id="r3-newinfo-text"
                className="r3-textarea"
                style={{
                  minHeight: '100px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  backgroundColor: newInfoFile ? '#f1f5f9' : 'rgba(0,35,102,0.01)',
                  border: '1px solid rgba(0,35,102,0.25)',
                  borderRadius: '6px',
                  padding: '12px',
                  lineHeight: '1.5',
                  color: newInfoFile ? '#64748b' : '#0f172a',
                  opacity: newInfoFile ? 0.55 : 1,
                  cursor: newInfoFile ? 'not-allowed' : 'text'
                }}
                value={newInfoFile ? 'New information loaded via file upload.' : newInfoDescText}
                onChange={(e) => setNewInfoDescText(e.target.value)}
                placeholder={newInfoFile ? 'File uploaded above' : "Type or paste any new info, notes, coursework, or project achievements here..."}
                spellCheck={!newInfoFile}
                disabled={!!newInfoFile}
              />
            </div>

            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
              <FileInput
                id="r3-job-file"
                label="Target Job Description (Optional File PDF, Word, or TXT)"
                onChange={handleJobFileChange}
              />
            </div>

            <div className="r3-field">
              <label className="r3-label" htmlFor="r3-jobdesc" style={{ opacity: jobFile ? 0.55 : 1 }}>
                📂 OR COPY/PASTE TARGET JOB DESCRIPTION {!jobFile && <span className="r3-required"> *</span>}
              </label>
              {jobFile && (
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>
                  ℹ️ Job description uploaded as a file above. Clear the file to enable raw pasting instead.
                </p>
              )}
              <textarea
                id="r3-jobdesc"
                className="r3-textarea"
                style={{
                  minHeight: '140px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  backgroundColor: jobFile ? '#f1f5f9' : 'rgba(0,35,102,0.01)',
                  border: '1px solid rgba(0,35,102,0.25)',
                  borderRadius: '6px',
                  padding: '12px',
                  lineHeight: '1.5',
                  color: jobFile ? '#64748b' : '#0f172a',
                  opacity: jobFile ? 0.55 : 1,
                  cursor: jobFile ? 'not-allowed' : 'text'
                }}
                value={jobFile ? 'Target job description loaded via file upload.' : jobDescText}
                onChange={(e) => setJobDescText(e.target.value)}
                placeholder={jobFile ? 'File uploaded above' : "Paste employer's complete job description here. PRO TIP: Make sure you include employer's name and complete job title."}
                spellCheck={!jobFile}
                disabled={!!jobFile}
              />
            </div>
          </div>

          {/* Error */}
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

          {/* ── Output Card ─────────────────────────────────────────────── */}
          <div className="r3-output-card">
            <p className="r3-card-title">Step 2 — Copy & Paste to Your AI</p>
            <p className="r3-output-hint">
              The window below contains your combined prompt. Click{' '}
              <strong>Copy to Clipboard</strong> then paste into your AI model window with{' '}
              <strong>Ctrl+V</strong>.
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

          {/* ── Step 3: Format & Download ──────────────────────────────── */}
          <div className="r3-step3-card">
            <p className="r3-card-title">Step 3 — Format &amp; Download Word Doc</p>
            <div className="r3-step3-tip">
              <span className="r3-step3-tip-icon">💡</span>
              <span>
                After your AI returns the completed resume, paste the full output below.
                Click <strong>Download as Word Doc</strong> to receive a properly
                formatted <strong>.docx</strong> file — Arial font, correct heading sizes,
                right-aligned dates, bullet points, and page breaks all applied automatically.
              </span>
            </div>
            <div className="r3-field" style={{ marginBottom: 0 }}>
              <label className="r3-label" htmlFor="r3-llm-output">
                Paste AI Resume Output Here
              </label>
              <textarea
                id="r3-llm-output"
                className="r3-textarea"
                style={{ minHeight: '340px' }}
                value={llmOutput}
                onChange={(e) => setLlmOutput(e.target.value)}
                placeholder="Paste the full resume text returned by your AI model here…"
                spellCheck={false}
              />
            </div>
            <button
              id="r3-download-btn"
              className="r3-dl-btn"
              disabled={!llmOutput.trim() || downloading}
              onClick={async () => {
                setDlError('');
                setDownloading(true);
                try {
                  const res = await fetch('/api/resume-360/format', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resumeText: llmOutput }),
                  });
                  if (!res.ok) {
                    const e = await res.json();
                    throw new Error(e.error || 'Server error');
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'resume.docx';
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
              {downloading ? 'Generating…' : '⬇ Download as Word Doc'}
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
