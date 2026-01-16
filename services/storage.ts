
import { User, DuoSpace, AuthSession, Message, JoinRequest } from '../types';

const DB_KEY = 'duospace_v10_db';
const SESSION_KEY = 'duospace_v10_session';

// --- Simulated Cloud Database ---
// In a real app, this would be your Firebase/Supabase connection.
// Here, we use a robust local implementation that mimics cloud structure.

const getDB = () => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : { spaces: [] as DuoSpace[], publicRegistry: [] as { username: string, spaceId: string, avatarColor: string }[] };
};

const saveDB = (db: any) => localStorage.setItem(DB_KEY, JSON.stringify(db));

export const getSession = (): AuthSession | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveSession = (session: AuthSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Register user in the "Public Cloud" for search
  const db = getDB();
  // Remove old registry entries for this user to avoid duplicates
  db.publicRegistry = db.publicRegistry.filter((r: any) => r.username !== session.user.username);
  db.publicRegistry.push({ 
    username: session.user.username, 
    spaceId: 'user_profile', // Placeholder
    avatarColor: session.user.avatarColor 
  });
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
  
  // Register this space in the cloud directory
  const regIndex = db.publicRegistry.findIndex((r: any) => r.username === user.username);
  if (regIndex >= 0) {
    db.publicRegistry[regIndex].spaceId = newSpace.id;
  } else {
    db.publicRegistry.push({ username: user.username, spaceId: newSpace.id, avatarColor: user.avatarColor });
  }
  
  saveDB(db);
  return newSpace;
};

// --- Search Logic ---
export const searchByUsername = (query: string): any[] => {
  const db = getDB();
  // Search the registry
  const registryHits = db.publicRegistry.filter((r: any) => 
    r.username.toLowerCase().includes(query.toLowerCase())
  );
  
  // Hydrate hits with space details if available
  return registryHits.map((h: any) => {
    const space = db.spaces.find((s: DuoSpace) => s.id === h.spaceId);
    return {
      username: h.username,
      avatarColor: h.avatarColor,
      spaceId: h.spaceId,
      spaceName: space ? space.name : `${h.username}'s World`,
      isSpaceAvailable: !!space,
      // Helper to check relationship status
      status: 'none' 
    };
  });
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
    // Add the user
    space.members.push(request.fromUser);
    // Clear the request
    space.requests = space.requests.filter((r: JoinRequest) => r.id !== requestId);
    space.activeGame.status = 'active';
    saveDB(db);
  }
};

// --- Media & Sync Logic ---

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

// --- Portal / Import Logic ---
// This acts as the manual "Cloud Sync" for cross-device usage

export const exportSpace = (spaceId: string): string => {
  const space = getSpace(spaceId);
  if (!space) return '';
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
      // Intelligent Merge: Keep local messages, add new ones
      const localSpace = db.spaces[existingIndex];
      const allMsgs = [...localSpace.messages, ...spaceData.messages];
      // Deduplicate by ID
      const uniqueMsgs = Array.from(new Map(allMsgs.map(m => [m.id, m])).values());
      uniqueMsgs.sort((a, b) => a.timestamp - b.timestamp);

      db.spaces[existingIndex] = { 
        ...spaceData, 
        messages: uniqueMsgs 
      };
    } else {
      db.spaces.push(spaceData);
    }
    
    saveDB(db);
    return spaceData;
  } catch (e) {
    throw new Error("Invalid Portal Key");
  }
};
