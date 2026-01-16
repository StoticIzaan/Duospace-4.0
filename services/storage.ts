
import { User, DuoSpace, AuthSession, Message, JoinRequest } from '../types';

const DB_KEY = 'duospace_v11_db';
const SESSION_KEY = 'duospace_v11_session';

const getDB = () => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : { spaces: [] as DuoSpace[] };
};

const saveDB = (db: any) => localStorage.setItem(DB_KEY, JSON.stringify(db));

export const getSession = (): AuthSession | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveSession = (session: AuthSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const createSpace = (user: User, name: string): DuoSpace => {
  const db = getDB();
  const newSpace: DuoSpace = {
    id: Math.random().toString(36).substring(2, 11),
    ownerId: user.id,
    name: name || `${user.username}'s Space`,
    code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    theme: 'violet',
    members: [user],
    requests: [],
    activeGame: { board: Array(9).fill(null), status: 'waiting' },
    messages: []
  };
  db.spaces.push(newSpace);
  saveDB(db);
  return newSpace;
};

// --- Sync Helpers ---

export const getMySpaces = (userId: string): DuoSpace[] => {
    return getDB().spaces.filter((s: DuoSpace) => s.members.some(m => m.id === userId));
};

export const saveSpace = (space: DuoSpace) => {
    const db = getDB();
    const idx = db.spaces.findIndex((s: DuoSpace) => s.id === space.id);
    if (idx !== -1) {
        db.spaces[idx] = space;
    } else {
        db.spaces.push(space);
    }
    saveDB(db);
};

// Handle incoming message from P2P
export const addMessageToSpace = (spaceId: string, msg: Message) => {
    const db = getDB();
    const space = db.spaces.find((s: DuoSpace) => s.id === spaceId);
    if (space) {
        // Prevent duplicates
        if (!space.messages.some((m: Message) => m.id === msg.id)) {
            space.messages.push(msg);
            space.messages.sort((a: Message, b: Message) => a.timestamp - b.timestamp);
            saveDB(db);
        }
    }
};

export const getSpace = (spaceId: string): DuoSpace | undefined => {
  return getDB().spaces.find((s: DuoSpace) => s.id === spaceId);
};

export const updateSpace = (spaceId: string, updates: Partial<DuoSpace>) => {
  const db = getDB();
  const index = db.spaces.findIndex((s: DuoSpace) => s.id === spaceId);
  if (index !== -1) {
    db.spaces[index] = { ...db.spaces[index], ...updates };
    saveDB(db);
  }
};

export const deleteSpace = (spaceId: string) => {
  const db = getDB();
  db.spaces = db.spaces.filter((s: DuoSpace) => s.id !== spaceId);
  saveDB(db);
};
