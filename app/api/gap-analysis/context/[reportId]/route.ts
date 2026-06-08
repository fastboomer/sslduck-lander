import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ reportId: string }> }
) {
    const { reportId } = await context.params;

    if (!reportId) {
        return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    try {
        const docSnap = await adminDb.collection('gap-reports').doc(reportId).get();

        if (!docSnap.exists) {
            console.warn(`[GAP_CONTEXT] Report ${reportId} not found in Firestore.`);
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        const data = docSnap.data();
        console.log(`[GAP_CONTEXT] Found data for ${reportId}:`, data.candidateName);

        // Load Dynamic Audio Prompts
        const promptsDir = path.join(process.cwd(), 'AI-BRIEFS', 'glo-audio-prompts');
        const loadPrompt = (filename: string) => {
            const filePath = path.join(promptsDir, filename);
            return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
        };

        const gloPersona = loadPrompt('glo-persona.md');
        const gloAudioInstructions = loadPrompt('glo-audio-discussion.md');
        const gloFacts = loadPrompt('glo-facts.md');

        // Return only the context Glo needs to keep the payload tight.
        // 'analysis' may still be the gloBrief seed if the full background analysis isn't done yet.
        return NextResponse.json({
            candidateName: data.candidateName || 'Candidate',
            email: data.email || '',
            resumeText: data.resumeText || '',
            jobDescription: data.jobDescription || '',
            analysis: data.analysis || data.gloBrief || '',
            jobLink: data.jobLink || '',
            gloPersona,
            gloAudioInstructions,
            gloFacts
        });

    } catch (error: any) {
        console.error('[GAP_CONTEXT] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
