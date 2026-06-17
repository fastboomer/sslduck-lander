import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const reportId = req.nextUrl.searchParams.get('reportId');
    if (!reportId) {
        return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    try {
        // 1. Verify reportId exists in Firestore to prevent unauthorized access
        if (adminDb) {
            const doc = await adminDb.collection('gap-reports').doc(reportId).get();
            if (!doc.exists) {
                return NextResponse.json({ error: 'Unauthorized report access' }, { status: 403 });
            }
        }

        // 2. Generate short-lived access token
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;

        if (clientEmail && privateKey && projectId) {
            const auth = new GoogleAuth({
                credentials: {
                    client_email: clientEmail,
                    private_key: privateKey.replace(/\\n/g, '\n'),
                    project_id: projectId,
                },
                scopes: ['https://www.googleapis.com/auth/generative-language'],
            });
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            return NextResponse.json({ accessToken: token.token });
        }

        // Fallback for local development if service account credentials are not present
        const fallbackKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
        if (fallbackKey && process.env.NODE_ENV === 'development') {
            return NextResponse.json({ accessToken: fallbackKey });
        }

        return NextResponse.json({ error: 'Service account credentials missing' }, { status: 500 });
    } catch (error: any) {
        console.error('Failed to generate session token:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
