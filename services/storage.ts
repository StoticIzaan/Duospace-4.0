
import { User, DuoSpace, AuthSession } from '../types';

const DB_KEY = 'duospace_v7_db';
const SESSION_KEY = 'duospace_v7_session';

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
  
  // 1. Check if input is a base64 Sync Key/Portal
  if (cleanInput.length > 20) {
    try {
      return importSpace(cleanInput, user);
    } catch (e) {
      // Not a key, continue to code check
    }
  }

  // 2. Try to find by local 6-digit code
  let space = db.spaces.find((s: DuoSpace) => s.code === cleanInput.toUpperCase());
  
  if (!space) {
    throw new Error("Dimension not found. Use a Sync Link for cross-device access.");
  }
  
  // Add member if not present
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
  // Clean up data for transfer (reduce size)
  return btoa(JSON.stringify(space));
};

export const importSpace = (portalKey: string, user: User): DuoSpace => {
  try {
    const spaceData: DuoSpace = JSON.parse(atob(portalKey.trim()));
    const db = getDB();
    const existingIndex = db.spaces.findIndex((s: DuoSpace) => s.id === spaceData.id);
    
    // Join the space automatically on import
    const alreadyMember = spaceData.members.some((m: User) => m.id === user.id);
    if (!alreadyMember && spaceData.members.length < 2) {
      spaceData.members.push(user);
    }

    if (existingIndex !== -1) {
      // Merge: Keep local messages, but update everything else
      db.spaces[existingIndex] = { ...spaceData, messages: [...new Set([...db.spaces[existingIndex].messages, ...spaceData.messages])] };
    } else {
      db.spaces.push(spaceData);
    }
    
    saveDB(db);
    return spaceData;
  } catch (e) {
    throw new Error("Corrupted Portal Key.");
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
