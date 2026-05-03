/**
 * create-test-user.mjs
 * Run once: node scripts/create-test-user.mjs
 * Creates a Firebase Auth user + Firestore user_access doc for testing.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: cert({
    projectId: 'fasth-lander-2026-v2',
    clientEmail: 'firebase-adminsdk-fbsvc@fasth-lander-2026-v2.iam.gserviceaccount.com',
    privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNRiGzBdSj6K8z\nUSpAoqq42AxOXot0NWHXHaUGKWON+8s448QelIgt2R0ixjWU0KR7Ma64KijBx41h\nQ/QkPjH2qO9QpMGxKjeXHLyq6z3dIoNj2d6NBNM/e+E8fnCoz14T2di9o8hz/2pg\nhKVoVEWNg7KFmZyKurRA3d7j7lhgyBF2kOQ/GtJcNCZzSzROECM/HxhdB0O68t4+\nrdKW7aAjxCCAhRldMZSwmrtxpYf+JVehshATdb/Yv6zOJUn8uYWXtlQl22LJaGXK\nSdaTS6HOxJU3w4sV9xVP6gc8mN4XQGXn2gh8AwRcxl90G4leBsduzs/S4sMyl9oz\nQLOKgWP9AgMBAAECggEACBCaJgKed5rJOLQW0QzzCynF1gBl7I4PsYLDJzT8vykm\nM1ko1+YQXEjG7xpSzu1264t9/f3+CvBQUC16IUBmTcwWVu3vhDU7PjnNTyPIkvBr\nsW0aZCJNOxXJZCCNmZGddHHfJO2TObzOYktj2kT7/z2Dh+Hgohyyv0etnaPmyf/l\nmDeYwid1kNLlUME3URMErTRjY4WF+kfXYMr2yBEcxZgOKigYOq7JetERd957vUFH\nkNTpY7OUzlbcZ4EOe/Rnob4rka+syP/aNAda6xwiXFmpfAbjFz/4UN0CogZjX/1o\nft3vFla/YE2hDp+5eXs4izLGk1HizdGxti2l1j7KKwKBgQDnY0XbDxM7s104/Zyr\npz0nzoGBjY2uTZM5H8SpsyUG0mthk0JYzmX8zFsINttNwwoZbad7ISlHqOZu/YDE\nYvkDLKPddMEkgETNSRICu2SxtfsjA13vcNqcqZ1kODKxH7PDzBlb70h5+KfUIePF\nHJlQb9iZEO+j1831vNDQseAMqwKBgQDjG8Zba100Kyet2LivO37xrJhLNSDIGmwf\nnT6bcIuV0UGSJf1MopQ7L2AZve9Vv2NX1/XhMYCIogU2WuU/fTH6BvBUiZLlpgU8\nFeJYQ07OPplO6C9HFn+GK9fMKJqZPDTgYv8zHAPT6Pc4KToo2iPOSBblqvySbxq8\n0l5R2NmB9wKBgQC8NFkLdtWUB65Zvp8CV8M8b5GTCMom7l5DZn2V8mq5g8ln0lly\n1l7KIoYgxk3WkD/UswY49p4W9WCJApUMJ9yXImYeqOq4f8R2nWqS4k1i5rxgnEp5\niXenWab1b2h7/WdAaPBvgM+YthH8T5xuJXbmoDKzPb1NrSiPKodGWIf+hQKBgCww\nq1f+fBQ6kW3yTX1LRlggDUIVBFvrSD6eiiAUthRgszGM0symldEuVrSrkHZO1zWw\nf9dhmnD7lagN562C3saXswu/+SVWOI6Ic5JZBmx7IbmI1Cow5n9k6IiBHhPS8zb2\nDFIVkWkaW4BCBV8NkwoAXPQzYRHdLIaxKEkkuK3hAoGBAMDT+dYObYIH0pEtlI3g\nVYKOzWmRpehdJIyw7InKbnD/28lllEn6HLbn6qfwhIir/2A7i7fj2tcGVFuzfGb5\nRu+muButPwZquKySrs7WJfpnQzzkfw7izlIZDuuxSuAQPProENLl5Nj7Us/R+wV5\nmf1i4GiOz7V0OuFF74DtVxR8\n-----END PRIVATE KEY-----\n`,
  }),
});

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

const TEST_EMAIL = 'arealresources@gmail.com';
const TEST_PASSWORD = 'Test1111';
const TEST_DISPLAY_NAME = 'Test User';

async function main() {
  let uid;

  // 1. Create or get Auth user
  try {
    const existing = await adminAuth.getUserByEmail(TEST_EMAIL);
    uid = existing.uid;
    console.log(`✓ Auth user already exists: ${uid}`);
    // Update password in case it changed
    await adminAuth.updateUser(uid, { password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME });
    console.log('✓ Password and display name updated.');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const newUser = await adminAuth.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        displayName: TEST_DISPLAY_NAME,
        emailVerified: true,
      });
      uid = newUser.uid;
      console.log(`✓ Auth user created: ${uid}`);
    } else {
      throw err;
    }
  }

  // 2. Create / overwrite Firestore user_access doc (12-month Acceleration plan)
  const now = new Date();
  const expiry = new Date(now);
  expiry.setFullYear(expiry.getFullYear() + 2); // 2 years out for testing

  await adminDb.collection('user_access').doc(uid).set({
    email: TEST_EMAIL,
    plan_type: '12_month',
    purchase_date: Timestamp.fromDate(now),
    expiration_date: Timestamp.fromDate(expiry),
    stripe_session_id: 'test_manual_provision',
    provisioned_by: 'admin_script',
  });

  console.log(`✓ Firestore user_access doc written for uid: ${uid}`);
  console.log(`\n✅ Test account ready!`);
  console.log(`   Email:    ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}`);
  console.log(`   Plan:     12-Month (Acceleration)`);
  console.log(`   Expires:  ${expiry.toDateString()}`);
  console.log(`\n   Login at: https://sslduck-lander.vercel.app/login`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
