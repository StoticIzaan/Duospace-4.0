
import { User, DuoSpace, AuthSession, Message, JoinRequest } from '../types';

const DB_KEY = 'duospace_v9_db';
const SESSION_KEY = 'duospace_v9_session';

const getDB = () => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : { spaces: [] as DuoSpace[], publicRegistry: [] as { username: string, spaceId: string }[] };
};

const saveDB = (db: any) => localStorage.setItem(DB_KEY, JSON.stringify(db));

export const getSession = (): AuthSession | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveSession = (session: AuthSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Also register in public registry for search
  const db = getDB();
  // Cleanup old entries for same user
  db.publicRegistry = db.publicRegistry.filter((r: any) => r.username !== session.user.username);
  saveDB(db);
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
  // Add to search registry
  db.publicRegistry.push({ username: user.username, spaceId: newSpace.id });
  saveDB(db);
  return newSpace;
};

export const searchByUsername = (query: string): DuoSpace[] => {
  const db = getDB();
  const registryHits = db.publicRegistry.filter((r: any) => 
    r.username.toLowerCase().includes(query.toLowerCase())
  );
  return registryHits.map((h: any) => db.spaces.find((s: DuoSpace) => s.id === h.spaceId)).filter(Boolean);
};

export const sendJoinRequest = (user: User, spaceId: string) => {
  const db = getDB();
  const space = db.spaces.find((s: DuoSpace) => s.id === spaceId);
  if (!space) return;
  
  const alreadyMember = space.members.some((m: User) => m.id === user.id);
  const alreadyRequested = space.requests.some((r: JoinRequest) => r.fromUser.id === user.id);
  
  if (!alreadyMember && !alreadyRequested) {
    space.requests.push({
      id: Math.random().toString(36).substring(2, 11),
      fromUser: user,
      spaceId: space.id,
      spaceName: space.name,
      timestamp: Date.now()
    });
    saveDB(db);
  }
};

export const acceptRequest = (spaceId: string, requestId: string) => {
  const db = getDB();
  const space = db.spaces.find((s: DuoSpace) => s.id === spaceId);
  if (!space) return;
  
  const request = space.requests.find((r: JoinRequest) => r.id === requestId);
  if (request) {
    space.members.push(request.fromUser);
    space.requests = space.requests.filter((r: JoinRequest) => r.id !== requestId);
    space.activeGame.status = 'active';
    saveDB(db);
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
  db.publicRegistry = db.publicRegistry.filter((r: any) => r.spaceId !== spaceId);
  saveDB(db);
};
