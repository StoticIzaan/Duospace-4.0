
import { User, DuoSpace, AuthSession, Message } from '../types';

const DB_KEY = 'duospace_v8_db';
const SESSION_KEY = 'duospace_v8_session';

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
    activeGame: { board: Array(9).fill(null), status: 'waiting' },
    messages: []
  };
  db.spaces.push(newSpace);
  saveDB(db);
  return newSpace;
};

export const joinSpace = (user: User, input: string): DuoSpace => {
  const db = getDB();
  const cleanInput = input.trim();
  
  // 1. Check if it's a long base64 Sync Key
  if (cleanInput.length > 20) {
    try {
      return importSpace(cleanInput, user);
    } catch (e) {
      console.error("Portal Error", e);
    }
  }

  // 2. Local lookup (same device)
  let space = db.spaces.find((s: DuoSpace) => s.code === cleanInput.toUpperCase());
  
  if (!space) {
    throw new Error("Dimension not found. Use a Sync Link to join from another device.");
  }
  
  // Add member
  const alreadyMember = space.members.some((m: User) => m.id === user.id);
  if (!alreadyMember) {
    if (space.members.length >= 2) throw new Error("This dimension is full.");
    space.members.push(user);
    space.activeGame.status = 'active';
  }
  
  saveDB(db);
  return space;
};

export const exportSpace = (spaceId: string): string => {
  const space = getSpace(spaceId);
  if (!space) return '';
  // Encodes the entire current state including messages for transfer
  return btoa(JSON.stringify(space));
};

export const importSpace = (portalKey: string, user: User): DuoSpace => {
  try {
    const spaceData: DuoSpace = JSON.parse(atob(portalKey.trim()));
    const db = getDB();
    
    // Auto-join the importing user
    const alreadyMember = spaceData.members.some((m: User) => m.id === user.id);
    if (!alreadyMember && spaceData.members.length < 2) {
      spaceData.members.push(user);
    }

    const existingIndex = db.spaces.findIndex((s: DuoSpace) => s.id === spaceData.id);
    if (existingIndex !== -1) {
      // Refresh local copy with portal data
      db.spaces[existingIndex] = { 
        ...spaceData, 
        // Merge messages to ensure none are lost
        messages: mergeMessages(db.spaces[existingIndex].messages, spaceData.messages)
      };
    } else {
      db.spaces.push(spaceData);
    }
    
    saveDB(db);
    return spaceData;
  } catch (e) {
    throw new Error("Invalid or corrupted Sync Link.");
  }
};

const mergeMessages = (local: Message[], remote: Message[]) => {
  const map = new Map();
  local.forEach(m => map.set(m.id, m));
  remote.forEach(m => map.set(m.id, m));
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
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
