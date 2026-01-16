
export type ThemeColor = 'violet' | 'rose' | 'red' | 'sky' | 'emerald' | 'gold';

export interface User {
  id: string;
  username: string;
  avatarColor: string;
  settings: {
    darkMode: boolean;
    showLastSeen: boolean;
    readReceipts: boolean;
    theme: ThemeColor;
    aiInChat: boolean;
  };
}

export interface JoinRequest {
  id: string;
  fromUser: User;
  spaceId: string;
  spaceName: string;
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'ai' | 'image' | 'voice' | 'file';
  mediaUrl?: string; 
  fileName?: string;
  read?: boolean;
}

export interface GameState {
  board: (string | null)[];
  status: 'waiting' | 'active' | 'won' | 'draw';
}

export interface DuoSpace {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  theme: ThemeColor;
  members: User[];
  requests: JoinRequest[];
  activeGame: GameState;
  messages: Message[];
}

export interface AuthSession {
  user: User;
}
