import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priceId, email, firstName, planType } = body;

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      customer_email: email || undefined,
      // planType tells the webhook how many months to grant (6_month or 12_month)
      metadata: {
        plan_type: planType || '6_month',
        first_name: firstName || '',
      },
      // After payment, send to the welcome + upsell page
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gap-analysis/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      // Disable Stripe Link (the green "Pay with Link" button)
      payment_method_options: {
        link: { display_preference: { preference: 'off' } },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
