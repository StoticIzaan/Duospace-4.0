export type ThemeColor = 'violet' | 'rose' | 'red' | 'sky' | 'emerald' | 'gold';

export interface User {
  id: string;
  username: string;
  avatarColor: string;
  settings: {
    darkMode?: boolean;
    showLastSeen?: boolean;
    readReceipts?: boolean;
    theme?: ThemeColor;
    aiInChat?: boolean;
    aiTone?: 'playful' | 'serious';
  };
}

export interface Message {
  id?: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: number;
  type: 'text' | 'ai' | 'image' | 'voice' | 'file';
  media_url?: string; 
}

export interface GameState {
  board: (string | null)[];
  status: 'waiting' | 'active' | 'won' | 'draw';
  turn?: string; 
}

export interface DuoSpace {
  id: string;
  owner_id: string;
  name: string;
  code: string;
  theme: ThemeColor;
  members: User[];
  active_game: GameState;
}