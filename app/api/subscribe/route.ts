import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        // Backend validation
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
        }

        const trimmedEmail = email.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return NextResponse.json({ error: 'Invalid email address format.' }, { status: 400 });
        }

        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            console.error('Missing BREVO_API_KEY environment variable.');
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }

        const listIdStr = process.env.BREVO_LIST_ID || '2';
        const listId = parseInt(listIdStr, 10);
        if (isNaN(listId)) {
            console.error('Invalid BREVO_LIST_ID environment variable:', listIdStr);
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }

        // Brevo API Request
        const response = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: trimmedEmail,
                listIds: [listId],
                updateEnabled: true,
            }),
        });

        if (response.ok || response.status === 201 || response.status === 204) {
            return NextResponse.json({ success: true }, { status: 200 });
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Brevo API Error:', {
                status: response.status,
                data: errorData,
            });
            
            const message = errorData.message || 'Unable to complete subscription at this time.';
            return NextResponse.json({ error: message }, { status: response.status });
        }
    } catch (error) {
        console.error('Server error inside /api/subscribe:', error);
        return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
    }
}
