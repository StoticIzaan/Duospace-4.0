import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Filled with your specific duospace-bd78b project details
const firebaseConfig = {
  apiKey: "AIzaSyB72sOWStq7rCXRXn_hYZzcQMkNncIzNsc",
  authDomain: "duospace-bd78b.firebaseapp.com",
  databaseURL: "https://duospace-bd78b-default-rtdb.firebaseio.com",
  projectId: "duospace-bd78b",
  storageBucket: "duospace-bd78b.firebasestorage.app",
  messagingSenderId: "173422542800",
  appId: "1:173422542800:web:2279c7a7576030921203d5"
};

const app = initializeApp(firebaseConfig);

// EXACT EXPORTS - This fixes the build error in peerService.ts
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
