import { NextRequest, NextResponse } from 'next/server';
console.log("[GAP_ROUTE] Module Loaded");
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Claude Sonnet analysis ~15-40s + file extraction buffer
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { db } from '@/app/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { extractTextFromFile, createGapDoc } from '@/lib/gap-utils';
import { sendGapReport } from '@/app/lib/mail';
import fs from 'fs';
import path from 'path';

import os from 'os';

export async function POST(req: NextRequest) {
    console.log(`[${new Date().toISOString()}] Request received`);
    console.log("[GAP_PROCESS] Request received.");

    try {
        // 0. Setup Provider (Inside try to catch config errors)
        const rawKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || '';
        const googleAI = createGoogleGenerativeAI({
            apiKey: rawKey.trim(),
        });

        const formData = await req.formData();
        const resumes = formData.getAll('resumes') as File[];
        const reqFiles = formData.getAll('reqFiles') as File[];
        const reqUrl = formData.get('reqUrl') as string;
        const reqText = formData.get('reqText') as string;
        const contactEmail = formData.get('contactEmail') as string;
        const resumeText = formData.get('resumeText') as string || '';

        if (resumes.length === 0 && !resumeText.trim()) throw new Error("No resume provided (Upload or Paste required).");

        // 1. Extract Text
        console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Extracting text from files...`);
        let combinedResumeText = '';
        try {
            for (const file of resumes) {
                const text = await extractTextFromFile(file);
                combinedResumeText += text + '\n\n';
            }
        } catch (extractErr: any) {
            console.error("Extraction failed:", extractErr);
            throw new Error(`Text extraction failed: ${extractErr.message}`);
        }

        if (resumeText.trim()) {
            combinedResumeText += resumeText + '\n\n';
        }

        let combinedReqText = reqText || '';
        for (const file of reqFiles) {
            const text = await extractTextFromFile(file);
            combinedReqText += text + '\n\n';
        }

        if (!combinedResumeText.trim()) throw new Error("Resume content is empty.");
        if (!combinedReqText.trim() && !reqUrl) throw new Error("Requirement content is empty.");

        // 2. Extract Clean Job Title and Employer Name
        console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Extracting job title and employer from requirements with Gemini Flash...`);
        let targetJobTitle = "Career Opportunity";
        let targetCompany = "Target Employer";
        try {
            const { text: jobExtract } = await generateText({
                model: googleAI('gemini-2.5-flash'),
                prompt: `Read this job description and extract ONLY two things. Return ONLY a valid JSON object with exactly two keys:\n- "job_title": the exact job title (short, e.g. "Medical Science Liaison")\n- "employer": the employer/company name (short, e.g. "Vor Biopharma"). If the employer is not mentioned, use "Target Employer".\n\nDo NOT include any conversational filler, markdown, or greetings. Output ONLY JSON.\n\n${combinedReqText.substring(0, 1500)}`,
            });
            console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Gemini Flash returned Job Title Payload.`);
            const jsonMatch = jobExtract.match(/\{[\s\S]*\}/);
            const rawJsonText = jsonMatch ? jsonMatch[0] : jobExtract.replace(/```json/g, '').replace(/```/g, '');
            const jobData = JSON.parse(rawJsonText.trim());
            if (jobData.job_title) targetJobTitle = jobData.job_title.trim();
            if (jobData.employer) targetCompany = jobData.employer.trim();
        } catch (err) {
            console.error(`[GAP_PROCESS] [${new Date().toISOString()}] Job extraction failed, using defaults:`, err);
        }


        // 3. Extract Candidate Name and Email (Best Effort) FIRST
        console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Extracting candidate info with Gemini Flash...`);
        let candidateName = "Candidate";
        let extractedEmail = contactEmail;
        let extractedPhone = '';
        let extractedContactInfo = '';
        try {
            const { text: extraction } = await generateText({
                model: googleAI('gemini-2.5-flash'),
                prompt: `Analyze this resume text and extract the candidate's exact full name (First and Last name ONLY, exclude any location, city, state, or titles), email address, phone number, and city/state. Return ONLY a valid JSON object with exactly these keys: "name", "email", "phone", and "contact_info". If missing, leave empty strings. Do NOT include any conversational filler, greetings, or markdown tags.\n\n${combinedResumeText.substring(0, 1500)}`,
            });
            console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Gemini Flash returned Candidate Payload.`);
            const jsonMatch = extraction.match(/\{[\s\S]*\}/);
            const rawJsonText = jsonMatch ? jsonMatch[0] : extraction.replace(/```json/g, '').replace(/```/g, '');
            const extracted = JSON.parse(rawJsonText.trim());
            if (extracted.name) candidateName = extracted.name.replace(/([A-Za-z\-]+)\s+([A-Za-z\-]+)\s+.*$/g, '$1 $2').trim();
            if (!extractedEmail && extracted.email) {
                const matched = extracted.email.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (matched) extractedEmail = matched[0];
            }
            if (extracted.phone) extractedPhone = extracted.phone.trim();
            if (extracted.contact_info) extractedContactInfo = extracted.contact_info.trim();
        } catch (err) {
            console.error(`[GAP_PROCESS] [${new Date().toISOString()}] Name/Email extraction failed:`, err);
            // Fallback heuristic: Try to grab the first substantive line of the resume as the name if AI failed
            try {
                const lines = combinedResumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length > 0 && candidateName === "Candidate") {
                    let possibleName = lines[0].substring(0, 40).replace(/resume|cv|curriculum vitae/i, '').trim();
                    // Clean up fallback hallucination
                    possibleName = possibleName.split(',')[0].split('|')[0].trim();
                     if (possibleName.length > 2 && !possibleName.includes('@')) {
                        candidateName = possibleName;
                    }
                }
            } catch (fallbackErr) {
                console.error("Fallback name extraction failed:", fallbackErr);
            }
        }
        
        const firstName = candidateName.split(' ')[0] || "Candidate";
        const lastName = candidateName.split(' ').slice(1).join(' ') || "";

        // 4. Load Prompt Templates
        console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Loading prompt templates...`);
        const promptPath = path.join(process.cwd(), 'AI-BRIEFS', 'suitability-prompt', '1-SUITABILITY-STUDY-PROMPT-SSLDUCKNET.md');
        const examplePath = path.join(process.cwd(), 'AI-BRIEFS', 'report-prompts', 'gap-report-example.md');

        if (!fs.existsSync(promptPath)) throw new Error("Prompt template missing.");
        let promptTemplate = fs.readFileSync(promptPath, 'utf8');
        let exampleTemplate = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';

        // 5. Prepare Final Prompt
        const finalPromptBase = promptTemplate
            .replace(/\{\{\s*first\\?_name\s*\}\}/g, firstName)
            .replace(/\{\{\s*last\\?_name\s*\}\}/g, lastName)
            .replace(/\{\{\s*contact\\?_info\s*\}\}/g, extractedContactInfo || "City, State Not Provided")
            .replace(/\{\{\s*email\s*\}\}/g, extractedEmail || "Email Not Provided")
            .replace(/\{\{\s*phone\\?_number\s*\}\}/g, extractedPhone || "Phone Not Found")
            .replace(/\[\s*first\\?_name\s*\]/g, firstName) // In case old variables still exist
            .replace(/\{\{\s*job\\?_title\s*\}\}/g, targetJobTitle)
            .replace(/\[\s*job\\?_title\s*\]/g, targetJobTitle)
            .replace(/\{\{\s*employer\s*\}\}/g, targetCompany)
            .replace(/\[\s*target\\?_company\s*\]/g, targetCompany)
            .replace(/<example>[\s\S]*?<\/example>/gi, `<example>\n${exampleTemplate}\n</example>`);

        // Safely enforce tags at the very bottom since they may have failed to replace if malformed
        const finalPrompt = finalPromptBase + `\n\n<job-description>\n${combinedReqText}\n</job-description>\n\n<requirements>\n${combinedReqText}\n</requirements>\n\n<resume>\n${combinedResumeText}\n</resume>`;

        // 6. Execute AI — Claude Sonnet handles the full analysis (original setup)
        // Gemini Flash handles the lightweight extraction calls above (job title, candidate name)
        console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Executing GAP Analysis with Claude Sonnet...`);
        let analysis = '';

        try {
            let usedFallback = false;

            try {
                console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Trying Claude Sonnet (60s timeout)...`);
                const { text } = await generateText({
                    model: anthropic('claude-sonnet-4-5'),
                    prompt: finalPrompt,
                    maxOutputTokens: 4096,
                    maxRetries: 0,
                    abortSignal: AbortSignal.timeout(60000), // Hard cap: abort if Claude hangs past 60s
                });
                analysis = text;
                console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Claude Sonnet completed successfully.`);
            } catch (claudeErr: any) {
                console.warn(`[GAP_PROCESS] Claude Sonnet failed (${claudeErr.name}: ${claudeErr.message}). Falling back to Gemini Flash...`);
                usedFallback = true;
            }

            // Gemini 2.5 Flash fallback — ~10-20s, already configured, no rate limit issues
            if (usedFallback || !analysis.trim()) {
                console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Running Gemini 2.5 Flash fallback...`);
                const { text: flashText } = await generateText({
                    model: googleAI('gemini-2.5-flash'),
                    prompt: finalPrompt,
                    maxOutputTokens: 4096,
                    maxRetries: 0,
                });
                analysis = flashText;
                console.log(`[GAP_PROCESS] [${new Date().toISOString()}] Gemini Flash fallback completed.`);
            }

        } catch (error: any) {
            console.error(`[GAP_PROCESS] [${new Date().toISOString()}] All AI providers failed:`, error);
            const detailedError = error.cause ? error.cause.message || error.cause : JSON.stringify(error, Object.getOwnPropertyNames(error));
            throw new Error(`AI Analysis failed: ${detailedError}`);
        }

        if (!analysis.trim()) throw new Error("AI generated an empty analysis.");

        // 7. Save to Firestore (Audit Log)
        console.log("[GAP_PROCESS] Saving to Firestore...");
        const reportId = `gap-${Date.now()}`;
        if (db) {
            try {
                await setDoc(doc(db, 'gap-reports', reportId), {
                    reportId,
                    candidateName,
                    jobLink: `${targetJobTitle} at ${targetCompany}`,
                    analysis,
                    resumeText: combinedResumeText,
                    jobDescription: combinedReqText,
                    createdAt: new Date().toISOString(),
                    status: 'completed'
                });
                console.log("[GAP_PROCESS] Saved to Firestore successfully. ID:", reportId);
            } catch (fsErr: any) {
                console.error("Firestore Save Error:", fsErr);
                throw new Error(`Failed to save report to database: ${fsErr.message}`);
            }
        } else {
            throw new Error("Database connection unavailable.");
        }

        // 8. Send to Webhook (Internal GAP Dispatch)
        const payload = {
            name: candidateName,
            jobLink: `${targetJobTitle} at ${targetCompany}`,
            styledReport: analysis
        };
        // [MODIFIED]: We are completely disabling the Google Apps Script Webhook 
        // because it ignores all styling and target emails. We are now using Resend exclusively.
        console.log("[GAP_PROCESS] Webhook dispatch is disabled. Sending emails via Resend exclusively.");
        /*
        console.log("[GAP_PROCESS] Dispatching to Webhook. Payload size:", JSON.stringify(payload).length);
        const webhookUrl = 'https://script.google.com/macros/s/AKfycbztlk4VOMWB8A6Wh_IUobjZ5dho_KYp-EgtLTE-mWogE26FNjmKzM8C1vxqpHqcMvLb/exec';

        try {
            const webhookResponse = await fetch(webhookUrl, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(30000) // 30s timeout
            });

            if (!webhookResponse.ok) {
                const errorText = await webhookResponse.text();
                console.error("Webhook Error Status:", webhookResponse.status, errorText);
            } else {
                console.log("[GAP_PROCESS] Webhook dispatch successful.");
            }
        } catch (webhookErr: any) {
            console.error("Failed to send to webhook:", webhookErr.message);
        }
        */

        // 9. Return success — user proceeds to audio page immediately
        // after() is Next.js 15+ post-response hook: Vercel keeps the function warm
        // until the background promise resolves (unlike Promise.resolve().then which can be killed)
        const reportResponse = NextResponse.json({
            success: true,
            reportId: reportId,
            candidateName,
            message: "Report processed and dispatched."
        });

        // after() caused 504 on Vercel by holding the response open past maxDuration.
        // Promise.resolve().then() schedules work as a microtask AFTER return fires,
        // so the HTTP response is sent immediately while doc/email run in the background.
        Promise.resolve().then(async () => {
            try {
                console.log("[GAP_PROCESS] [BG] Generating Word document...");
                const docBuffer = await createGapDoc(analysis, targetCompany);

                const safeName = candidateName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                const timestamp = Date.now().toString().slice(-6);
                const filename = `gap-${safeName || 'report'}-${timestamp}`;

                const gapUsersDir = path.join(os.tmpdir(), 'GAP-USERS');
                if (!fs.existsSync(gapUsersDir)) fs.mkdirSync(gapUsersDir, { recursive: true });

                fs.writeFileSync(path.join(gapUsersDir, `${filename}.docx`), docBuffer);
                fs.writeFileSync(path.join(os.tmpdir(), 'GAP-USERS', `${filename}.md`), analysis);
                console.log("[GAP_PROCESS] [BG] Word doc saved:", filename);

                const targetEmail = (extractedEmail && extractedEmail.trim().includes('@')) ? extractedEmail.trim() : 'glenn@sslduck.net';
                const bccEmail = 'glenn@sslduck.net';
                const bccParams = targetEmail.toLowerCase() === bccEmail.toLowerCase() ? undefined : bccEmail;

                console.log("[GAP_PROCESS] [BG] Emailing report to:", targetEmail);
                await sendGapReport(targetEmail, candidateName, analysis, filename, bccParams);
                console.log("[GAP_PROCESS] [BG] Email sent successfully.");
            } catch (bgErr: any) {
                console.error("[GAP_PROCESS] [BG] Background doc/email failed:", bgErr.message);
            }
        });

        console.log("[GAP_PROCESS] Returning success. Doc/email running via after().");
        return reportResponse;

    } catch (error: any) {
        console.error(`[${new Date().toISOString()}] CRITICAL ERROR: ${error.message}\n${error.stack}\n`);
        console.error("[GAP_PROCESS] CRITICAL ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "An unexpected error occurred during processing.",
                details: error.toString()
            },
            { status: 500 }
        );
    }
}
