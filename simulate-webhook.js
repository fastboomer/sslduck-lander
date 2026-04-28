const Stripe = require('stripe');
const stripe = new Stripe('sk_test_123'); // Fake key just to use the library functions

// Note: Ensure your local server is running on port 3000!
const WEBHOOK_URL = 'https://sslduck-lander.vercel.app/api/webhooks/stripe';

// Read the Webhook secret from .env.local
const fs = require('fs');
let WEBHOOK_SECRET = '';
try {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/STRIPE_WEBHOOK_SECRET=(.*)/);
  if (match) {
    WEBHOOK_SECRET = match[1].replace(/\r$/, '').replace(/^"(.*)"$/, '$1');
  }
} catch (e) {
  console.log("Could not read .env.local");
}

if (!WEBHOOK_SECRET) {
  console.error("❌ ERROR: STRIPE_WEBHOOK_SECRET not found in .env.local!");
  process.exit(1);
}

// 1. Create a dummy Stripe Checkout Session Completed event
const dummyPayload = {
  id: 'evt_test_12345',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_dummy_session',
      object: 'checkout.session',
      customer_email: 'oceantrader1964+test@gmail.com', // 👈 Test email — delivers to your main Gmail inbox
      metadata: {
        plan_type: '6_month',
        first_name: 'Test'
      }
    }
  }
};

const payloadString = JSON.stringify(dummyPayload);

// 2. Generate a valid Stripe signature header for this payload
const signature = stripe.webhooks.generateTestHeaderString({
  payload: payloadString,
  secret: WEBHOOK_SECRET,
});

console.log(`🚀 Sending mock webhook event to ${WEBHOOK_URL}...`);

// 3. POST the signed event to your Localhost
fetch(WEBHOOK_URL, {
  method: 'POST',
  body: payloadString,
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': signature
  }
})
.then(async (res) => {
  const text = await res.text();
  if (res.ok) {
    console.log(`✅ Webhook returned SUCCESS (Status ${res.status}):\n${text}`);
    console.log(`\nCheck your terminal where 'npm run dev' is running for the backend logs!`);
    console.log(`If everything worked, a Firebase User was created, Firestore was written, and an email was sent to testuser@example.com!`);
  } else {
    console.error(`❌ Webhook returned ERROR (Status ${res.status}):\n${text}`);
  }
})
.catch((err) => {
  console.error("❌ Failed to reach localhost:3000. Is 'npm run dev' running?", err);
});
