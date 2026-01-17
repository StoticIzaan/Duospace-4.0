export type ThemeColor = 'violet' | 'rose' | 'emerald' | 'sky' | 'amber';

export interface User {
  id: string;
  username: string;
  avatarColor: string;
  settings: {
    darkMode: boolean;
    showLastSeen: boolean;
    readReceipts: boolean;
    theme: ThemeColor;
    aiTone: 'playful' | 'serious';
  };
}

export interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline';
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content?: string;
  timestamp: number;
  type: 'text' | 'ai' | 'image' | 'voice';
  media_url?: string; // base64 payload
  isRead?: boolean;
  isDeleted?: boolean;
  isEdited?: boolean;
}

export interface PlaylistItem {
  id: string;
  url: string;
  title: string;
  platform: 'youtube' | 'spotify' | 'apple' | 'generic';
  addedBy: string;
  thumbnail?: string;
}

export interface RoomSettings {
  aiEnabled: boolean;
  themeSync: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
}

export interface PongState {
  ball: { x: number; y: number; dx: number; dy: number };
  p1Y: number; // Host paddle (0-100)
  p2Y: number; // Guest paddle (0-100)
  score: { p1: number; p2: number };
  gameStatus: 'intro' | 'countdown' | 'playing' | 'ended';
  countdown: number;
  winner?: 'host' | 'guest';
}

export interface GameState {
  board: (string | null)[];
  status: 'waiting' | 'active' | 'won' | 'draw';
  turn?: string; 
}