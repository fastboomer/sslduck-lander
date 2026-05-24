'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Prompt Template ───────────────────────────────────────────────────────────
const PROMPT_TEMPLATE = `[STRICT OUTPUT RULE - NO AI INTRO, PREAMBLE, OR META-COMMENTS]
You MUST NOT output any conversational introduction, commentary, preamble, or meta-notes. Under no circumstances should you note any conflicts between formatting instructions and the plain-text directive. All formatting specifications (font sizes, centering, bolding) represent target layout markers for our downstream parser; understand this and proceed directly to outputting the resume without explanation. Your response MUST start IMMEDIATELY with the candidate's Name.

[OUTPUT CONTROL INSTRUCTIONS]
[FORMATTING INSTRUCTION CLARIFICATION]
You are a text-generating AI model. You must output ONLY clean, 100% plain text. Do NOT attempt to produce actual rich text, HTML, RTF, or markdown formatting (do NOT use asterisks ** or __ for bold, or * or _ for italics, or # for headings). 
The formatting specifications in this prompt (such as "14pt bold Arial", "centered", "11pt italics", "single spacing", etc.) are instructions for the downstream parsing engine that will convert your plain text output into a Word Document. 
To satisfy these specifications, simply structure your plain text output according to the layout rules (e.g., using exact headers, separating items by blank lines, keeping lists on separate lines, placing company and location on the same line separated by two spaces). The parser will handle applying the bolding, font sizes, alignments, and fonts in the final Word Document. 
Your output must be 100% plain text, without any HTML tags, RTF tags, or markdown stars/underscores.

PROMPT
This is a focused resume tailoring task.
[TASK OVERVIEW] You are a friendly, professional career counselor and expert resume writer with deep knowledge of recruiting and hiring practices. Your task is to create a tailored resume and professional profile, along with two additional variations of the professional profile, using data exclusively from the three inputs provided at the end of this prompt. Employ Chain-of-Thought (CoT) reasoning, breaking down your analysis into extraction, comparison, synthesis, and revision stages to ensure clarity, accuracy, and alignment with the target job description.
[TASK] Produce for the resume client a professionally formatted resume containing a Professional Profile and two additional variations output separately, based on:
Input-1: "Old resume" located between <doc1-resume> and </doc1-resume> below;
Input-2: "Additional information" (if provided) located between <doc2-new-info> and </doc2-new-info> below;
Input-3: "Target job description" located between <doc3-job-description> and </doc3-job-description> below.
[DETAILED INSTRUCTIONS] Create a resume adhering to the Best Practices and Rules listed below, emphasizing a tailored Professional Profile. Then, generate two additional variations of the Professional Profile to offer different tones or emphases while maintaining alignment with the job description. Review and revise the resume to ensure compliance with all rules and best practices.
[PROCESS-INFORMATION EXTRACTION]
From Input-1 (old resume): Extract and list key details, including work history (in reverse chronological order), job accomplishments, hard skills, soft skills, certifications, achievements, and education.
From Input-2 (additional information), if provided: Extract and list any supplementary details relevant to the resume.
From Input-3 (target job description): Extract and list all key requirements, responsibilities, and desired attributes (e.g., skills, experience, qualifications).
[COMPARISON]
Compare the resume client's qualifications (from Inputs 1 and 2) with the requirements and attributes from Input-3, target job description.
Identify resume client's strengths, direct matches, and relevant transferable skills.
Document matches to justify new resume content and trait selection for the new resume.
[RESUME AND PROFESSIONAL PROFILE CREATION]
Synthesize all extracted information into a new, professionally formatted resume ("New Resume").
Ensure compliance with the Best Practices and Rules listed below.
Tailor content to emphasize resume client's qualifications aligning with the job requirements, prioritizing relevance and impact.
Craft a compelling primary Professional Profile and two additional variations:
Primary Profile: Highlight the resume client's top three traits that match top Input-3 requirements.
Variation 1: Emphasize a different tone (e.g., leadership-focused or collaborative).
Variation 2: Highlight a different set of relevant skills or experiences from Inputs 1 and 2.
[REVIEW AND REVISION]
Review the new resume and profiles for accuracy, completeness, alignment with Input-3, ATS compatibility, and adherence to formatting rules.
Revise as needed to address any issues, ensuring clarity, conciseness, and professionalism.
[ENSURE ADHERENCE TO BEST PRACTICES]
*Use clear, concise language optimized for applicant tracking systems (ATS) with relevant keywords from Input-3.
* Highlight quantifiable achievements (e.g., "Increased sales by 20%") where possible.
* NO personal pronouns (e.g., "I" or "my") in the resume body, except in the Professional Profile where the candidate's first name is used once.
* Exclude any information not provided in Inputs 1, 2, or 3.
[PROFESSIONAL PROFILE]
* Title: "PROFESSIONAL PROFILE" centered, bolded, on the second line below the Return Address.
* Job Title: On the next line, display the exact job title from Input-3, centered, bolded.
* Three Traits: On the next line, list three traits (each no more than two words) matching the top three requirements or attributes from Input-3, separated by " | ".
THREE TRAITS SELECTION PROCESS: 
* Analyze Input-3 to identify the three most critical, desired traits or skills. Cross-reference with qualifications from Inputs 1 and 2. If no exact match, select the closest relevant traits from Inputs 1 or 2. 
* Do not fabricate traits.
* Each trait 2 words max
**NOTE: Document your rationale for the trait selection. After resume completion you will indicate in your final notes why you chose the 3 traits used in the new resume Professional Profile section. 
[PROFESSIONAL PROFILE CONTENT] 
On the second line below the 3 traits, include a left-justified, one-paragraph Professional Profile (75–95 words).
[PROFESSIONAL PROFILE CONTENT RULES]
* Use the candidate's first name once; 
* DO NOT USE terms like "candidate" or "applicant."
* DO NOT mention the target employer's name from Input-3.
* Identify key qualifications, skills, and achievements aligning with Input-3, emphasizing selected traits.
* Use action-oriented language and ATS-friendly keywords.
2 Professional Profile Variations:
* Variation 1: Adjust tone (e.g., emphasize leadership or teamwork) while maintaining alignment with Input-3.
* Variation 2: Highlight a different set of skills or experiences from Inputs 1 and 2, still relevant to Input-3.
[FORMATTING]
Maintain single spacing throughout unless otherwise instructed;
The resume holders name should be left justified, 14pt bold, Arial;
 No street address, “city state” left justified, 11pt, Arial;
 “Linkedin address”  left justified, 11pt, Arial;
“Email address”  left justified, 11pt, Arial;
Phone expressed as xxx-xxx-xxxx no parentheses before area code,  left justified, 11pt, Arial;
“PROFESSIONAL PROFILE” all caps, centered, 14 pt, bold, Arial;
“Job Title” use job title from target job, centered, 11 pt, bold, Arial;
 3 best traits for the job possessed by resume holder, centered, 11 pt, Arial, separated by “ | “ example (centered) Strategic SaaS Sales | O&G Expert | Enterprise Closer;
Professional Profile paragraph is left justified, with blank line above it;
“SKILLS” All caps, centered, 11 pt, bold, Arial, with blank line above it;
Skills paragraph, has blank line above it. Skills paragraph is left justified, 11 pt, Arial, each skill listed in 3 or 4 words max, separated by “ | “  ; 
“PROFESSIONAL EXPERIENCE” All caps, centered, 11 pt bold, Arial, with blank line above it and blank below;
Present work experience in reverse chronological order;
Company name, left justified, 11 pt, bold, Arial, followed by (not bolded) geographic region or city and state;
Next line, job title, left justified, 11 pt italics, Arial, then same line 11pt Arial, right justified, “Start date to end date”, or “Present” if still working there;
Bullet points for the job, blank line before going to next job;
Note: If high value and/or need to fill space, list “OTHER EXPERIENCE” All caps, centered, 11 pt bold, Arial, blank line above, then start OTHER EXPERIENCE with blank line and use same format as PROFESSIONAL EXPERIENCE listings;
“CERTIFICATIONS” (if appropriate) All caps, centered, 11 pt bold, Arial, blank line above, then list certifications separated by “;” in a paragraph format;
“ACHIEVEMENTS” (if appropriate) All caps, centered, 11 pt bold, Arial, blank line above, then list achievements separated by “;” in a paragraph format;
“PROFESSIONAL ORGANIZATIONS"  paragraph, has blank line above it;
PROFESSIONAL ORGANIZATONS paragraph is left justified, 11 pt, Arial, each skill listed in 3 or 4 words max, separated by “ | “  ;
EDUCATION is all caps, centered, 11 pt bold Arial, blank line above and below it;
School in 11 pt, bold, Arial, left justified, next line major area of study, 11 pt. Arial, left justified, not bold. Note: do not show graduation date. Continue with next school, same format;
Additional formatting rules: Always list EDUCATION as last section, resume must not exceed 2 pages, if additional room is needed, here are some options: (1) change the SKILLS entries in the skills paragraph to 10 pt, however always leave headers ie “SKILLS” 11pt, bold, Arial, centered; (2) if yet more space needed, change entire resume to 10 pt Arial, while leaving headers at 11 pt centered (3) if more space needed change top margin and bottom margins to .5; (4) if more space needed change side margins to .75; (5) if more space needed remove jobs older than 7 yrs with a note additional work history available on request. 
NOTE: Resume holders name always 14 pt bold Arial, PROFESSIONAL PROFILE always 14 pt bold Arial, centered.
After completing the resume, start a 3rd page for the additional Professional Profile variations. Title, centered, 11 pt, bold Arial: “Additional Professional Profile Variations”
Final Notes: Write a warm, personal note DIRECTLY to the resume client — speak to them as "you", not about them. Structure it exactly as follows:
Line 1: "Hi [resume client's first name]!"
Body (3-5 sentences): Explain which three traits you selected and WHY each one aligns with this specific job's top requirements — address the client directly (e.g. "I chose Strategic SaaS Sales as your lead trait because the role calls for..."). Include 1-2 sentences of specific, positive observations about their background and how well it positions them for this role. Close the body with an encouraging, upbeat statement about their prospects.
Signature (on its own lines, exactly as written):
Wishing you all the best,
Glo
Title for this section: centered, 11pt bold Arial: Final Notes / Rationale
Ensure all content is drawn exclusively from Inputs 1 and 2, tailored to Input-3 requirements.

[FINAL OUTPUT]
New Resume: A fully formatted resume with the primary Professional Profile, adhering to all rules and best practices.
Additional Profiles:
Variation 1: A second version of the Professional Profile with a different tone.
Variation 2: A third version of the Professional Profile highlighting different skills or experiences.
Final Notes / Rationale: A warm, personal note directly to the client beginning with "Hi [Client]!", containing 3-5 sentences explaining your trait selection rationale and encouraging them, ending cleanly with Glo's signature (exactly as specified in the Final Notes section).
Ensure the resume, profiles, and final notes are ATS-friendly, visually clean, and tailored to the target job description.
Output ONLY clean plain text. Do not use HTML tags or markdown. As explained in the FORMATTING INSTRUCTION CLARIFICATION section, all formatting directives (like font sizes, alignments, and bolding) represent structural guidelines for our downstream parsing engine, so do not print literal markdown (no **, __, *, _, or #) or HTML tags. Structure your plain text output exactly as follows: section headers on their own lines, bullets starting with '•', company name and location separated by two spaces, job title and date range on the same line separated by two spaces.
END PROMPT
[END OUPTPUT CONTROL]`;
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
