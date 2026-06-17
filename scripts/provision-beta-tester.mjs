/**
 * provision-beta-tester.mjs
 * Usage: node scripts/provision-beta-tester.mjs <tester-email>
 *
 * Direct provision of a beta tester with exactly 4 weeks (28 days) of access.
 * Generates an onboarding activation link that you can send them.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Setup paths & environment ───────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read email from CLI argument
const testerEmail = process.argv[2]?.trim().toLowerCase();

if (!testerEmail) {
  console.error('\x1b[31m❌ Error: Please provide an email address.\x1b[0m');
  console.log('\nUsage: \x1b[36mnode scripts/provision-beta-tester.mjs <email>\x1b[0m');
  console.log('Example: \x1b[32mnode scripts/provision-beta-tester.mjs hello@example.com\x1b[0m\n');
  process.exit(1);
}

// Basic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testerEmail)) {
  console.error(`\x1b[31m❌ Error: "${testerEmail}" is not a valid email address.\x1b[0m\n`);
  process.exit(1);
}

// ─── Initialize Firebase Admin ───────────────────────────────────────
let adminAuth;
let adminDb;

try {
  // Load credentials dynamically from local service account JSON
  const serviceAccountPath = join(__dirname, '../Member Control/fasth-lander-2026-v2-firebase-adminsdk-fbsvc-fcfeb6484c.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  const app = initializeApp({
    credential: cert(serviceAccount)
  });
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
} catch (err) {
  console.error('\x1b[31m❌ Error: Failed to initialize Firebase Admin SDK.\x1b[0m');
  console.error('Make sure the JSON credential file is located inside "Member Control/" folder.\n', err);
  process.exit(1);
}

async function provisionTester() {
  console.log(`\n\x1b[35m🚀 Provisioning Beta Tester: ${testerEmail}...\x1b[0m`);

  let uid;
  let isNewUser = false;

  // 1. Create or retrieve the Firebase Auth Account
  try {
    const existingUser = await adminAuth.getUserByEmail(testerEmail);
    uid = existingUser.uid;
    console.log(`\x1b[32m✓ Auth account already exists (UID: ${uid})\x1b[0m`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const newUser = await adminAuth.createUser({
        email: testerEmail,
        emailVerified: true, // Auto-verify to bypass verification checks
      });
      uid = newUser.uid;
      isNewUser = true;
      console.log(`\x1b[32m✓ New Auth account successfully created (UID: ${uid})\x1b[0m`);
    } else {
      throw err;
    }
  }

  // 2. Calculate Expiration (Exactly 4 Weeks / 28 Days from now)
  const now = new Date();
  const FOUR_WEEKS_IN_MS = 28 * 24 * 60 * 60 * 1000;
  const expiryDate = new Date(now.getTime() + FOUR_WEEKS_IN_MS);

  // 3. Write User Access Document to Firestore
  await adminDb.collection('user_access').doc(uid).set({
    email: testerEmail,
    uid,
    plan_type: '6_month', // Matches 6-month product capabilities
    is_active: true,
    purchase_date: Timestamp.fromDate(now),
    expiration_date: Timestamp.fromDate(expiryDate),
    stripe_session_id: 'beta_manual_provision_4w',
    provisioned_by: 'beta_onboarding_script',
    last_updated: Timestamp.fromDate(now)
  }, { merge: true });

  console.log(`\x1b[32m✓ Firestore user_access document configured.\x1b[0m`);
  console.log(`   Plan:         6-Month Offering (Beta Mode)`);
  console.log(`   Active Limit: 4 Weeks`);
  console.log(`   Expires On:   \x1b[33m${expiryDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\x1b[0m`);

  // 4. Generate Activation / Password Reset Link
  // Configured to point directly to your main app success page post-activation
  const activationLink = await adminAuth.generatePasswordResetLink(testerEmail, {
    url: 'https://sslduck-lander.vercel.app/welcome-and-offer'
  });

  console.log(`\n\x1b[32m✅ PROVISIONING COMPLETE!\x1b[0m`);
  console.log(`─────────────────────────────────────────────────────────────────────────────`);
  console.log(`\x1b[1m\x1b[35mOnboarding Link (Send this directly to the tester):\x1b[0m`);
  console.log(`\x1b[36m${activationLink}\x1b[0m`);
  console.log(`─────────────────────────────────────────────────────────────────────────────`);
  
  // Custom suggestion message for manual sending
  console.log(`\n\x1b[1m\x1b[32mCopy-Paste Invite Template:\x1b[0m`);
  console.log(`---------------------------------------------------------`);
  console.log(`Hi! Your exclusive beta access to SSLDUCK is ready.`);
  console.log(`We've set up your account with full access to the 6-month tools for the next 4 weeks.`);
  console.log(`\nClick the link below to set your password and access the dashboard:`);
  console.log(`${activationLink}`);
  console.log(`\nLet me know if you run into any questions—excited to get your feedback!`);
  console.log(`---------------------------------------------------------\n`);

  process.exit(0);
}

provisionTester().catch((err) => {
  console.error('\x1b[31m❌ Critical Failure during provisioning:\x1b[0m', err);
  process.exit(1);
});
