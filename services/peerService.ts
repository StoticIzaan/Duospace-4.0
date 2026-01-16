
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, get, child, update, off, runTransaction } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { User, DuoSpace, Message } from '../types';

// Check for manual override
const CUSTOM_DB_URL = localStorage.getItem('duospace_custom_db_url');

// Hardcoded configuration based on provided credentials
const firebaseConfig = {
  apiKey: "AIzaSyB72sOWStq7rCXRXn_hYZzcQMkNncIzNsc",
  authDomain: "duospace-bd78b.firebaseapp.com",
  // Use custom URL if set, otherwise fallback to inferred default
  databaseURL: CUSTOM_DB_URL || "https://duospace-bd78b-default-rtdb.firebaseio.com", 
  projectId: "duospace-bd78b",
  storageBucket: "duospace-bd78b.firebasestorage.app",
  messagingSenderId: "173422542800",
  appId: "1:173422542800:web:2279c7a7576030921203d5",
  measurementId: "G-DBHJTY14F1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

class CloudService {
    userId: string = '';
    private _connected: boolean = false;
    
    constructor() {
        // Listen to special Firebase location for connection status
        const connectedRef = ref(db, ".info/connected");
        onValue(connectedRef, (snap) => {
            this._connected = !!snap.val();
        });
    }

    get dbUrl() {
        return firebaseConfig.databaseURL;
    }

    // Initialize connection and presence
    async initialize(user: User, onReady: () => void) {
        this.userId = user.id;
        console.log(`[Cloud] Initializing. Target DB: ${this.dbUrl}`);

        // 1. Attempt Authentication
        try {
            await signInAnonymously(auth);
            console.log("[Cloud] Auth Signed In");
        } catch (e: any) {
            // Handle specific error when Auth is not enabled in Console
            if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
                console.warn("[Cloud] Anonymous Auth disabled. Relying on Public Database Rules.");
            } else {
                console.error("[Cloud] Auth Error:", e);
            }
        }

        // 2. Attempt Database Registration (Works if Auth succeeds OR if Rules are public)
        try {
            // Update user registry
            const userRef = ref(db, `users/${user.id}`);
            await update(userRef, {
                username: user.username,
                lastSeen: Date.now(),
                isOnline: true
            });

            // Update username lookup
            const usernameRef = ref(db, `usernames/${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
            await set(usernameRef, user.id);
            
            console.log("[Cloud] Database Registration Successful");
        } catch (e) {
            console.error("[Cloud] Database Write Failed. Check Rules/URL.", e);
        }

        // 3. Always call onReady to unblock the UI
        onReady();
    }
    
    // Check real connection status
    get isOnline() {
        return this._connected;
    }

    // Search for a user
    async findUser(username: string): Promise<string | null> {
        try {
            const sanitized = username.toLowerCase().replace(/[^a-z0-9]/g, '');
            const snapshot = await get(child(ref(db), `usernames/${sanitized}`));
            return snapshot.exists() ? snapshot.val() : null;
        } catch (e) {
            console.error("Find User Error:", e);
            return null;
        }
    }

    // Send a join request
    sendInvite(targetUserId: string, payload: any) {
        const inviteRef = push(ref(db, `users/${targetUserId}/invites`));
        set(inviteRef, payload).catch(e => console.error("Send Invite Error:", e));
    }

    // Listen for incoming invites
    subscribeToInvites(userId: string, callback: (payload: any) => void) {
        const invitesRef = ref(db, `users/${userId}/invites`);
        const unsub = onValue(invitesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Process the first invite found and clear it
                const key = Object.keys(data)[0];
                callback(data[key]);
                set(child(invitesRef, key), null); // Clear after reading
            }
        });
        return () => off(invitesRef);
    }

    // Sync a space to the cloud (for creation)
    async syncSpace(space: DuoSpace) {
        try {
            await set(ref(db, `spaces/${space.id}`), space);
        } catch (e) {
            console.error("Sync Space Error:", e);
        }
    }

    // Listen to a specific space
    subscribeToSpace(spaceId: string, callback: (space: DuoSpace) => void) {
        const spaceRef = ref(db, `spaces/${spaceId}`);
        const unsub = onValue(spaceRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Ensure arrays exist
                if (!data.messages) data.messages = [];
                if (!data.members) data.members = [];
                callback(data);
            }
        });
        return () => off(spaceRef);
    }

    // Send a message
    sendMessage(spaceId: string, message: Message) {
        const msgsRef = ref(db, `spaces/${spaceId}/messages`);
        runTransaction(msgsRef, (messages) => {
            if (!messages) return [message];
            messages.push(message);
            return messages;
        }).catch(e => console.error("Send Message Error:", e));
    }

    // Update game state
    updateGame(spaceId: string, gameState: any) {
        update(ref(db, `spaces/${spaceId}`), { activeGame: gameState }).catch(e => console.error("Update Game Error:", e));
    }

    // Update theme
    updateTheme(spaceId: string, theme: string) {
        update(ref(db, `spaces/${spaceId}`), { theme }).catch(e => console.error("Update Theme Error:", e));
    }
}

export const cloud = new CloudService();
