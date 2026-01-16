import { User, Message } from '../types';

class P2PService {
    private peer: any = null;
    private connections: any[] = []; // Array to hold multiple guest connections
    private _user: User | null = null;
    // Track if we are the "Host" (meaning we are accepting connections, not just a guest)
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
                // If we receive a connection, we are acting as a Host for that link
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
                this.isHostMode = false; // Reset if everyone leaves
                this.callbacks.onStatus('ready');
            }
        });
    }

    private handleData(conn: any, data: any) {
        switch (data.type) {
            case 'FRIEND_REQ':
                this.callbacks.onInbox({ type: 'friend', conn, user: data.user });
                break;
            case 'FRIEND_ACCEPT':
                this.callbacks.onFriendAdded(data.user);
                break;
            case 'ROOM_INVITE':
                this.callbacks.onInbox({ type: 'room', conn, user: data.user, roomId: data.roomId });
                break;
            case 'CHAT':
                // 1. Process the message locally
                this.callbacks.onMessage(data.msg);
                
                // 2. RELAY LOGIC: If I am the Host, forward this to everyone else
                if (this.isHostMode) {
                    this.connections.forEach(otherConn => {
                        // Don't send it back to the person who sent it
                        if (otherConn.peer !== conn.peer && otherConn.open) {
                            otherConn.send(data);
                        }
                    });
                }
                break;
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

    // Host sends an invite to a friend
    async inviteToRoom(friendId: string, roomId: string) {
        if (!this.peer) return;
        // Temporary connection just to send the invite packet
        const conn = this.peer.connect(friendId);
        conn.on('open', () => {
            conn.send({ type: 'ROOM_INVITE', user: this._user, roomId });
            setTimeout(() => conn.close(), 1000); // Close after sending, we wait for them to connect back
        });
    }

    // Guest connects to Host
    connectToRoom(hostId: string) {
        this.disconnect(); // Close existing
        this.isHostMode = false; // We are joining, so we are a guest
        const conn = this.peer.connect(hostId);
        this.setupConnection(conn);
    }

    // Send to ALL connected peers (Broadcast)
    send(data: any) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    // Close specific connection (kick or leave)
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
    
    // Fully reset for logout
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