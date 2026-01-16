
import { Peer, DataConnection } from 'peerjs';
import { P2PPayload } from '../types';

type Listener = (payload: P2PPayload) => void;

class P2PService {
  peer: Peer | null = null;
  connections: Map<string, DataConnection> = new Map();
  listeners: Listener[] = [];
  username: string = '';
  peerId: string = '';
  isOnline: boolean = false;

  initialize(username: string, onReady: () => void) {
    if (this.peer) {
        if (this.isOnline) onReady();
        return;
    }
    this.username = username;
    const sanitized = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    this.peerId = `duospace-v11-${sanitized}`;

    console.log("Initializing HoloNet Node:", this.peerId);

    try {
        this.peer = new Peer(this.peerId, {
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            }
        });

        this.peer.on('open', (id) => {
          console.log('HoloNet Online. ID:', id);
          this.isOnline = true;
          onReady();
        });

        this.peer.on('connection', (conn) => {
          console.log('Incoming Neural Link from:', conn.peer);
          this.setupConnection(conn);
        });

        this.peer.on('error', (err: any) => {
            console.error('HoloNet Error:', err);
            if (err.type === 'unavailable-id') {
                alert(`User "${username}" is already active. Please close other tabs.`);
            }
        });
        
        // Keep-alive heartbeat
        setInterval(() => {
           if (this.isOnline) {
             this.broadcast({ type: 'PING', data: {}, fromUsername: this.username });
           }
        }, 15000);

    } catch (e) {
        console.error("PeerJS Failed", e);
    }
  }

  // Connect to another user by username
  connect(targetUsername: string): Promise<boolean> {
      return new Promise((resolve) => {
        if (!this.peer) { resolve(false); return; }

        const sanitized = targetUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetId = `duospace-v11-${sanitized}`;

        if (this.connections.has(targetId)) {
            // Already connected, just ensure it's open
            const c = this.connections.get(targetId);
            if(c?.open) { resolve(true); return; }
        }

        console.log("Attempting Neural Link to:", targetId);
        const conn = this.peer.connect(targetId, { reliable: true });

        const timeout = setTimeout(() => {
            if(!conn.open) {
                console.warn("Connection timed out");
                resolve(false); 
            }
        }, 5000);

        conn.on('open', () => {
            clearTimeout(timeout);
            console.log("Neural Link Established:", targetId);
            this.setupConnection(conn);
            resolve(true);
        });

        conn.on('error', (err) => {
            clearTimeout(timeout);
            console.warn("Connection failed", err);
            resolve(false);
        });
      });
  }

  setupConnection(conn: DataConnection) {
      this.connections.set(conn.peer, conn);
      
      conn.on('data', (data: any) => {
          console.log("RX:", data);
          this.listeners.forEach(l => l(data as P2PPayload));
      });

      conn.on('close', () => {
          console.log("Neural Link Severed:", conn.peer);
          this.connections.delete(conn.peer);
      });
  }

  broadcast(payload: P2PPayload) {
      this.connections.forEach(conn => {
          if (conn.open) conn.send(payload);
      });
  }

  sendTo(targetUsername: string, payload: P2PPayload) {
      const sanitized = targetUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetId = `duospace-v11-${sanitized}`;
      const conn = this.connections.get(targetId);
      
      if (conn && conn.open) {
          conn.send(payload);
      } else {
          // Retry connection then send
          this.connect(targetUsername).then(success => {
              if (success) {
                  const newConn = this.connections.get(targetId);
                  newConn?.send(payload);
              }
          });
      }
  }

  subscribe(listener: Listener) {
      this.listeners.push(listener);
      return () => {
          this.listeners = this.listeners.filter(l => l !== listener);
      };
  }
}

export const p2p = new P2PService();
