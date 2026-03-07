import { NextRequest, NextResponse } from 'next/server';
console.log("[GAP_ROUTE] Module Loaded");
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max duration for Vercel Hobby tier is usually 60s (Pro is up to 300s)
import { createGoogleGenerativeAI } from '@ai-sdk/google';
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
        console.log("[GAP_PROCESS] Extracting text from files...");
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

        // 2. Get Job Title/Link for Payload
        console.log("[GAP_PROCESS] Summarizing job requirements...");
        let jobLink = reqUrl || '';
        if (!jobLink && combinedReqText) {
            try {
                const { text: summary } = await generateText({
                    model: googleAI('gemini-2.0-flash-001'),
                    prompt: `Summarize this job description into one short sentence (e.g., 'Senior Dev Role at Acme Corp'):\n\n${combinedReqText.substring(0, 1000)}`,
                });
                jobLink = summary.trim();
            } catch (err) {
                console.error("Summary failed, using default:", err);
                jobLink = "Career Opportunity";
            }
        }

        const targetCompany = jobLink.split(' at ')[1] || jobLink;
        const targetJobTitle = jobLink.split(' at ')[0] || jobLink;

        // 3. Load Prompt Templates
        console.log("[GAP_PROCESS] Loading prompt templates...");
        const promptPath = path.join(process.cwd(), 'AI-BRIEFS', 'report-prompts', 'gap-analysis-instructions.md');
        const examplePath = path.join(process.cwd(), 'AI-BRIEFS', 'report-prompts', 'gap-report-example.md');

        if (!fs.existsSync(promptPath)) throw new Error("Prompt template missing.");
        let promptTemplate = fs.readFileSync(promptPath, 'utf8');
        let exampleTemplate = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';

        // 4. Prepare Final Prompt
        const finalPrompt = promptTemplate
            .replace(/\[first_name\]/g, "Candidate") // Defaulting placeholder
            .replace(/\[job_title\]/g, targetJobTitle)
            .replace(/\[target_company\]/g, targetCompany)
            .replace(/<requirements>[\s\S]*?<\/requirements>/, `<requirements>\n${combinedReqText}\n</requirements>`)
            .replace(/<resume>[\s\S]*?<\/resume>/, `<resume>\n${combinedResumeText}\n</resume>`)
            .replace(/<example>[\s\S]*?<\/example>/, `<example>\n${exampleTemplate}\n</example>`);

        // 5. Execute AI (Pro with Flash fallback)
        console.log("[GAP_PROCESS] Executing GAP Analysis...");
        let analysis = '';

        try {
            const { text } = await generateText({
                model: googleAI('gemini-1.5-pro-002'),
                prompt: finalPrompt,
            });
            analysis = text;
        } catch (proErr: any) {
            console.error("Gemini 1.5 Pro failed, trying 2.0 Flash...", proErr.message);
            try {
                const { text } = await generateText({
                    model: googleAI('gemini-2.0-flash-001'),
                    prompt: finalPrompt,
                });
                analysis = text;
            } catch (flashErr: any) {
                console.error("Gemini 2.0 Flash also failed:", flashErr.message);
                throw new Error(`AI Analysis failed: ${flashErr.message}`);
            }
        }

        if (!analysis.trim()) throw new Error("AI generated an empty analysis.");

        // 6. Extract Candidate Name (Best Effort)
        console.log("[GAP_PROCESS] Extracting candidate name...");
        let candidateName = "Candidate";
        try {
            const { text: nameExtraction } = await generateText({
                model: googleAI('gemini-2.0-flash-001'),
                prompt: `Extract the candidate's full name from this resume text. Return ONLY the name:\n\n${combinedResumeText.substring(0, 1000)}`,
            });
            candidateName = nameExtraction.trim() || "Candidate";
        } catch (err) {
            console.error("Name extraction failed:", err);
        }

        // 7. Save to Firestore (Audit Log)
        console.log("[GAP_PROCESS] Saving to Firestore...");
        const reportId = `gap-${Date.now()}`;
        if (db) {
            try {
                await setDoc(doc(db, 'gap-reports', reportId), {
                    reportId,
                    candidateName,
                    jobLink,
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
            jobLink: jobLink,
            styledReport: analysis
        };
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

        // 9. Generate Word Document and Save to GAP-USERS
        console.log("[GAP_PROCESS] Generating Word document...");
        try {
            const docBuffer = await createGapDoc(analysis, targetCompany);

            // Generate Filename from candidateName
            const safeName = candidateName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const timestamp = Date.now().toString().slice(-6);
            const filename = `gap-${safeName || 'report'}-${timestamp}`;

            const gapUsersDir = path.join(os.tmpdir(), 'GAP-USERS');

            if (!fs.existsSync(gapUsersDir)) {
                console.log("[GAP_PROCESS] Creating GAP-USERS directory...");
                fs.mkdirSync(gapUsersDir, { recursive: true });
            }

            const filePath = path.join(gapUsersDir, `${filename}.docx`);

            fs.writeFileSync(filePath, docBuffer);
            console.log("[GAP_PROCESS] Saved Word report to:", filePath);

            // 9.1 Save AI-ready Markdown version
            const mdFilePath = path.join(os.tmpdir(), 'GAP-USERS', `${filename}.md`);
            fs.writeFileSync(mdFilePath, analysis);
            console.log("[GAP_PROCESS] Saved AI-ready Markdown to:", mdFilePath);

            // 10. Email to Glenn
            console.log("[GAP_PROCESS] Emailing report to Glenn...");
            await sendGapReport('glenn@sslduck.net', candidateName, analysis, filename);

            // Also email to user if they provided one
            if (contactEmail && contactEmail.includes('@')) {
                console.log("[GAP_PROCESS] Emailing copy to user:", contactEmail);
                await sendGapReport(contactEmail, candidateName, analysis, filename);
            }
        } catch (exportErr: any) {
            console.error("[GAP_PROCESS] Export/Email failed:", exportErr);
        }

        console.log("[GAP_PROCESS] Entire process completed successfully.");
        return NextResponse.json({
            success: true,
            reportId: reportId,
            candidateName,
            message: "Report processed and dispatched."
        });

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
