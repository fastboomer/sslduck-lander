import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';


/** POST /api/auth/session
 *  Exchanges a Firebase ID token for an httpOnly session cookie.
 *  Called by the login page after the user signs in client-side.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Verify the ID token first to ensure it's valid
    await adminAuth.verifyIdToken(idToken);

    // Create a session cookie valid for 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ success: true });
    response.cookies.set('firebase-session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Session creation error:', err.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/** DELETE /api/auth/session
 *  Clears the session cookie on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('firebase-session', '', {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
