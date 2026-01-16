import { User, DuoSpace, AuthSession } from '../types';

const DB_KEY = 'duospace_v6_db';
const SESSION_KEY = 'duospace_v6_session';

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

export const joinSpace = (user: User, code: string): DuoSpace => {
  const db = getDB();
  const cleanCode = code.trim().toUpperCase();
  
  // Try to find by code first
  let space = db.spaces.find((s: DuoSpace) => s.code === cleanCode);
  
  // If not found by code, try to see if the 'code' is actually a base64 Portal Key
  if (!space) {
    try {
      return importSpace(code);
    } catch (e) {
      throw new Error("Dimension not found on this device. Please use a Sync Link or Portal Key.");
    }
  }
  
  const alreadyMember = space.members.some((m: User) => m.id === user.id);
  if (!alreadyMember) {
    if (space.members.length >= 2) throw new Error("This space is already full.");
    space.members.push(user);
    space.activeGame.status = 'active';
  }
  
  saveDB(db);
  return space;
};

export const exportSpace = (spaceId: string): string => {
  const space = getSpace(spaceId);
  if (!space) return '';
  return btoa(JSON.stringify(space));
};

export const importSpace = (portalKey: string): DuoSpace => {
  try {
    const spaceData: DuoSpace = JSON.parse(atob(portalKey.trim()));
    const db = getDB();
    const exists = db.spaces.findIndex((s: DuoSpace) => s.id === spaceData.id);
    
    if (exists !== -1) {
      db.spaces[exists] = { ...spaceData, members: db.spaces[exists].members };
    } else {
      db.spaces.push(spaceData);
    }
    
    saveDB(db);
    return spaceData;
  } catch (e) {
    throw new Error("Invalid Portal Key.");
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
