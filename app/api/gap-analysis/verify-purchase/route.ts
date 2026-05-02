import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    // ── Step 1: Verify payment with Stripe ──────────────────────────
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    const email = stripeSession.customer_email || stripeSession.customer_details?.email;

    if (!email) {
      return NextResponse.json({ error: 'No email found in Stripe session' }, { status: 400 });
    }

    const planType = (stripeSession.metadata?.plan_type as string) || '6_month';
    const firstName = (stripeSession.metadata?.first_name as string) || '';

    // ── Step 2: Find or create Firebase Auth user ───────────────────
    // The webhook may not have fired yet — handle gracefully
    let uid: string;
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      uid = existingUser.uid;
      console.log(`✅ verify-purchase: found existing user ${uid}`);
    } catch {
      const newUser = await adminAuth.createUser({ email, emailVerified: false });
      uid = newUser.uid;
      console.log(`✅ verify-purchase: created new user ${uid}`);
    }

    // ── Step 3: Ensure Firestore access doc exists ──────────────────
    // Webhook will also write this (idempotent — merge:true handles duplicates)
    const userAccessRef = adminDb.collection('user_access').doc(uid);
    const existingDoc = await userAccessRef.get();

    if (!existingDoc.exists) {
      const monthsToAdd = planType === '12_month' ? 12 : 6;
      const now = new Date();
      const expirationDate = new Date(now);
      expirationDate.setMonth(expirationDate.getMonth() + monthsToAdd);

      await userAccessRef.set({
        email,
        uid,
        purchase_date: Timestamp.now(),
        expiration_date: Timestamp.fromDate(expirationDate),
        plan_type: planType,
        is_active: true,
        stripe_session_id: sessionId,
        last_updated: Timestamp.now(),
      });
      console.log(`📄 verify-purchase: wrote preliminary access doc for ${uid}`);
    }

    // ── Step 4: Generate Firebase custom token ──────────────────────
    const customToken = await adminAuth.createCustomToken(uid);
    console.log(`🎟️  verify-purchase: issued custom token for ${uid}`);

    return NextResponse.json({ customToken, email, firstName, planType });
  } catch (err: any) {
    console.error('❌ verify-purchase error:', err);
    return NextResponse.json({ error: 'Verification failed', detail: err.message }, { status: 500 });
  }
}
