const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/\r$/, '').replace(/^"(.*)"$/, '$1');
});

const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

async function checkDb() {
  const db = admin.firestore();
  // Get all documents in user_access collection
  const snapshot = await db.collection('user_access').get();
  snapshot.forEach((doc) => {
    console.log(doc.id, '=>', doc.data());
  });
  process.exit();
}
checkDb();
