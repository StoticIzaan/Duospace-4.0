
// @ts-ignore
import { ref, set, onValue, push, get, child, update, off, runTransaction, remove, onDisconnect } from 'firebase/database';
// @ts-ignore
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
// @ts-ignore
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, DuoSpace, Message } from '../types';
import { db, auth, storage } from './firebaseConfig';

class CloudService {
    userId: string = '';
    private _connected: boolean = false;
    
    constructor() {
        // Listen to special Firebase location for connection status
        // @ts-ignore
        const connectedRef = ref(db, ".info/connected");
        // @ts-ignore
        onValue(connectedRef, (snap) => {
            this._connected = !!snap.val();
        });
    }

    // --- HELPER: Storage ---
    async uploadFile(file: Blob | File, folder: 'images' | 'audio' | 'files'): Promise<string> {
        const ext = file instanceof File ? file.name.split('.').pop() : 'webm';
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        // @ts-ignore
        const fileReference = storageRef(storage, `${folder}/${filename}`);
        
        const metadata = {
            contentType: file.type
        };

        // @ts-ignore
        await uploadBytes(fileReference, file, metadata);
        // @ts-ignore
        return await getDownloadURL(fileReference);
    }

    get dbUrl() {
        return db.app.options.databaseURL;
    }

    // --- AUTHENTICATION ---

    private sanitize(username: string) {
        return username.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    private getEmail(username: string) {
        return `${this.sanitize(username)}@duospace.app`;
    }

    async register(username: string, password: string): Promise<User> {
        const cleanName = this.sanitize(username);
        const email = this.getEmail(username);
        
        // @ts-ignore
        const usernameRef = ref(db, `usernames/${cleanName}`);
        // @ts-ignore
        const snapshot = await get(usernameRef);
        if (snapshot.exists()) {
            throw new Error("Username already taken");
        }

        let userCred;
        try {
            // @ts-ignore
            userCred = await createUserWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            if (e.code === 'auth/email-already-in-use') throw new Error("Username already taken");
            throw e;
        }
        
        const newUserId = userCred.user.uid;

        const newUser: User = {
            id: newUserId,
            username: username,
            avatarColor: 'violet',
            settings: { darkMode: true, showLastSeen: true, readReceipts: true, theme: 'violet', aiInChat: true, aiTone: 'playful' }
        };

        // @ts-ignore
        await set(ref(db, `users/${newUserId}`), newUser);
        // @ts-ignore
        await set(usernameRef, newUserId);

        this.userId = newUserId;
        this.setupPresence(newUserId);
        return newUser;
    }

    async login(username: string, password: string): Promise<User> {
        const email = this.getEmail(username);

        let userCred;
        try {
            // @ts-ignore
            userCred = await signInWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
             if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') throw new Error("Invalid username or password");
             throw e;
        }

        const userId = userCred.user.uid;

        // @ts-ignore
        const userSnap = await get(child(ref(db), `users/${userId}`));
        if (!userSnap.exists()) {
            throw new Error("Account profile missing");
        }

        const userData = userSnap.val() as User;
        
        this.userId = userId;
        this.setupPresence(userId);

        return userData;
    }

    async initialize(user: User, onReady: () => void) {
        this.userId = user.id;
        this.setupPresence(user.id);
        onReady();
    }

    private setupPresence(userId: string) {
        // @ts-ignore
        const userStatusRef = ref(db, `users/${userId}/isOnline`);
        // @ts-ignore
        const lastSeenRef = ref(db, `users/${userId}/lastSeen`);

        // @ts-ignore
        set(userStatusRef, true);
        // @ts-ignore
        onDisconnect(userStatusRef).set(false);
        // @ts-ignore
        onDisconnect(lastSeenRef).set(Date.now());
    }
    
    get isOnline() {
        return this._connected;
    }

    async findUser(username: string): Promise<{id: string, username: string} | null> {
        try {
            const cleanName = this.sanitize(username);
            // @ts-ignore
            const snapshot = await get(child(ref(db), `usernames/${cleanName}`));
            if (!snapshot.exists()) return null;
            
            const userId = snapshot.val();
            // @ts-ignore
            const userRef = await get(child(ref(db), `users/${userId}`));
            if (!userRef.exists()) return null;
            
            return { id: userId, username: userRef.val().username };
        } catch (e) {
            console.error("Find User Error:", e);
            return null;
        }
    }

    // --- INVITES ---

    async sendInvite(targetUserId: string, payload: any) {
        // @ts-ignore
        const inviteRef = push(ref(db, `users/${targetUserId}/invites`));
        // @ts-ignore
        await set(inviteRef, payload);
    }

    subscribeToInvites(userId: string, callback: (invites: any[]) => void) {
        // @ts-ignore
        const invitesRef = ref(db, `users/${userId}/invites`);
        // @ts-ignore
        const unsub = onValue(invitesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.entries(data).map(([key, val]: [string, any]) => ({
                    inviteId: key,
                    ...val
                }));
                callback(list);
            } else {
                callback([]);
            }
        });
        // @ts-ignore
        return () => off(invitesRef);
    }

    async deleteInvite(userId: string, inviteId: string) {
        // @ts-ignore
        await remove(ref(db, `users/${userId}/invites/${inviteId}`));
    }

    // --- SPACE & MESSAGING ---

    async syncSpace(space: DuoSpace) {
        try {
            const cleanSpace = JSON.parse(JSON.stringify(space));
            // @ts-ignore
            await set(ref(db, `spaces/${space.id}`), cleanSpace);
        } catch (e) {
            console.error("Sync Space Error:", e);
        }
    }

    subscribeToSpace(spaceId: string, callback: (space: DuoSpace) => void) {
        // @ts-ignore
        const spaceRef = ref(db, `spaces/${spaceId}`);
        // @ts-ignore
        const unsub = onValue(spaceRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (!data.messages) data.messages = [];
                if (!data.members) data.members = [];
                callback(data);
            }
        });
        // @ts-ignore
        return () => off(spaceRef);
    }

    sendMessage(spaceId: string, message: Message) {
        const cleanMessage = JSON.parse(JSON.stringify(message));
        // @ts-ignore
        const msgsRef = ref(db, `spaces/${spaceId}/messages`);
        // @ts-ignore
        runTransaction(msgsRef, (messages) => {
            if (!messages) return [cleanMessage];
            messages.push(cleanMessage);
            return messages;
        }).catch(e => console.error("Send Message Error:", e));
    }

    // --- TYPING & REACTIONS (NEW) ---

    setTypingStatus(spaceId: string, userId: string, isTyping: boolean) {
        // @ts-ignore
        const typingRef = ref(db, `spaces/${spaceId}/typing/${userId}`);
        if (isTyping) {
            // @ts-ignore
            set(typingRef, true);
            // @ts-ignore
            onDisconnect(typingRef).remove();
        } else {
            // @ts-ignore
            remove(typingRef);
        }
    }

    subscribeToTyping(spaceId: string, callback: (typingUsers: string[]) => void) {
        // @ts-ignore
        const typingRef = ref(db, `spaces/${spaceId}/typing`);
        // @ts-ignore
        const unsub = onValue(typingRef, (snap) => {
            const data = snap.val();
            callback(data ? Object.keys(data) : []);
        });
        // @ts-ignore
        return () => off(typingRef);
    }

    toggleReaction(spaceId: string, messageId: string, userId: string, emoji: string) {
        // @ts-ignore
        const msgsRef = ref(db, `spaces/${spaceId}/messages`);
        // @ts-ignore
        runTransaction(msgsRef, (messages: Message[]) => {
            if (!messages) return messages;
            const msgIndex = messages.findIndex(m => m.id === messageId);
            if (msgIndex === -1) return messages;
            
            const msg = messages[msgIndex];
            if (!msg.reactions) msg.reactions = {};
            
            if (msg.reactions[userId] === emoji) {
                delete msg.reactions[userId];
            } else {
                msg.reactions[userId] = emoji;
            }
            
            messages[msgIndex] = msg;
            return messages;
        });
    }

    // --- GAME & THEME ---

    updateGame(spaceId: string, gameState: any) {
        // @ts-ignore
        update(ref(db, `spaces/${spaceId}`), { activeGame: gameState }).catch(e => console.error("Update Game Error:", e));
    }

    updateTheme(spaceId: string, theme: string) {
        // @ts-ignore
        update(ref(db, `spaces/${spaceId}`), { theme }).catch(e => console.error("Update Theme Error:", e));
    }
}

export const cloud = new CloudService();
