import { User, Message } from '../types';

class P2PService {
    private peer: any = null;
    private connections: any[] = []; // Array to hold connections
    private _user: User | null = null;
    public isHostMode: boolean = false;
    
    private callbacks = {
        onMessage: (m: Message) => {},
        onStatus: (s: string) => {},
        onInbox: (req: any) => {},
        onFriendAdded: (friend: any) => {},
        onConnectionsChanged: (conns: string[]) => {}
    };

    constructor() {
        const saved = localStorage.getItem('duospace_user_v5');
        if (saved) this._user = JSON.parse(saved);
    }

    get user() { return this._user; }

    async register(username: string): Promise<User> {
        const id = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (id.length < 2) throw new Error("Identity too short");
        
        const user: User = {
            id,
            username: username.trim(),
            avatarColor: 'violet',
            settings: { 
                darkMode: true, 
                showLastSeen: true, 
                readReceipts: true, 
                theme: 'violet', 
                aiTone: 'playful' 
            }
        };

        this._user = user;
        localStorage.setItem('duospace_user_v5', JSON.stringify(user));
        return user;
    }

    async init(callbacks: Partial<typeof this.callbacks>) {
        if (!this._user) return;
        this.callbacks = { ...this.callbacks, ...callbacks };

        if (this.peer) return;

        try {
            const { default: Peer } = await import('peerjs');
            this.peer = new Peer(this._user.id);

            this.peer.on('open', (id: string) => {
                this.callbacks.onStatus('ready');
            });

            this.peer.on('connection', (conn: any) => {
                this.isHostMode = true;
                this.setupConnection(conn);
            });

            this.peer.on('error', (err: any) => {
                if (err.type === 'unavailable-id') this.callbacks.onStatus('taken');
                else this.callbacks.onStatus('error');
            });
        } catch (e) {
            console.error("P2P Engine Failure", e);
        }
    }

    private setupConnection(conn: any) {
        conn.on('open', () => {
            if (!this.connections.find(c => c.peer === conn.peer)) {
                this.connections.push(conn);
                this.emitConnections();
            }
            this.callbacks.onStatus('connected');
        });

        conn.on('data', (data: any) => this.handleData(conn, data));
        
        conn.on('close', () => {
            this.connections = this.connections.filter(c => c.peer !== conn.peer);
            this.emitConnections();
            if (this.connections.length === 0) {
                this.isHostMode = false; 
                this.callbacks.onStatus('ready');
            }
        });
    }

    private handleData(conn: any, data: any) {
        switch (data.type) {
            case 'FRIEND_REQ':
                this.acceptFriend(conn);
                this.callbacks.onFriendAdded(data.user);
                break;
            case 'FRIEND_ACCEPT':
                this.callbacks.onFriendAdded(data.user);
                break;
            case 'ROOM_INVITE':
                this.callbacks.onInbox({ type: 'room', conn, user: data.user, roomId: data.roomId });
                break;
            case 'CHAT':
                this.callbacks.onMessage(data.msg);
                this.relay(data, conn);
                break;
            case 'GAME_SYNC':
            case 'GAME_INPUT':
            case 'PLAYLIST_SYNC':
            case 'MSG_UPDATE':
            case 'ROOM_SETTINGS':
                window.dispatchEvent(new CustomEvent(`p2p_${data.type.toLowerCase()}`, { detail: data.payload }));
                this.relay(data, conn);
                break;
        }
    }

    private relay(data: any, sourceConn: any) {
        if (this.isHostMode) {
            this.connections.forEach(otherConn => {
                if (otherConn.peer !== sourceConn.peer && otherConn.open) {
                    otherConn.send(data);
                }
            });
        }
    }

    private emitConnections() {
        this.callbacks.onConnectionsChanged(this.connections.map(c => c.peer));
    }

    getActiveConnections() {
        return this.connections.map(c => c.peer);
    }

    async sendFriendRequest(targetId: string) {
        if (!this.peer) return;
        const conn = this.peer.connect(targetId.toLowerCase());
        conn.on('open', () => {
            conn.send({ type: 'FRIEND_REQ', user: this._user });
            this.callbacks.onStatus('req_sent');
        });
    }

    acceptFriend(conn: any) {
        conn.send({ type: 'FRIEND_ACCEPT', user: this._user });
    }

    async inviteToRoom(friendId: string, roomId: string) {
        if (!this.peer) return;
        const conn = this.peer.connect(friendId);
        conn.on('open', () => {
            conn.send({ type: 'ROOM_INVITE', user: this._user, roomId });
            setTimeout(() => conn.close(), 1000); 
        });
    }

    connectToRoom(hostId: string) {
        const existing = this.connections.find(c => c.peer === hostId);
        if (existing && existing.open) return;

        this.isHostMode = false;
        const conn = this.peer.connect(hostId);
        this.setupConnection(conn);
    }

    send(data: any) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    disconnectPeer(peerId: string) {
        const conn = this.connections.find(c => c.peer === peerId);
        if (conn) {
            conn.close();
            this.connections = this.connections.filter(c => c.peer !== peerId);
            this.emitConnections();
        }
    }

    disconnect() {
        this.connections.forEach(c => c.close());
        this.connections = [];
        this.isHostMode = false;
        this.emitConnections();
    }
    
    destroy() {
        this.disconnect();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this._user = null;
    }
}

export const p2p = new P2PService();