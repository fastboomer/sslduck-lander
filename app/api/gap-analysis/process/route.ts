import { NextRequest, NextResponse } from 'next/server';
export const dynamic = "force-dynamic";
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/app/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { extractTextFromFile } from '@/lib/gap-utils';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    console.log("[GAP_PROCESS] Request received.");
    try {
        const formData = await req.formData();
        const resumes = formData.getAll('resumes') as File[];
        const reqFiles = formData.getAll('reqFiles') as File[];
        const reqUrl = formData.get('reqUrl') as string;
        const reqText = formData.get('reqText') as string;

        if (resumes.length === 0) throw new Error("No resumes uploaded.");

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
                    model: google('gemini-2.0-flash-001'),
                    prompt: `Summarize this job description into one short sentence (e.g., 'Senior Dev Role at Acme Corp'):\n\n${combinedReqText.substring(0, 1000)}`,
                });
                jobLink = summary.trim();
            } catch (err) {
                console.error("Summary failed, using default:", err);
                jobLink = "Career Opportunity";
            }
        }

        // 3. Load Prompt Templates
        console.log("[GAP_PROCESS] Loading prompt templates...");
        const promptPath = path.join(process.cwd(), 'GAP-INSTRUCTIONS', 'gap-analysis-prompt.md');
        const examplePath = path.join(process.cwd(), 'GAP-INSTRUCTIONS', 'gap-example.md');

        if (!fs.existsSync(promptPath)) throw new Error("Prompt template missing.");
        let promptTemplate = fs.readFileSync(promptPath, 'utf8');
        let exampleTemplate = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';

        // 4. Prepare Final Prompt
        const finalPrompt = promptTemplate
            .replace(/<requirements>[\s\S]*?<\/requirements>/, `<requirements>\n${combinedReqText}\n</requirements>`)
            .replace(/<resume>[\s\S]*?<\/resume>/, `<resume>\n${combinedResumeText}\n</resume>`)
            .replace(/<example>[\s\S]*?<\/example>/, `<example>\n${exampleTemplate}\n</example>`);

        // 5. Execute AI (Pro with Flash fallback)
        console.log("[GAP_PROCESS] Executing GAP Analysis with Google Search Grounding...");
        let analysis = '';

        const tools: any = {
            search: google.tools.googleSearch({}),
        };

        try {
            const { text } = await generateText({
                model: google('gemini-1.5-pro-002'),
                tools,
                prompt: finalPrompt,
            });
            analysis = text;
        } catch (proErr: any) {
            console.error("Gemini 1.5 Pro failed, trying 2.0 Flash...", proErr.message);
            try {
                const { text } = await generateText({
                    model: google('gemini-2.0-flash-001'),
                    tools,
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
                model: google('gemini-2.0-flash-001'),
                prompt: `Extract the candidate's full name from this resume text. Return ONLY the name:\n\n${combinedResumeText.substring(0, 1000)}`,
            });
            candidateName = nameExtraction.trim() || "Candidate";
        } catch (err) {
            console.error("Name extraction failed:", err);
        }

        // 7. Save to Firestore (Audit Log)
        console.log("[GAP_PROCESS] Saving to Firestore...");
        if (db) {
            try {
                await addDoc(collection(db, 'gap-reports'), {
                    candidateName,
                    jobLink,
                    analysis,
                    createdAt: new Date().toISOString(),
                    status: 'completed'
                });
                console.log("[GAP_PROCESS] Saved to Firestore successfully.");
            } catch (fsErr) {
                console.error("Firestore Save Error:", fsErr);
            }
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

        console.log("[GAP_PROCESS] Entire process completed successfully.");
        return NextResponse.json({
            success: true,
            reportId: `gap-${Date.now()}`,
            candidateName,
            message: "Report processed and dispatched."
        });

    } catch (error: any) {
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
