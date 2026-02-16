import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
    authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim(),
    projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim(),
    storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim(),
    messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
    appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim()
};

// Safety check: Don't initialize if essential keys are missing
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

if (typeof window !== 'undefined') {
    if (isConfigValid) {
        console.log("[FIREBASE_INIT] Config detected. Project:", firebaseConfig.projectId);
    } else {
        console.warn("[FIREBASE_INIT] Config missing or truncated!");
    }
}

// Initialize Firebase
let app;
let db: any = null;

if (isConfigValid) {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        db = getFirestore(app);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }
}

export { db };
