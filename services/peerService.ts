
import Peer, { DataConnection } from 'peerjs';
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
    if (this.peer) return;
    this.username = username;
    // Deterministic Peer ID based on username so others can find you
    // sanitized to be url safe
    const sanitized = username.toLowerCase().replace(/[^a-z0-9]/g, '');
    this.peerId = `duospace-v11-${sanitized}`;

    console.log("Initializing HoloNet Node:", this.peerId);

    try {
        this.peer = new Peer(this.peerId, {
            debug: 1
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

        this.peer.on('error', (err) => {
            console.error('HoloNet Error:', err);
            // Handle ID taken (user already online elsewhere)
            if (err.type === 'unavailable-id') {
                alert(`User "${username}" is already active on another device. Please close the other tab or use a different name.`);
            }
        });
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
            resolve(true);
            return;
        }

        console.log("Attempting Neural Link to:", targetId);
        const conn = this.peer.connect(targetId, { reliable: true });

        conn.on('open', () => {
            console.log("Neural Link Established:", targetId);
            this.setupConnection(conn);
            resolve(true);
        });

        conn.on('error', (err) => {
            console.warn("Connection failed", err);
            resolve(false);
        });

        // Timeout if user is offline
        setTimeout(() => {
            if (!conn.open) resolve(false);
        }, 3000);
      });
  }

  setupConnection(conn: DataConnection) {
      this.connections.set(conn.peer, conn);
      
      conn.on('data', (data: any) => {
          console.log("Received Data Packet:", data);
          this.listeners.forEach(l => l(data as P2PPayload));
      });

      conn.on('close', () => {
          console.log("Neural Link Severed:", conn.peer);
          this.connections.delete(conn.peer);
      });
  }

  // Broadcast to all connected peers
  broadcast(payload: P2PPayload) {
      this.connections.forEach(conn => {
          if (conn.open) conn.send(payload);
      });
  }

  // Send to specific user
  sendTo(targetUsername: string, payload: P2PPayload) {
      const sanitized = targetUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetId = `duospace-v11-${sanitized}`;
      const conn = this.connections.get(targetId);
      if (conn && conn.open) {
          conn.send(payload);
      } else {
          // Try to connect then send
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
