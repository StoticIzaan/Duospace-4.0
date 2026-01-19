
import { User, Message, InboxItem } from '../types';

class P2PService {
    private peer: any = null;
    private connections: any[] = [];
    private _user: User | null = null;
    public isHostMode: boolean = false;
    
    // Callbacks for UI updates
    private callbacks = {
        onStatus: (s: string) => {},
        onInbox: (item: InboxItem) => {},
        onMessage: (m: Message) => {},
        onMessageUpdate: (data: { id: string, action: 'edit' | 'delete', content?: string }) => {},
        onFriendUpdate: (f: any) => {}, 
        onRoomJoined: (hostId: string) => {},
        onLeave: () => {}
    };

    constructor() {
        this.loadUser();
    }

    private loadUser() {
        try {
            const saved = localStorage.getItem('duospace_user_v6');
            if (saved) this._user = JSON.parse(saved);
        } catch (e) { console.error(e); }
    }

    get user() { return this._user; }

    async register(username: string): Promise<User> {
        const cleanName = username.trim().substring(0, 12);
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const id = `${cleanName.replace(/\s/g, '')}-${suffix}`;
        
        const user: User = {
            id,
            username: cleanName,
            avatarColor: 'violet',
            settings: { 
                darkMode: true, 
                showLastSeen: true, 
                readReceipts: true, 
                theme: 'violet', 
                aiEnabled: true 
            }
        };

        this._user = user;
        localStorage.setItem('duospace_user_v6', JSON.stringify(user));
        return user;
    }

    async init(cbs: any) {
        if (!this._user) return;
        this.callbacks = { ...this.callbacks, ...cbs };

        if (this.peer && !this.peer.destroyed) return;

        try {
            const { default: Peer } = await import('peerjs');
            this.peer = new Peer(this._user.id, { debug: 1 });

            this.peer.on('open', () => this.callbacks.onStatus('online'));
            
            this.peer.on('connection', (conn: any) => {
                this.setupConnection(conn);
            });

            this.peer.on('error', (err: any) => {
                console.warn("P2P Error:", err);
                if (err.type === 'peer-unavailable') this.callbacks.onStatus('not_found');
                else this.callbacks.onStatus('error');
            });

            this.peer.on('disconnected', () => {
                if (this.peer && !this.peer.destroyed) this.peer.reconnect();
            });

        } catch (e) { console.error("Peer Init Failed", e); }
    }

    private setupConnection(conn: any) {
        conn.on('open', () => {
            if (!this.connections.find(c => c.peer === conn.peer)) {
                this.connections.push(conn);
            }
        });

        conn.on('data', (data: any) => this.handleData(conn, data));

        conn.on('close', () => {
            this.connections = this.connections.filter(c => c.peer !== conn.peer);
            this.callbacks.onLeave(); 
        });
    }

    private handleData(conn: any, data: any) {
        switch (data.type) {
            case 'FRIEND_REQ':
                this.callbacks.onInbox({ type: 'friend_request', fromUser: data.user });
                break;
            case 'FRIEND_ACCEPT':
                this.callbacks.onFriendUpdate(data.user);
                break;
            case 'ROOM_INVITE':
                this.callbacks.onInbox({ type: 'room_invite', fromUser: data.user, roomId: data.roomId, roomName: data.roomName });
                break;
            case 'CHAT':
                this.callbacks.onMessage(data.msg);
                if (this.isHostMode) this.broadcast(data, conn.peer); 
                break;
            case 'MSG_UPDATE':
                this.callbacks.onMessageUpdate(data.payload);
                if (this.isHostMode) this.broadcast(data, conn.peer);
                break;
            case 'GAME_SYNC':
            case 'GAME_INPUT':
            case 'MUSIC_ADD':
                window.dispatchEvent(new CustomEvent(`p2p_${data.type.toLowerCase()}`, { detail: data.payload }));
                if (this.isHostMode) this.broadcast(data, conn.peer);
                break;
        }
    }

    // --- Actions ---

    sendFriendRequest(targetId: string) {
        if (!this.peer || !this._user) return;
        const conn = this.peer.connect(targetId);
        conn.on('open', () => {
            conn.send({ type: 'FRIEND_REQ', user: this._user });
            setTimeout(() => conn.close(), 2000);
        });
    }

    acceptFriend(targetId: string) {
        if (!this.peer || !this._user) return;
        const conn = this.peer.connect(targetId);
        conn.on('open', () => {
            conn.send({ type: 'FRIEND_ACCEPT', user: this._user });
            setTimeout(() => conn.close(), 2000);
        });
        return true; 
    }

    inviteToRoom(friendId: string, roomName: string) {
        const conn = this.connections.find(c => c.peer === friendId);
        if (conn && conn.open) {
            // Already connected?
            return;
        }
        // Open new connection just to invite
        const inviteConn = this.peer.connect(friendId);
        inviteConn.on('open', () => {
            inviteConn.send({ type: 'ROOM_INVITE', user: this._user, roomId: this._user?.id, roomName });
            setTimeout(() => inviteConn.close(), 2000);
        });
    }

    joinRoom(hostId: string) {
        this.disconnectAll(); // Leave current
        this.isHostMode = false;
        const conn = this.peer.connect(hostId, { reliable: true });
        this.setupConnection(conn);
        this.callbacks.onRoomJoined(hostId);
    }

    createRoom() {
        this.disconnectAll();
        this.isHostMode = true;
        this.callbacks.onRoomJoined(this._user?.id || '');
    }

    leaveRoom() {
        this.disconnectAll();
        this.callbacks.onLeave();
    }

    broadcast(data: any, excludePeerId?: string) {
        this.connections.forEach(c => {
            if (c.peer !== excludePeerId && c.open) c.send(data);
        });
    }

    send(data: any) {
        this.broadcast(data);
    }

    private disconnectAll() {
        this.connections.forEach(c => c.close());
        this.connections = [];
    }

    destroy() {
        this.disconnectAll();
        if (this.peer) this.peer.destroy();
    }
}

export const p2p = new P2PService();
