import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_email || session.customer_details?.email;
    const planType = (session.metadata?.plan_type as string) || '6_month';
    const monthsToAdd = planType === '12_month' ? 12 : 6;

    if (!email) {
      console.error('❌ No email found in Stripe session');
      return NextResponse.json({ error: 'No email in session' }, { status: 400 });
    }

    try {
      // ── Step 1: Find or create the Firebase Auth user ──────────
      let uid: string;
      let isNewUser = false;

      try {
        const existingUser = await adminAuth.getUserByEmail(email);
        uid = existingUser.uid;
        console.log(`✅ Existing user found: ${uid}`);
      } catch {
        // User doesn't exist yet — create their account
        const newUser = await adminAuth.createUser({ email, emailVerified: false });
        uid = newUser.uid;
        isNewUser = true;
        console.log(`✅ New user created: ${uid}`);
      }

      // ── Step 2: Calculate expiration date (with stacking) ──────
      const userAccessRef = adminDb.collection('user_access').doc(uid);
      const existingDoc = await userAccessRef.get();
      const now = new Date();
      let newExpirationDate: Date;

      if (existingDoc.exists) {
        const existingExpiry = existingDoc.data()?.expiration_date?.toDate() as Date | undefined;
        // Stack on top of existing expiry if it's still in the future
        const baseDate = existingExpiry && existingExpiry > now ? existingExpiry : now;
        newExpirationDate = new Date(baseDate);
        newExpirationDate.setMonth(newExpirationDate.getMonth() + monthsToAdd);
        console.log(`📅 Stacking from ${baseDate.toISOString()} → ${newExpirationDate.toISOString()}`);
      } else {
        newExpirationDate = new Date(now);
        newExpirationDate.setMonth(newExpirationDate.getMonth() + monthsToAdd);
        console.log(`📅 New expiry: ${newExpirationDate.toISOString()}`);
      }

      // ── Step 3: Write access document to Firestore ─────────────
      await userAccessRef.set({
        email,
        uid,
        purchase_date: Timestamp.now(),
        expiration_date: Timestamp.fromDate(newExpirationDate),
        plan_type: planType,
        is_active: true,
        stripe_session_id: session.id,
        last_updated: Timestamp.now(),
      }, { merge: true });

      // ── Step 4: Send welcome email for new users ────────────────
      if (isNewUser) {
        const passwordResetLink = await adminAuth.generatePasswordResetLink(email, {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/welcome-and-offer`,
        });
        await sendWelcomeEmail(email, passwordResetLink, monthsToAdd);
        console.log(`📧 Welcome email sent to ${email}`);
      } else {
        // Returning customer — send a renewal confirmation
        await sendRenewalEmail(email, monthsToAdd, newExpirationDate);
        console.log(`📧 Renewal confirmation sent to ${email}`);
      }

      console.log(`🎉 Access granted for ${email} until ${newExpirationDate.toDateString()}`);
    } catch (err: any) {
      console.error('❌ Error processing checkout webhook:', err);
      return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

// ── Email templates ─────────────────────────────────────────────

async function sendWelcomeEmail(email: string, resetLink: string, months: number) {
  await resend.emails.send({
    from: 'SSLDUCK <members@sslduck.net>',
    to: email,
    subject: `🎉 Your ${months}-Month SSLDUCK Access is Ready — Set Your Password`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0f; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #a78bfa; font-size: 28px; margin: 0;">Welcome to SSLDUCK!</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Your ${months}-month membership is being activated.</p>
        </div>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Thank you for your purchase. Click the button below to set your password and get immediate access to your member content.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Set My Password &amp; Access Content →
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px; text-align: center;">
          This link expires in 24 hours. If you did not make this purchase, please ignore this email.
        </p>
      </div>
    `,
  });
}

async function sendRenewalEmail(email: string, months: number, newExpiry: Date) {
  const expiryStr = newExpiry.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  await resend.emails.send({
    from: 'SSLDUCK <members@sslduck.net>',
    to: email,
    subject: `✅ SSLDUCK Membership Extended — Access Until ${expiryStr}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0f; color: #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #a78bfa; font-size: 28px; margin: 0;">Membership Extended!</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Your access has been extended by ${months} months.</p>
        </div>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Your SSLDUCK membership has been extended. Your new access expiry date is:
        </p>
        <div style="background: #1e1b4b; border: 1px solid #4c1d95; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="color: #a78bfa; font-size: 22px; font-weight: 700;">${expiryStr}</span>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Access My Content →
          </a>
        </div>
      </div>
    `,
  });
}
