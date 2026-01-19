import { Peer, DataConnection } from 'peerjs';
import { User } from './types';

class P2PService {
    private peer: Peer | null = null;
    private connection: DataConnection | null = null;
    private _user: User | null = null;
    private _onMessage: ((data: any) => void) | null = null;
    private _onStatus: ((status: string) => void) | null = null;
    private _onInbox: ((request: any) => void) | null = null;

    constructor() {
        const saved = localStorage.getItem('duospace_p2p_v3');
        if (saved) this._user = JSON.parse(saved);
    }

    get user() { return this._user; }

    async register(username: string): Promise<User> {
        const cleanName = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanName.length < 2) throw new Error("Name too short");
        
        // Fixed: Included missing required properties 'showLastSeen' and 'readReceipts' to match the User interface from types.ts
        const user: User = {
            id: cleanName,
            username: username.trim(),
            avatarColor: 'violet',
            settings: { 
                theme: 'violet', 
                darkMode: true, 
                aiEnabled: true,
                showLastSeen: true,
                readReceipts: true
            }
        };

        this._user = user;
        localStorage.setItem('duospace_p2p_v3', JSON.stringify(user));
        return user;
    }

    init(callbacks: { 
        onMessage: (d: any) => void, 
        onStatus: (s: string) => void,
        onInbox?: (req: any) => void 
    }) {
        if (!this._user) return;
        this._onMessage = callbacks.onMessage;
        this._onStatus = callbacks.onStatus;
        this._onInbox = callbacks.onInbox || null;

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        this.peer = new Peer(this._user.id);

        this.peer.on('open', (id) => {
            console.log("P2P Online:", id);
            this._onStatus?.('ready');
        });

        this.peer.on('connection', (conn) => {
            conn.on('data', (data: any) => {
                if (data && data.type === 'HANDSHAKE_REQ') {
                    this._onInbox?.({ conn, user: data.user });
                }
            });
        });

        this.peer.on('error', (err) => {
            console.error("Peer Error:", err);
            if (err.type === 'unavailable-id') this._onStatus?.('name_taken');
            else this._onStatus?.('error');
        });
    }

    async sendRequest(targetName: string) {
        if (!this.peer) return;
        const cleanTarget = targetName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const conn = this.peer.connect(cleanTarget);
        
        conn.on('open', () => {
            conn.send({ type: 'HANDSHAKE_REQ', user: this._user });
            this._onStatus?.('request_sent');
        });
        
        conn.on('data', (data: any) => {
            if (data && data.type === 'HANDSHAKE_ACCEPT') {
                this.setupConnection(conn);
            }
        });

        conn.on('error', (err) => {
            console.error("Connection Error:", err);
            this._onStatus?.('error');
        });
    }

    acceptRequest(conn: DataConnection) {
        conn.send({ type: 'HANDSHAKE_ACCEPT', user: this._user });
        this.setupConnection(conn);
    }

    private setupConnection(conn: DataConnection) {
        this.connection = conn;
        this._onStatus?.('connected');

        conn.on('data', (data: any) => {
            if (data) this._onMessage?.(data);
        });

        conn.on('close', () => {
            this._onStatus?.('disconnected');
            this.connection = null;
        });
    }

    send(data: any) {
        if (this.connection && this.connection.open) {
            this.connection.send(data);
        }
    }

    disconnect() {
        this.connection?.close();
        this.peer?.destroy();
    }
}

export const p2p = new P2PService();