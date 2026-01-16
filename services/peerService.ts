import { User } from '../types';

class P2PService {
    private peer: any = null;
    private connection: any = null;
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
        
        const user: User = {
            id: cleanName,
            username: username.trim(),
            avatarColor: 'violet',
            settings: { theme: 'violet', darkMode: true, aiTone: 'playful' }
        };

        this._user = user;
        localStorage.setItem('duospace_p2p_v3', JSON.stringify(user));
        return user;
    }

    async init(callbacks: { 
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
        
        // Lazy load peerjs to avoid build issues
        const { default: Peer } = await import('peerjs');
        this.peer = new Peer(this._user.id);

        this.peer.on('open', (id: string) => {
            console.log("P2P Online:", id);
            this._onStatus?.('ready');
        });

        this.peer.on('connection', (conn: any) => {
            conn.on('data', (data: any) => {
                if (data && data.type === 'HANDSHAKE_REQ') {
                    // Incoming request lands in inbox
                    this._onInbox?.({ conn, user: data.user });
                }
            });
        });

        this.peer.on('error', (err: any) => {
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
            if (data && data.type === 'HANDSHAKE_DECLINE') {
                this._onStatus?.('ready');
                conn.close();
            }
        });

        conn.on('error', (err: any) => {
            console.error("Connection Error:", err);
            this._onStatus?.('error');
        });
    }

    acceptRequest(conn: any) {
        conn.send({ type: 'HANDSHAKE_ACCEPT', user: this._user });
        this.setupConnection(conn);
    }

    declineRequest(conn: any) {
        conn.send({ type: 'HANDSHAKE_DECLINE' });
        conn.close();
    }

    private setupConnection(conn: any) {
        this.connection = conn;
        this._onStatus?.('connected');

        conn.on('data', (data: any) => {
            if (data && (data.type === 'CHAT' || data.type === 'GAME')) {
                this._onMessage?.(data);
            }
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