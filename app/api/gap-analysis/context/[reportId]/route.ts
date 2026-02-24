import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
        if (!db) {
            throw new Error('Database not initialized');
        }

        const docRef = doc(db, 'gap-reports', reportId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
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

        // Return only the context Glo needs to keep the payload tight
        return NextResponse.json({
            candidateName: data.candidateName || 'Candidate',
            resumeText: data.resumeText || '',
            jobDescription: data.jobDescription || '',
            analysis: data.analysis || '',
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
