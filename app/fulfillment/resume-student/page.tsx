'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Prompt Template ───────────────────────────────────────────────────────────
const PROMPT_TEMPLATE = `[STRICT OUTPUT RULE - NO AI INTRO OR PREAMBLE]
You MUST NOT output any conversational introduction, commentary, or preamble (such as "Certainly! Here is the resume:" or "Here is the customized student resume..."). Your response MUST start IMMEDIATELY with the candidate's Name as the very first line of text.

[OVERVIEW] Create a student resume, 1 page, adhering to the Rules listed below.
Then, on a new page, generate exactly two additional variations of the Professional Profile to offer different tones or emphases while maintaining alignment with the job description. Last, Review and revise the resume to ensure compliance with all rules and best practices.

[PROCESS-INFORMATION EXTRACTION]
From Input_1: Extract and list key details, including work history (in reverse chronological order), job accomplishments, hard skills, soft skills, certifications, achievements, and education.
From Input_2 (additional information), if provided: Extract and list any supplementary details relevant to the resume.
NOTE: The client may not have a resume, in which case you will build the student resume based only on Input-2 and Input-3.
From Input_3 (target job description): Extract and list all key requirements, responsibilities, and the employer’s desired attributes (e.g., skills, experience, qualifications).

[COMPARISON]
Compare the student resume client’s qualifications (from Inputs 1 and 2) with the requirements and attributes from Input_3, target job description.
Identify student resume client’s strengths, direct matches, and relevant transferable skills. Do not try to be helpful by listing traits or experience not listed in input_1 and input_2. 

[STUDENT RESUME CREATION]
Synthesize all extracted information into a new, professionally formatted 1 page student resume.
Ensure compliance with the Rules listed below:
NOTE: Student resumes differ from other resumes as follows:
Single page only.

[HEADER & RETURN ADDRESS FORMAT]
Start immediately with the candidate's name and contact return address. It MUST be formatted as exactly 1 item per line:
Line 1: Candidate Name (renders in 11 pt bold)
Line 2: City, State
Line 3: Phone Number (format strictly as a 10-digit number with hyphens and NO parenthesis: e.g. 123-456-7890)
Line 4: Email Address (display strictly as raw text. Do NOT use "mailto:" links, do NOT print the email address twice, and do NOT wrap it in HTML or markdown hyperlinks)
Line 5: LinkedIn URL (display strictly as raw text, do NOT wrap in HTML or markdown hyperlinks)
CRITICAL: Do NOT include GitHub, personal websites, or any other social/professional profiles. Limit the return address strictly to these 5 lines.

[STRUCTURE & SECTIONS]
Title and Section Titles in Arial, 12 pt. bold centered: first section is PROFESSIONAL PROFILE
Followed by job title from input_3 in Arial, 10 pt. bold centered: i.e. “Software Jr. Engineer”
Followed by three Traits: Display three traits in Arial 10 pt. (not bolded) each no more two words, each trait separated by " | " .
THREE TRAITS SELECTION PROCESS: Analyze Input_3 to identify the three most critical, desired traits or skills. Cross-reference with qualifications from Inputs 1 and 2. If no exact match, select the closest relevant traits from Inputs 1 or 2. 
* Do not fabricate traits.
* Each trait 2 words max
Final part of PROFESSIONAL PROFILE: 
Start on the second line below the 3 traits, display a left-justified, one-paragraph profile (75–95 words). 
Use the candidate's first name once; 
DO NOT USE personal pronouns;
DO NOT USE terms like "candidate" or "applicant"; 
DO NOT mention the target employer's name from Input_3. 
Develop the profile by Identifying client’s key qualifications, skills, and achievements aligning with Input_3, emphasizing selected traits. 
Use action-oriented language and ATS-friendly keywords.

[SECTIONS IN ORDER] **NOTE** Display each section header in Arial, 12 pt, bold, centered
PROFESSIONAL PROFILE 
SKILLS
EDUCATION
PROFESSIONAL EXPERIENCE
OTHER EXPERIENCE (only if needed)  
CERTIFICATIONS (display only if there are certifications listed)
VOLUNTEER WORK (display only if listed)

SECTION NOTES: 
Section headers are Arial, 12 pt bold, centered; display all content in Arial 10 pt. Not bolded;
SKILLS: list relevant skills, each skill 3 words max, separated by “ | “ use left justified paragraph format;
EDUCATION: Include study major, completion and/or graduation or projected graduation dates; Bold University names
Example:
Carnegie Mellon University - 2026
MBA
University of Pittsburgh - 2022
B.S. Electrical Engineering - Honors
PROFESSIONAL EXPERIENCE: The client may have no real world work experience, therefore list class projects and awards that reflect on the target job; Internship accomplishments can substitute as work experience, show the employer and dates. Format every single accomplishment or project bullet point strictly starting with a hyphen: e.g. "- Accomplished X using Y".
CERTIFICATIONS
VOLUNTEER WORK 

[2 PROFESSIONAL PROFILE VARIATIONS SECTION]
You must output exactly two variations of the Professional Profile under the section header:
"2 PROFESSIONAL PROFILE VARIATIONS:"
Display exactly 2 variations on a new page:
Variation 1: Adjust tone (e.g., emphasize leadership or teamwork) while maintaining alignment with Input-3.
Variation 2: Highlight a different set of skills or experiences from Inputs 1 and 2, still relevant to Input-3.
Ensure these are clearly labeled as "Variation 1" and "Variation 2".

[FINAL NOTES / RATIONALE SECTION]
Create a section titled exactly "FINAL NOTES / RATIONALE" below the profile variations.
Write a warm, personal note DIRECTLY to the resume client — speak to them as "you", not about them. Structure it exactly as follows:
Line 1: "Hi [resume client's first name]!"
Body (3-5 sentences): Explain which three traits you selected and WHY each one aligns with this specific job's top requirements — address the client directly (e.g. "I chose Collaborative Leader as your lead trait because the role calls for..."). Include 1-2 sentences of specific, positive observations about their background and how well it positions them for this role. Close the body with an encouraging, upbeat statement about their prospects.
Signature (on its own lines, exactly as written):
Wishing you all the best,
Glo
Title for this section: centered, 12pt bold Arial: Final Notes / Rationale`;

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
export default function ResumeStudentPage() {
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [newInfoFile, setNewInfoFile] = useState<File | null>(null);
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

  // Reset copied state after 2.5 s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCombine = async () => {
    if (!jobDescFile) {
      setError('Please upload the Target Job Description.');
      return;
    }
    if (!resumeFile && !newInfoFile) {
      setError('Please upload either an existing Resume or New Information (or both).');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const resumeText = resumeFile ? await readFile(resumeFile) : '';
      const jobDescText = await readFile(jobDescFile);
      const newInfoText = newInfoFile ? await readFile(newInfoFile) : '';

      const finalPrompt = `${PROMPT_TEMPLATE}\n\n<input_1>\n${resumeText || 'No old resume provided (client has no prior resume).'}\n</input_1>\n\n<input_2>\n${newInfoText || 'No additional information provided.'}\n</input_2>\n\n<input_3>\n${jobDescText}\n</input_3>`;

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
            <p className="r3-header-eyebrow">AI Career Suite · Student Resume Tool</p>
            <h1>Resume Tool – Early and Student</h1>
            <p className="r3-header-sub">
              Upload your documents, an optional new information file, and your target job description. 
              Click <strong>Combine Documents</strong> to bundle everything into a specialized student resume 
              prompt, copy it to your clipboard, and paste it into your favorite LLM.
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
              label="Resume (Optional)"
              onChange={setResumeFile}
            />
            <FileInput
              id="r3-newinfo"
              label="New Information (Optional)"
              onChange={setNewInfoFile}
            />
            <FileInput
              id="r3-jobdesc"
              label="Job Description"
              required
              onChange={setJobDescFile}
            />
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
                After your AI returns the completed student resume, paste the full output below. 
                Click <strong>Download as Word Document</strong> to receive a perfectly formatted, 
                1-page <strong>.docx</strong> file with Arial font, centered headers, and page breaks applied automatically.
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
                  const res = await fetch('/api/resume-student/format', {
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
                  a.download = 'student_resume.docx';
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
