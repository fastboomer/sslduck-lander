import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
    const { resumeText, jobDescription } = await req.json();

    const result = streamText({
        model: google('gemini-1.5-flash'),
        system: "You are the Lead Career Strategist at SSLDUCK.COM. Provide a Match Score, 3-5 Critical Gaps, 3 Quick Fixes, and an ATS Reality Check. Sign off as Member Blue Ridge Technology Family.",
        prompt: `Analyze the following resume and target job description/link:
    
    Resume:
    ${resumeText}
    
    Job Description:
    ${jobDescription}
    `,
    });

    return result.toTextStreamResponse();
}
