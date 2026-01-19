
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
    aiEnabled: boolean;
  };
}

export interface Friend {
  id: string;
  username: string;
  status: 'online' | 'offline';
}

export interface MusicItem {
  id: string;
  url: string;
  addedBy: string;
  timestamp: number;
  title?: string;
  artist?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content?: string;
  timestamp: number;
  type: 'text' | 'ai' | 'image' | 'voice' | 'sketch' | 'music';
  media_url?: string; 
  music_item?: MusicItem;
  isRead?: boolean;
  isEdited?: boolean;
  replyTo?: {
    id: string;
    sender: string;
    content: string;
  };
}

export interface PongState {
  ball: { x: number; y: number; dx: number; dy: number };
  p1Y: number; // Host paddle
  p2Y: number; // Guest paddle
  score: { p1: number; p2: number };
  gameStatus: 'intro' | 'countdown' | 'playing' | 'ended';
  countdown: number;
  winnerName?: string;
}

export interface InboxItem {
  type: 'friend_request' | 'room_invite';
  fromUser: User;
  roomId?: string; // For room invites
  roomName?: string;
}
