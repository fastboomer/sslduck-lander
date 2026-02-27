import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
        return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    try {
        // Fetch context from our existing internal API or logic
        // In a real app, you'd query the DB here. We'll use the relative URL logic or a direct query if possible.
        // For now, we'll simulate the personalization logic since the consumer will fetch the context anyway.

        // This route is intended to eventually generate high-quality neural TTS.
        // For the MVP, it returns the structured text for the "Pre-talk" strategy.

        return NextResponse.json({
            introText: "Hi there, it's Simone! I've forwarded your resume to Glenn and he will be in touch soon. I also have Glo on the line with some comments regarding your interesting profile I can share with you right now, if you would like to talk. Just hit the 'Talk to Glo' button.",
            captionDuration: 6000 // ms
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
