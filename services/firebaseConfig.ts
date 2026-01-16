
// Add ts-ignore to suppress errors if modular exports are not recognized by the environment's type loader
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getDatabase } from 'firebase/database';
// @ts-ignore
import { getAuth } from 'firebase/auth';
// @ts-ignore
import { getStorage } from 'firebase/storage';

/**
 * Firebase Configuration Object
 * We use process.env (injected via vite.config.ts) for native environment variable support.
 * This avoids issues with import.meta.env when vite/client types are missing.
 */
const firebaseConfig = {
  // @ts-ignore
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  // @ts-ignore
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  // We prioritize a custom URL if stored in localStorage (manual override), 
  // otherwise we use the environment variable.
  // @ts-ignore
  databaseURL: localStorage.getItem('duospace_custom_db_url') || process.env.VITE_FIREBASE_DATABASE_URL,
  // @ts-ignore
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  // @ts-ignore
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  // @ts-ignore
  messagingSenderId: process.env.VITE_FIREBASE_SENDER_ID,
  // @ts-ignore
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Debug: Verify configuration before initialization to catch errors early
if (!firebaseConfig.databaseURL || !firebaseConfig.projectId) {
  console.error("❌ FIREBASE CONFIG ERROR: Missing Database URL or Project ID.");
}

// @ts-ignore
const app = initializeApp(firebaseConfig);

// @ts-ignore
export const db = getDatabase(app);
// @ts-ignore
export const auth = getAuth(app);
// @ts-ignore
export const storage = getStorage(app);

export default app;
