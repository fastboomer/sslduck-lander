/**
 * prompt-template.ts
 *
 * This is the core IP of the tool — the expert prompt that gets assembled
 * and copied to the user's clipboard for pasting into their LLM of choice.
 *
 * TO CUSTOMIZE: Edit the sections below. The placeholders
 * {RESUME_TEXT}, {JOB_DESCRIPTION}, and {ADDITIONAL_COMMENTS} are
 * replaced automatically at runtime with the user's inputs.
 *
 * STRUCTURE:
 *   1. Expert persona / framing
 *   2. User inputs (resume, job desc, comments)
 *   3. Ordered analysis tasks
 */

export interface PromptInputs {
  resumeText: string;
  jobDescription: string;
  additionalComments?: string;
}

export function buildPrompt({ resumeText, jobDescription, additionalComments }: PromptInputs): string {
  const commentsBlock = additionalComments?.trim()
    ? `\n\n=== ADDITIONAL CONTEXT FROM CANDIDATE ===\n${additionalComments.trim()}`
    : '';

  return `You are an elite professional resume writer and career strategist with 20+ years of experience in executive recruitment and talent acquisition across multiple industries. You have reviewed tens of thousands of resumes and have a precise eye for what hiring managers, recruiters, and Applicant Tracking Systems look for.

Your task is to perform a comprehensive Gap Analysis between the candidate's resume and the target job description below. Be direct, specific, and actionable. Reference actual language from both documents — do not be generic.

=== CANDIDATE RESUME ===
${resumeText.trim()}

=== TARGET JOB DESCRIPTION ===
${jobDescription.trim()}${commentsBlock}

=== YOUR ANALYSIS ===

Please provide the following in order:

**1. EXECUTIVE SUMMARY**
In 2–3 sentences, give an honest overall assessment of this candidate's fit for the role. Be candid — the candidate needs the truth, not flattery.

**2. STRENGTHS TO KEEP & AMPLIFY**
List what the candidate already has that directly aligns with this role's requirements. Cite specific evidence from the resume and tie it to specific requirements from the job description.

**3. CRITICAL GAPS** (ranked by importance to the hiring decision)
Identify skills, qualifications, experience, or credentials the job requires that are missing or underrepresented in the resume. For each gap, note whether it is a dealbreaker or something that can be addressed through positioning.

**4. ATS KEYWORD GAPS**
List the exact keywords, phrases, and job titles from the job description that do not appear in the resume. These are the terms an Applicant Tracking System will scan for before a human ever reads the resume.

**5. IMMEDIATE RESUME IMPROVEMENTS**
Provide specific, copy-ready rewrites of existing bullet points OR new bullet points to add. Draw only from the candidate's actual experience — do not fabricate accomplishments. Where possible, reframe existing experience using the job description's language.

**6. POSITIONING STRATEGY**
Describe the narrative that should connect this candidate's background to this specific role. What is the strongest angle? How should the summary/objective section be rewritten?

**7. COVER LETTER PRIORITIES**
Identify the 2–3 most important themes the cover letter must address to bridge the most critical gaps and make the strongest possible case for this candidate.

Be specific throughout. A vague answer is a useless answer.`;
}

/**
 * Returns a rough character/word count estimate for the assembled prompt.
 * Helpful for letting the user know the prompt size before pasting into an LLM.
 */
export function estimatePromptStats(prompt: string): { chars: number; words: number; approxTokens: number } {
  const chars = prompt.length;
  const words = prompt.trim().split(/\s+/).length;
  const approxTokens = Math.round(chars / 4); // rough 4-chars-per-token estimate
  return { chars, words, approxTokens };
}
