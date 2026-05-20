import { NextRequest, NextResponse } from 'next/server';

/**
 * SSLDUCK Fulfillment Proxy — The Gatekeeper
 *
 * Runs before every /fulfillment/* request.
 * Checks for a valid session cookie. If missing → redirect to /login.
 * Full auth verification (including Firestore expiry) happens in WithAuth.tsx
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for a session cookie set by /api/auth/session
  const sessionCookie = req.cookies.get('firebase-session')?.value;

  if (!sessionCookie) {
    // No session — redirect to login, remembering where they were going
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie present — allow through (WithAuth does full expiry verification client-side)
  return NextResponse.next();
}

export const config = {
  // Protects /fulfillment and all sub-routes (e.g. /fulfillment/course-materials)
  matcher: ['/fulfillment', '/fulfillment/:path*'],
};
