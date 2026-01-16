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
}

export interface GameState {
  board: (string | null)[];
  status: 'waiting' | 'active' | 'won' | 'draw';
  turn?: string; 
}