const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/\r$/, '').replace(/^"(.*)"$/, '$1');
});

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = admin.auth();

async function checkUsers() {
  try {
    const listUsersResult = await auth.listUsers(10);
    console.log("=== RECENT USERS ===");
    if (listUsersResult.users.length === 0) {
      console.log("No users found.");
    } else {
      listUsersResult.users.forEach((userRecord) => {
        console.log(`- ${userRecord.email} [${userRecord.uid}] (Created: ${userRecord.metadata.creationTime})`);
      });
    }
  } catch (error) {
    console.error('Error listing users:', error);
  }
  process.exit();
}

checkUsers();
