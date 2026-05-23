'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Prompt Template ───────────────────────────────────────────────────────────
const PROMPT_TEMPLATE = `[STRICT OUTPUT RULE - NO AI INTRO, PREAMBLE, OR META-COMMENTS]
You MUST NOT output any conversational introduction, commentary, preamble, or meta-notes. Under no circumstances should you note any conflicts between formatting instructions and the plain-text directive. All formatting specifications (font sizes, centering, bolding) represent target layout markers for our downstream parser; understand this and proceed directly to outputting the Applicant Suitability Study report without explanation. Your response MUST start IMMEDIATELY with the H2 Title Page header: "Applicant Suitability Study for [first_name] [last_name], [job_title], [company]".

[OUTPUT CONTROL INSTRUCTIONS]
[FORMATTING INSTRUCTION CLARIFICATION]
You are a text-generating AI model. You must output ONLY clean, 100% plain text. Do NOT attempt to produce actual rich text, HTML, RTF, or markdown formatting (do NOT use asterisks ** or __ for bold, or * or _ for italics, or # for headings) except for the use of pipe characters "|" to represent structure for our Markdown Table Parser. 
The formatting specifications in this prompt (such as "Arial, 11pt, centered, bold", "Arial 10pt", "H2 title", etc.) are instructions for the downstream parsing engine that will convert your plain text output into a Word Document. 
To satisfy these specifications, simply structure your plain text output according to the layout rules (e.g., using exact headers, separating items by blank lines, keeping lists on separate lines). The parser will handle applying the bolding, font sizes, alignments, and fonts in the final Word Document. 
Your output must be 100% plain text, without any HTML tags, RTF tags, or markdown stars/underscores.

PROMPT:
SYSTEM INSTRUCTIONS: You are responding as a friendly, highly experienced professional career advancement counselor and resume expert. Let's think step by step, combined with a ReAct strategy.

BACKGROUND:
I have pasted the resume between <resume> and </resume>, and a target Job Description between <job_description> and </job_description>.

YOUR TASK:
Carefully read the resume and the target Job Description and then prepare the following report:

Begin report: H2 Title page, bold, “Applicant Suitability Study for [first_name] [last_name], [job_title], [company]”
blank line; 

Begin table1, centered, with title, Arial, 11pt, centered, bold: “Hard and Soft Skills Analysis” structured as follows: All column entries are left justified. 

The table will report skills grouped as follows: Label, Arial, 11pt, bold, column1: “Resume Hard Skills”; in this column list all hard skills that appear on the resume, one item per line - Arial 10pt, 
next column: Label, Arial, 11pt, bold, column 2: “Resume Soft Skills” and list all soft skills that appear on the resume, one item per line - Arial 10pt.
Use standard markdown table syntax with "|" to format this table.

DEFINITION and EXAMPLE of hard and soft skills:
Hard skills refer to specific, measurable abilities or technical knowledge that can be learned through training, education, or experience, and are directly related to performing the tasks of a particular job, like programming languages, data analysis, accounting software proficiency, or fluency in a foreign language. Essentially, they are the tangible skills that can be easily verified and assessed, unlike "soft skills" which focus more on personal attributes like communication or teamwork.
Soft skills refer to personal attributes and interpersonal abilities that describe how someone interacts with others and works in a professional setting, including qualities like communication, teamwork, adaptability, problem-solving, leadership, critical thinking, and time management, as opposed to technical or hard skills specific to a job role. 
<blank line>

Next, analyze Job Description located between <job_description> and </job_description> and note all job requirements including required hard and soft skills, years of experience, and include any job requirements for experience with specific tools or job functions. You will be preparing a detailed list.  
<blank line>
Begin table2, centered, with title, Arial, 11pt, centered, bold: “Job Requirements for [job_title], [company]” structured as follows: All column entries are left justified, Arial 10pt. Use standard markdown table syntax with "|" to format this table.
 
You will be reporting comprehensive hard and soft skills, and any other requirements grouped as follows: please display one item per line: column 1, label “Job Requirements” list one requirement per line, then in column 2, label [first_name] [last_name] and list in column 2 across from each column 1 job requirement, a check mark "✓" if the corresponding skill or experience are present in the resume, and across from any column1 requirement not appearing on the resume, display “MISSING”
<page break>

Prepare 2 column table, title, center H2: KEYWORDS
Column1 label, Arial 11pt bold “Job Description Keywords” and label column 2 “Resume”. Use standard markdown table syntax with "|" to format this table.
List keywords representing hard and soft skills from the Job Description, in column1 and write MISSING in column 2 across from any keywords not in resume 
Below the table, leave blank line then display the following exact warning: “WARNING Although the keywords identified are important to include, they should not be added unless they are truly representative of your skills and/or interests. If your resume is tagged for “keyword stuffing” it may end up in the REJECTED pile!”  
<page break>
Begin new page with H2 title: “Probable ATS Diagnosis”
<blank line>
This requires candor and insight. The objective is to help the applicant understand how well they are suited to the opportunity represented by the job description. We will do this by discussing in-depth the following areas: 

Start paragraph with Arial, 11pt bold “ATS and Your Resume.” Explain that many ATS systems are exact match tools, meaning they are sensitive to specific keywords. Based on the example job description, the client [first_name] should make sure their resume has not inadvertently omitted any items marked as missing in the Job Requirements report that should be in their resume.  

Explain ATS is typically set to score 0 to 90, and looks for candidates in the 65-85 range, with a pass/fail threshold of 60. Estimate where you believe they score.

SUMMARY Please write a summary, titled “A final note…” minimum 150 words, more is ok. Begin with “Hi [first_name]! Classify the match between the resume and the job description as low, medium or high in terms of the resume holder’s suitability and determine if they appear to be a good fit for the job. Do not flatter. In order to help the user, if they are a great fit, then explain why. If they are a bad fit, give them ideas for better possibilities. Continue by discussing the type of job based on the resume, the holder is best suited for and list 5 alternate possibilities. Conclude with a statement of positive encouragement.
<blank line>
Signature:
Wishing you the best,
Glo

IMPORTANT: DO NOT QUOTE SOURCES.
DO NOT OFFER FURTHER HELP SUCH AS WRITING THE PROFESSIONAL PROFILE, ETC. 
IMPORTANT Please do not request further input and please create this entire task without pause in one go.
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

// ── Main Page Component ───────────────────────────────────────────────────────
export default function SuitabilityPage() {
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
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

      // Automatically copy to clipboard for convenience
      try {
        await navigator.clipboard.writeText(finalPrompt);
        setCopied(true);
      } catch {
        // Fallback silently if clipboard blocked
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
            <p className="r3-header-eyebrow">AI Career Suite · Suitability Study Tool</p>
            <h1>Suitability Study &amp; Job Options</h1>
            <p className="r3-header-sub">
              Upload your resume and target job description. Click <strong>Combine Documents</strong>, 
              then copy the tailored prompt and paste it into your LLM of choice to generate an in-depth 
              Applicant Suitability Study report with Skills analysis, Job requirements matrix, Keywords, 
              ATS score estimate, and Glo&apos;s personal recommendations.
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
              label="Current Resume"
              required
              onChange={setResumeFile}
            />

            <div className="r3-field">
              <label className="r3-label" htmlFor="r3-jobdesc">
                📂 COPY/PASTE TARGET JOB DESCRIPTION <span className="r3-required"> *</span>
              </label>
              <textarea
                id="r3-jobdesc"
                className="r3-textarea"
                style={{
                  minHeight: '140px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  backgroundColor: 'rgba(0,35,102,0.01)',
                  border: '1px solid rgba(0,35,102,0.25)',
                  borderRadius: '6px',
                  padding: '12px',
                  lineHeight: '1.5',
                  color: '#0f172a'
                }}
                value={jobDescText}
                onChange={(e) => setJobDescText(e.target.value)}
                placeholder="Paste employer's complete job description here. PRO TIP: Make sure you include employer's name and complete job title."
                spellCheck={true}
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
            <p className="r3-card-title">Step 2 — Copy &amp; Paste to Your AI</p>
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
                After your AI returns the completed Suitability Study report, paste the full output below. Click <strong>Download as Word Document</strong> to receive a perfectly formatted <strong>.docx</strong> file with Arial font and standard layout.
              </span>
            </div>

            <div className="r3-field">
              <label className="r3-label" htmlFor="r3-llm-output">
                Paste AI Suitability Study Output Here
              </label>
              <textarea
                id="r3-llm-output"
                className="r3-textarea"
                style={{ minHeight: '340px' }}
                value={llmOutput}
                onChange={(e) => setLlmOutput(e.target.value)}
                placeholder="Paste the full suitability study text returned by your AI model here…"
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
                  const res = await fetch('/api/suitability/format', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ suitabilityText: llmOutput }),
                  });
                  if (!res.ok) {
                    const e = await res.json();
                    throw new Error(e.error || 'Server error');
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'suitability_study.docx';
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
