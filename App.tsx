
import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, MessageCircle, Gamepad2, Music2, Settings, LogOut, 
  Plus, ArrowLeft, Send, Mic, Image as ImageIcon, PenTool, 
  Play, Pause, Trash2, Copy, CheckCircle2, XCircle, UserPlus, 
  Bell, Heart, ChevronUp, ChevronDown, Moon, Sun, Bot, Trophy,
  Reply, Edit2, MoreVertical, StopCircle
} from 'lucide-react';
import { p2p } from './services/peerService'; 
import { User, Message, Friend, InboxItem, PongState, MusicItem } from './types';
import { Button, Input, Card, Badge } from './components/Common';
import * as AI from './services/geminiService';

// --- UTILS ---
const safeJson = (key: string, def: any) => {
    try { return JSON.parse(localStorage.getItem(key) || '') || def; } 
    catch { return def; }
};
const saveJson = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// --- COMPONENTS ---

// 1. PONG GAME (Physics Fixed)
const PongGame = ({ isHost, p1Name, p2Name, onFinish }: { isHost: boolean, p1Name: string, p2Name: string, onFinish: () => void }) => {
    const [state, setState] = useState<PongState>({
        ball: { x: 50, y: 50, dx: 0, dy: 0 },
        p1Y: 50, p2Y: 50, score: { p1: 0, p2: 0 },
        gameStatus: 'intro', countdown: 3
    });

    const move = (dir: number) => {
        setState(prev => {
            const key = isHost ? 'p1Y' : 'p2Y';
            const val = Math.max(12, Math.min(88, prev[key] + dir)); // Constrain to prevent paddle leaving play area
            const next = { ...prev, [key]: val };
            p2p.send({ type: 'GAME_INPUT', payload: { y: val, isHost } });
            return next;
        });
    };

    // Keyboard controls
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') move(-10);
            if (e.key === 'ArrowDown') move(10);
        };
        const handleP2P = (e: any) => {
            const { y, isHost: remoteHost } = e.detail;
            setState(prev => ({ ...prev, [remoteHost ? 'p1Y' : 'p2Y']: y }));
        };
        const handleSync = (e: any) => { if (!isHost) setState(e.detail); };

        window.addEventListener('keydown', handleKey);
        window.addEventListener('p2p_game_input', handleP2P);
        window.addEventListener('p2p_game_sync', handleSync);
        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('p2p_game_input', handleP2P);
            window.removeEventListener('p2p_game_sync', handleSync);
        };
    }, [isHost]);

    // Auto-exit
    useEffect(() => {
        if (state.gameStatus === 'ended') {
            const timer = setTimeout(() => { onFinish(); }, 3000);
            return () => clearTimeout(timer);
        }
    }, [state.gameStatus]);

    // Game Loop
    useEffect(() => {
        if (!isHost || state.gameStatus !== 'playing') return;
        const interval = setInterval(() => {
            setState(prev => {
                let { x, y, dx, dy } = prev.ball;
                let { p1, p2 } = prev.score;
                let status = prev.gameStatus;
                let winner = prev.winnerName;

                // Move ball
                x += dx; 
                y += dy;

                // Wall Bounce (Top/Bottom) with clamping
                if (y <= 0) { y = 0; dy = Math.abs(dy); }
                if (y >= 100) { y = 100; dy = -Math.abs(dy); }
                
                // Paddle Physics Constants
                const PADDLE_H_HALF = 12; // Half the height of the paddle in %
                const MAX_SPEED = 2.0;    // Cap speed to prevent tunneling
                const SPEED_INC = 1.05;   // Acceleration per hit
                const MAX_ANGLE = Math.PI / 4; // 45 degrees max deflection

                // Left Paddle (P1) Interaction
                if (dx < 0 && x <= 6 && x >= 2) {
                    if (y >= prev.p1Y - PADDLE_H_HALF && y <= prev.p1Y + PADDLE_H_HALF) {
                        // Calculate relative impact point (-1 to 1)
                        const relativeIntersectY = (prev.p1Y - y) / PADDLE_H_HALF;
                        const bounceAngle = relativeIntersectY * MAX_ANGLE;
                        
                        // Calculate current speed and increase it
                        const currentSpeed = Math.min(Math.sqrt(dx*dx + dy*dy) * SPEED_INC, MAX_SPEED);
                        
                        // New Velocity based on angle
                        dx = Math.abs(currentSpeed * Math.cos(bounceAngle));
                        dy = currentSpeed * -Math.sin(bounceAngle);
                        
                        x = 6.5; // Unstick
                    }
                }

                // Right Paddle (P2) Interaction
                if (dx > 0 && x >= 94 && x <= 98) {
                    if (y >= prev.p2Y - PADDLE_H_HALF && y <= prev.p2Y + PADDLE_H_HALF) {
                        const relativeIntersectY = (prev.p2Y - y) / PADDLE_H_HALF;
                        const bounceAngle = relativeIntersectY * MAX_ANGLE;
                        
                        const currentSpeed = Math.min(Math.sqrt(dx*dx + dy*dy) * SPEED_INC, MAX_SPEED);
                        
                        // Reflect X direction
                        dx = -Math.abs(currentSpeed * Math.cos(bounceAngle));
                        dy = currentSpeed * -Math.sin(bounceAngle);
                        
                        x = 93.5; // Unstick
                    }
                }

                // Score Logic
                if (x < -5) { 
                    p2++; 
                    // Reset
                    x = 50; y = 50; 
                    const serveAngle = (Math.random() * 0.4) - 0.2; // Slight random angle
                    dx = 0.8 * Math.cos(serveAngle); 
                    dy = 0.8 * Math.sin(serveAngle); 
                }
                if (x > 105) { 
                    p1++; 
                    x = 50; y = 50; 
                    const serveAngle = (Math.random() * 0.4) - 0.2;
                    dx = -0.8 * Math.cos(serveAngle); 
                    dy = 0.8 * Math.sin(serveAngle); 
                }

                if (p1 >= 5) { status = 'ended'; winner = p1Name; }
                if (p2 >= 5) { status = 'ended'; winner = p2Name; }

                const next = { ...prev, ball: { x, y, dx, dy }, score: { p1, p2 }, gameStatus: status, winnerName: winner };
                p2p.send({ type: 'GAME_SYNC', payload: next });
                return next;
            });
        }, 16); // ~60 FPS
        return () => clearInterval(interval);
    }, [isHost, state.gameStatus, p1Name, p2Name]);

    const start = () => {
        setState(s => ({ ...s, gameStatus: 'countdown', countdown: 3, score: { p1: 0, p2: 0 } }));
        let c = 3;
        const t = setInterval(() => {
            c--;
            setState(s => ({ ...s, countdown: c }));
            if (c === 0) {
                clearInterval(t);
                // Initial serve
                const dirX = isHost ? 0.8 : -0.8;
                setState(s => ({ ...s, gameStatus: 'playing', ball: { x: 50, y: 50, dx: dirX, dy: 0 } }));
            }
        }, 1000);
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 p-2 rounded-xl relative ring-4 ring-slate-900 shadow-2xl">
            {/* Scoreboard */}
            <div className="flex justify-between text-3xl font-black text-slate-700 mb-2 px-8 select-none">
                <span className="text-indigo-500">{state.score.p1}</span>
                <span className="text-rose-500">{state.score.p2}</span>
            </div>

            {/* Game Field */}
            <div className="flex-1 relative bg-slate-900 rounded-lg border-2 border-slate-800 overflow-hidden shadow-inner mb-2 w-full touch-none">
                {/* Center Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 border-l-2 border-dashed border-slate-800/50 -translate-x-1/2" />
                
                {/* Paddles (Visual h-24 is roughly 24% height, matching logic) */}
                <div className="absolute left-4 w-3 h-24 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-75" style={{ top: `${state.p1Y}%`, transform: 'translateY(-50%)' }} />
                <div className="absolute right-4 w-3 h-24 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all duration-75" style={{ top: `${state.p2Y}%`, transform: 'translateY(-50%)' }} />
                
                {/* Ball */}
                {state.gameStatus === 'playing' && (
                    <div className="absolute w-5 h-5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ left: `${state.ball.x}%`, top: `${state.ball.y}%`, transform: 'translate(-50%, -50%)' }} />
                )}
                
                {/* Intro / Overlay */}
                {state.gameStatus === 'intro' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-4 z-10">
                         <div className="text-white text-xs font-bold uppercase text-center bg-black/50 p-4 rounded-xl border border-white/10">
                            <p className="mb-2">Controls:</p>
                            <p>PC: Arrow Keys</p>
                            <p>Mobile: Big Buttons Below</p>
                            <p className="mt-2 text-yellow-400">First to 5 Wins!</p>
                        </div>
                        <Button onClick={isHost ? start : () => {}} disabled={!isHost} className="!py-4 !px-8 !text-sm scale-110">
                            {isHost ? "START GAME" : "WAITING FOR HOST"}
                        </Button>
                    </div>
                )}
                {state.gameStatus === 'countdown' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className="text-9xl font-black text-white animate-ping">{state.countdown}</span>
                    </div>
                )}
                {state.gameStatus === 'ended' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-10">
                        <Trophy size={64} className="text-amber-400 mb-4 animate-bounce" />
                        <h3 className="text-4xl font-black text-white mb-2 uppercase">{state.winnerName} WINS!</h3>
                    </div>
                )}
            </div>

            {/* PHYSICAL BUTTONS FOR MOBILE - Force visible on small screens */}
            <div className="flex md:hidden h-24 gap-4 mt-2 z-20">
                <button 
                    onTouchStart={(e) => { e.preventDefault(); move(-15); }} 
                    onMouseDown={(e) => { e.preventDefault(); move(-15); }}
                    className="flex-1 bg-slate-800 rounded-2xl flex items-center justify-center active:bg-indigo-600 active:scale-95 transition-all border-b-4 border-slate-950 shadow-lg"
                >
                    <ChevronUp size={40} className="text-white"/>
                </button>
                <button 
                    onTouchStart={(e) => { e.preventDefault(); move(15); }} 
                    onMouseDown={(e) => { e.preventDefault(); move(15); }}
                    className="flex-1 bg-slate-800 rounded-2xl flex items-center justify-center active:bg-indigo-600 active:scale-95 transition-all border-b-4 border-slate-950 shadow-lg"
                >
                    <ChevronDown size={40} className="text-white"/>
                </button>
            </div>
            <div className="hidden md:block text-center text-slate-500 text-xs font-bold uppercase py-2">Use Arrow Keys</div>
        </div>
    );
};

// 2. SKETCHPAD
const Sketchpad = ({ onSend, onClose }: any) => {
    const cvs = useRef<HTMLCanvasElement>(null);
    const [draw, setDraw] = useState(false);
    const [col, setCol] = useState('#7c3aed');

    useEffect(() => {
        const c = cvs.current;
        if (c) {
            c.width = c.clientWidth;
            c.height = c.clientHeight;
            const ctx = c.getContext('2d');
            if (ctx) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; }
        }
    }, []);

    const pos = (e: any) => {
        const r = cvs.current!.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - r.left, y: t.clientY - r.top };
    };

    const start = (e: any) => {
        setDraw(true);
        const { x, y } = pos(e);
        const ctx = cvs.current!.getContext('2d')!;
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const move = (e: any) => {
        if (!draw) return;
        const { x, y } = pos(e);
        const ctx = cvs.current!.getContext('2d')!;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4 justify-center">
            <div className="bg-white dark:bg-slate-900 rounded-2xl flex flex-col h-[70vh] overflow-hidden">
                <canvas 
                    ref={cvs} className="flex-1 touch-none bg-white cursor-crosshair"
                    onMouseDown={start} onMouseMove={move} onMouseUp={() => setDraw(false)}
                    onTouchStart={start} onTouchMove={move} onTouchEnd={() => setDraw(false)}
                />
                <div className="p-4 border-t dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <div className="flex gap-2">
                        {['#7c3aed', '#ef4444', '#10b981', '#000000'].map(c => (
                            <button key={c} onClick={() => setCol(c)} className={`w-8 h-8 rounded-full border-2 ${col === c ? 'border-slate-500' : 'border-transparent'}`} style={{background: c}} />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button onClick={() => onSend(cvs.current!.toDataURL())}>Send</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP ---
export default function App() {
    // Global State
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<'auth' | 'home' | 'space'>('auth');
    
    // Data State
    const [friends, setFriends] = useState<Friend[]>([]);
    const [inbox, setInbox] = useState<InboxItem[]>([]);
    
    // Space State
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [spaceName, setSpaceName] = useState('My Space');
    const [activeTab, setActiveTab] = useState<'chat' | 'game' | 'music' | 'settings'>('chat');
    const [messages, setMessages] = useState<Message[]>([]);
    const [musicList, setMusicList] = useState<MusicItem[]>([]);
    
    // Chat UI State
    const [input, setInput] = useState('');
    const [isRec, setIsRec] = useState(false);
    const [showSketch, setShowSketch] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Media Drafts (Previews)
    const [imageDraft, setImageDraft] = useState<string | null>(null);
    const [voiceDraft, setVoiceDraft] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        const u = p2p.user;
        if (u) {
            setUser(u);
            setFriends(safeJson('duo_friends', []));
            setInbox(safeJson('duo_inbox', []));
            
            // Check for return to space
            const savedRoom = localStorage.getItem('duo_active_room');
            if (savedRoom) {
                setActiveRoomId(savedRoom);
                setSpaceName(localStorage.getItem('duo_active_room_name') || 'DuoSpace');
            }
            setView('home');
        }
    }, []);

    // Persist Data
    useEffect(() => { if (friends.length) saveJson('duo_friends', friends); }, [friends]);
    useEffect(() => { if (inbox.length) saveJson('duo_inbox', inbox); }, [inbox]);

    // P2P Listeners
    useEffect(() => {
        if (!user) return;
        p2p.init({
            onInbox: (item: InboxItem) => setInbox(prev => [...prev, item]),
            onFriendUpdate: (u: User) => {
                setFriends(prev => {
                    if (prev.find(f => f.id === u.id)) return prev;
                    return [...prev, { id: u.id, username: u.username, status: 'online' }];
                });
                setToast(`${u.username} is now your friend!`);
            },
            onMessage: (msg: Message) => {
                setMessages(prev => [...prev, msg]);
                if (msg.type === 'music' && msg.music_item) setMusicList(prev => [msg.music_item!, ...prev]);
            },
            onMessageUpdate: ({ id, action, content }: any) => {
                setMessages(prev => {
                    if (action === 'delete') return prev.filter(m => m.id !== id);
                    if (action === 'edit') return prev.map(m => m.id === id ? { ...m, content, isEdited: true } : m);
                    return prev;
                });
            },
            onRoomJoined: (hostId: string) => {
                setActiveRoomId(hostId);
                setSpaceName('DuoSpace');
                localStorage.setItem('duo_active_room', hostId);
                localStorage.setItem('duo_active_room_name', 'DuoSpace');
                setView('space');
                setMessages([]);
                setMusicList([]);
            },
            onLeave: () => {
                // Peer disconnected
            }
        });

        const handleMusic = (e: any) => setMusicList(prev => [e.detail, ...prev]);
        window.addEventListener('p2p_music_add', handleMusic);
        return () => window.removeEventListener('p2p_music_add', handleMusic);
    }, [user]);

    // Actions
    const handleLogin = (u: User) => { setUser(u); setView('home'); };
    
    const createSpace = (name: string) => {
        p2p.createRoom(); 
        setSpaceName(name);
        setActiveRoomId(user!.id);
        localStorage.setItem('duo_active_room', user!.id);
        localStorage.setItem('duo_active_room_name', name);
        setView('space');
    };

    const enterSpace = () => {
        if (activeRoomId) {
             if (activeRoomId !== user?.id) p2p.joinRoom(activeRoomId); // Reconnect if guest
             else p2p.createRoom(); // Rehost if host
             setView('space');
        }
    };

    const leaveSpace = () => {
        p2p.leaveRoom();
        setActiveRoomId(null);
        localStorage.removeItem('duo_active_room');
        localStorage.removeItem('duo_active_room_name');
        setMessages([]);
        setMusicList([]);
        setView('home'); 
    };

    const fullLogout = () => {
        p2p.leaveRoom();
        setActiveRoomId(null);
        localStorage.removeItem('duo_active_room');
        localStorage.clear(); 
        window.location.reload(); 
    };

    const sendMessage = async (type: Message['type'] = 'text', content?: string, extra?: any) => {
        if (!user) return;
        
        let finalContent = content || input;
        
        // Edit Logic
        if (editingId && type === 'text') {
            setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: finalContent, isEdited: true } : m));
            p2p.send({ type: 'MSG_UPDATE', payload: { id: editingId, action: 'edit', content: finalContent } });
            setEditingId(null);
            setInput('');
            setReplyTo(null);
            return;
        }

        // AI Check
        if (type === 'text' && finalContent.includes('@AI') && user.settings.aiEnabled) {
             const aiReply = await AI.getAiResponse(finalContent.replace('@AI', ''), messages);
             const aiMsg: Message = { id: Date.now().toString(), sender_id: 'ai', sender_name: 'AI', content: aiReply, timestamp: Date.now(), type: 'ai' };
             setMessages(prev => [...prev, aiMsg]);
             p2p.send({ type: 'CHAT', msg: aiMsg });
        }

        const msg: Message = {
            id: Date.now().toString(),
            sender_id: user.id,
            sender_name: user.username,
            content: type === 'text' ? finalContent : undefined,
            media_url: (type === 'image' || type === 'voice' || type === 'sketch') ? content : undefined,
            music_item: type === 'music' ? extra : undefined,
            type,
            timestamp: Date.now(),
            replyTo: replyTo ? { id: replyTo.id, sender: replyTo.sender_name, content: replyTo.content || 'Media' } : undefined
        };

        p2p.send({ type: 'CHAT', msg });
        setMessages(prev => [...prev, msg]);
        if (type === 'music') {
            setMusicList(prev => [extra, ...prev]);
            p2p.send({ type: 'MUSIC_ADD', payload: extra });
        }
        
        // Clean up
        setInput('');
        setReplyTo(null);
        setImageDraft(null);
        setVoiceDraft(null);
    };

    const deleteMessage = (id: string) => {
        setMessages(prev => prev.filter(m => m.id !== id));
        p2p.send({ type: 'MSG_UPDATE', payload: { id, action: 'delete' } });
    };

    // Voice & Image Handling with Preview
    const handleVoiceRecord = async () => {
        if (!isRec) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                const chunks: any[] = [];
                mediaRecorder.ondataavailable = e => chunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => setVoiceDraft(reader.result as string);
                    reader.readAsDataURL(blob);
                    stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                (window as any).rec = mediaRecorder;
                setIsRec(true);
            } catch (e) {
                setToast("Microphone access required");
            }
        } else {
            (window as any).rec.stop();
            setIsRec(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files?.[0]) {
            const r = new FileReader();
            r.onload = () => setImageDraft(r.result as string);
            r.readAsDataURL(e.target.files[0]);
        }
    };

    // --- VIEWS ---

    if (view === 'auth') return (
        <div className="h-full flex items-center justify-center p-6 bg-vibe">
            <Card className="w-full max-w-sm !p-10 space-y-6 text-center animate-slide-up">
                <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center text-vibe-primary"><Zap size={40} fill="currentColor"/></div>
                <h1 className="text-3xl font-black uppercase">DuoSpace</h1>
                <Input id="username" placeholder="Username" className="text-center !text-lg !py-4" />
                <Button onClick={() => {
                    const el = document.getElementById('username') as HTMLInputElement;
                    if(el.value) p2p.register(el.value).then(handleLogin);
                }} className="w-full !py-4">CREATE ACCOUNT</Button>
            </Card>
        </div>
    );

    if (view === 'home') return (
        <div className={`h-full w-full transition-colors ${user?.settings.darkMode ? 'dark bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full">
                {toast && <div className="fixed top-4 left-0 right-0 flex justify-center z-50"><div className="bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2">{toast}</div></div>}
                
                <header className="flex justify-between items-center py-6">
                    <div>
                        <h1 className="text-2xl font-black uppercase">{user?.username}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">My Code: {user?.id}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(user!.id); setToast('Code copied!'); }}><Copy className="text-vibe-primary"/></button>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <Card className="!p-8 space-y-6 border-2 border-vibe-primary/20">
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 bg-vibe rounded-2xl mx-auto flex items-center justify-center text-white"><Zap size={28} fill="currentColor"/></div>
                                    <h2 className="text-lg font-black uppercase">{activeRoomId ? 'Active Session' : 'Start a Space'}</h2>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{activeRoomId ? 'Return to your private world' : 'Your private world awaits'}</p>
                                </div>
                                {activeRoomId ? (
                                    <Button onClick={enterSpace} className="w-full !py-4">RETURN TO SPACE</Button>
                                ) : (
                                    <div className="space-y-4">
                                        <Input id="spaceName" placeholder="Name your space..." className="text-center"/>
                                        <Button onClick={() => {
                                            const el = document.getElementById('spaceName') as HTMLInputElement;
                                            createSpace(el.value || 'My Space');
                                        }} className="w-full !py-4">CREATE DUOSPACE</Button>
                                    </div>
                                )}
                            </Card>

                            {inbox.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase text-slate-500">Inbox</h3>
                                    {inbox.map((item, i) => (
                                        <div key={i} className="p-4 bg-white dark:bg-slate-800 rounded-xl flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="text-xs font-bold">{item.type === 'friend_request' ? 'Friend Request' : 'Space Invite'}</p>
                                                <p className="text-[10px] uppercase text-slate-400">From {item.fromUser.username}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => {
                                                    if (item.type === 'friend_request') {
                                                        if(p2p.acceptFriend(item.fromUser.id)) {
                                                            setFriends(prev => [...prev, {id: item.fromUser.id, username: item.fromUser.username, status: 'online'}]);
                                                        }
                                                    } else if (item.roomId) {
                                                        setActiveRoomId(item.roomId);
                                                        setSpaceName(item.roomName || 'DuoSpace');
                                                        localStorage.setItem('duo_active_room', item.roomId);
                                                        localStorage.setItem('duo_active_room_name', item.roomName || 'DuoSpace');
                                                        p2p.joinRoom(item.roomId);
                                                    }
                                                    setInbox(prev => prev.filter((_, idx) => idx !== i));
                                                }} className="!py-1 !px-3">Accept</Button>
                                                <button onClick={() => setInbox(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500"><XCircle size={20}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase text-slate-500">Friends</h3>
                            <div className="flex gap-2 mb-4">
                                <Input id="friendCode" placeholder="Paste friend code..." className="!py-3" />
                                <Button onClick={() => {
                                    const el = document.getElementById('friendCode') as HTMLInputElement;
                                    if(el.value) { p2p.sendFriendRequest(el.value); el.value = ''; setToast('Request Sent'); }
                                }}>ADD</Button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {friends.map(f => (
                                    <div key={f.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl flex justify-between items-center shadow-sm">
                                        <span className="font-bold text-sm">{f.username}</span>
                                        <Badge color="bg-emerald-100 text-emerald-600">FRIEND</Badge>
                                    </div>
                                ))}
                            </div>
                            {friends.length === 0 && (
                                <div className="text-center p-8 border-2 border-dashed border-slate-700/20 rounded-xl">
                                    <p className="text-slate-400 font-bold text-xs uppercase">No friends yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="py-4 flex justify-center">
                    <Button variant="danger" onClick={fullLogout} className="w-full md:w-auto md:px-12">LOG OUT</Button>
                </div>
            </div>
        </div>
    );

    // --- SPACE VIEW ---
    return (
        <div className={`h-full flex flex-col ${user?.settings.darkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} theme-${user?.settings.theme}`}>
            {toast && <div className="fixed top-16 left-0 right-0 flex justify-center z-50 pointer-events-none"><div className="bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-2">{toast}</div></div>}

            {/* HEADER */}
            <div className="h-16 flex items-center justify-between px-4 border-b dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={leaveSpace} className="!p-2"><ArrowLeft size={20}/></Button>
                    <div>
                        <h2 className="text-sm font-black uppercase">{spaceName}</h2>
                        {user?.settings.showLastSeen && (
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
                                <span className="text-[9px] font-bold uppercase text-slate-400">Live</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => {
                        friends.forEach(f => p2p.inviteToRoom(f.id, spaceName));
                        setToast("Invites sent to friends!");
                    }} className="p-2 bg-vibe text-white rounded-xl shadow-lg shadow-vibe/20"><UserPlus size={18}/></button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-hidden relative">
                
                {activeTab === 'chat' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(m => (
                                <div key={m.id} className={`flex flex-col ${m.sender_id === user?.id ? 'items-end' : 'items-start'} animate-message-pop group`}>
                                    {m.replyTo && (
                                        <div className={`text-[10px] text-slate-400 mb-1 px-2 border-l-2 border-slate-300 dark:border-slate-700 ${m.sender_id === user?.id ? 'mr-2 text-right' : 'ml-2 text-left'}`}>
                                            <span className="font-bold">{m.replyTo.sender}</span>: {m.replyTo.content.substring(0, 30)}...
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2 max-w-[85%]">
                                        {/* Actions Menu */}
                                        {m.sender_id === user?.id && (
                                            <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
                                                {m.type === 'text' && <button onClick={() => { setEditingId(m.id); setInput(m.content || ''); }} className="p-1 text-slate-400 hover:text-sky-500"><Edit2 size={12}/></button>}
                                                <button onClick={() => deleteMessage(m.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 size={12}/></button>
                                            </div>
                                        )}
                                        
                                        <div 
                                            onClick={() => setReplyTo(m)}
                                            className={`p-3 rounded-2xl text-sm font-bold shadow-sm cursor-pointer active:scale-95 transition-transform relative ${m.sender_id === user?.id ? 'bg-vibe text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 rounded-tl-none border dark:border-white/5'}`}
                                        >
                                            {m.type === 'text' && m.content}
                                            {m.type === 'ai' && <div className="flex gap-2"><Bot size={16}/> {m.content}</div>}
                                            {m.type === 'image' && <img src={m.media_url} className="rounded-lg max-w-full" />}
                                            {m.type === 'sketch' && <img src={m.media_url} className="rounded-lg max-w-full bg-white" />}
                                            {m.type === 'voice' && (
                                                <button onClick={(e) => { e.stopPropagation(); new Audio(m.media_url).play(); }} className="flex items-center gap-2">
                                                    <Play size={16} fill="currentColor"/> Voice Note
                                                </button>
                                            )}
                                            {m.type === 'music' && m.music_item && (
                                                <div className="flex items-center gap-3 min-w-[180px]">
                                                    <div className="w-8 h-8 bg-black/20 rounded-lg flex items-center justify-center"><Music2 size={16}/></div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="truncate text-xs">{m.music_item.title || m.music_item.url}</div>
                                                        <div className="text-[8px] opacity-70 uppercase">Tap Music Tab</div>
                                                    </div>
                                                </div>
                                            )}
                                            {m.isEdited && <span className="absolute -bottom-3 right-0 text-[7px] text-slate-400 font-bold uppercase">Edited</span>}
                                        </div>

                                        {m.sender_id !== user?.id && (
                                            <button onClick={() => setReplyTo(m)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-vibe-primary"><Reply size={14}/></button>
                                        )}
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase mx-1">
                                        {m.sender_name} 
                                        {user?.settings.readReceipts && m.sender_id === user?.id && <span className="ml-1 text-emerald-500">Sent</span>}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* INPUT AREA */}
                        <div className="p-3 bg-white dark:bg-slate-900 border-t dark:border-white/10 z-20">
                            {/* DRAFT PREVIEWS */}
                            {imageDraft && (
                                <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl relative animate-slide-up">
                                    <img src={imageDraft} className="h-32 rounded-lg object-contain mx-auto" />
                                    <div className="flex gap-2 mt-2 justify-center">
                                        <Button variant="secondary" onClick={() => setImageDraft(null)}>Cancel</Button>
                                        <Button onClick={() => sendMessage('image', imageDraft)}>Send Photo</Button>
                                    </div>
                                </div>
                            )}

                            {voiceDraft && (
                                <div className="mb-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col items-center gap-2 animate-slide-up">
                                    <div className="flex items-center gap-4 w-full justify-center">
                                        <button onClick={() => new Audio(voiceDraft).play()} className="p-3 bg-vibe text-white rounded-full"><Play size={20}/></button>
                                        <div className="h-1 bg-slate-300 dark:bg-slate-600 w-full rounded-full"/>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <Button variant="secondary" className="flex-1" onClick={() => setVoiceDraft(null)}>Discard</Button>
                                        <Button className="flex-1" onClick={() => sendMessage('voice', voiceDraft)}>Send Voice</Button>
                                    </div>
                                </div>
                            )}

                            {replyTo && (
                                <div className="flex justify-between items-center mb-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border-l-4 border-vibe-primary">
                                    <div className="text-xs">
                                        <span className="font-bold text-vibe-primary">Replying to {replyTo.sender_name}</span>
                                        <div className="truncate text-slate-500 max-w-[200px]">{replyTo.content || 'Media'}</div>
                                    </div>
                                    <button onClick={() => setReplyTo(null)}><XCircle size={16} className="text-slate-400"/></button>
                                </div>
                            )}
                             {editingId && (
                                <div className="flex justify-between items-center mb-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg border-l-4 border-sky-500">
                                    <span className="text-xs font-bold text-sky-500">Editing Message...</span>
                                    <button onClick={() => { setEditingId(null); setInput(''); }}><XCircle size={16} className="text-slate-400"/></button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowSketch(true)} className="p-2 text-slate-400 hover:text-vibe-primary"><PenTool size={20}/></button>
                                <label className="p-2 text-slate-400 hover:text-vibe-primary cursor-pointer">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect}/>
                                    <ImageIcon size={20}/>
                                </label>
                                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." className="!rounded-full !py-3" onKeyDown={e => e.key === 'Enter' && sendMessage()}/>
                                <button onClick={() => sendMessage()} className="p-3 bg-vibe text-white rounded-full shadow-lg active:scale-95"><Send size={18}/></button>
                                <button onClick={handleVoiceRecord} className={`p-3 rounded-full transition-colors active:scale-95 ${isRec ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    {isRec ? <StopCircle size={18}/> : <Mic size={18}/>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'game' && (
                    <div className="h-full p-2 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-hidden">
                            <PongGame 
                                isHost={p2p.isHostMode} 
                                p1Name={user?.username || 'P1'} 
                                p2Name="Guest" 
                                onFinish={() => setActiveTab('chat')}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'music' && (
                    <div className="h-full p-4 flex flex-col space-y-4">
                        <div className="flex gap-2">
                            <Input id="musicLink" placeholder="Paste song link..." className="!py-3" />
                            <Button onClick={() => {
                                const el = document.getElementById('musicLink') as HTMLInputElement;
                                if(el.value) {
                                    const item = { id: Date.now().toString(), url: el.value, addedBy: user!.username, timestamp: Date.now(), title: 'Shared Song' };
                                    sendMessage('music', undefined, item);
                                    el.value = '';
                                }
                            }}>SHARE</Button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {musicList.map((item, i) => (
                                <Card key={i} className="!p-4 flex items-center gap-4 animate-slide-up">
                                    <div className="w-12 h-12 bg-vibe-soft rounded-xl flex items-center justify-center text-vibe-primary"><Music2/></div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-bold text-sm truncate">{item.title || item.url}</div>
                                        <div className="text-[10px] font-bold uppercase text-slate-400">Added by {item.addedBy}</div>
                                    </div>
                                    <a href={item.url} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><Play size={16}/></a>
                                </Card>
                            ))}
                            {musicList.length === 0 && <div className="text-center opacity-30 font-bold uppercase mt-10">No music shared yet</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                     <div className="h-full p-6 overflow-y-auto">
                        <h3 className="text-xl font-black uppercase mb-6">Space Settings</h3>
                        <div className="space-y-6">
                            <Card className="flex justify-between items-center !p-4">
                                <span className="font-bold uppercase text-xs">Dark Mode</span>
                                <button onClick={() => {
                                    const u = { ...user!, settings: { ...user!.settings, darkMode: !user!.settings.darkMode } };
                                    setUser(u); localStorage.setItem('duospace_user_v6', JSON.stringify(u));
                                }}>{user!.settings.darkMode ? <Moon size={20}/> : <Sun size={20}/>}</button>
                            </Card>
                             <Card className="flex justify-between items-center !p-4">
                                <span className="font-bold uppercase text-xs">AI Assistant (@AI)</span>
                                <button onClick={() => {
                                    const u = { ...user!, settings: { ...user!.settings, aiEnabled: !user!.settings.aiEnabled } };
                                    setUser(u); localStorage.setItem('duospace_user_v6', JSON.stringify(u));
                                }} className={`w-12 h-6 rounded-full p-1 transition-colors ${user!.settings.aiEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${user!.settings.aiEnabled ? 'translate-x-6' : ''}`} />
                                </button>
                            </Card>
                            <Card className="flex justify-between items-center !p-4">
                                <span className="font-bold uppercase text-xs">Read Receipts</span>
                                <button onClick={() => {
                                    const u = { ...user!, settings: { ...user!.settings, readReceipts: !user!.settings.readReceipts } };
                                    setUser(u); localStorage.setItem('duospace_user_v6', JSON.stringify(u));
                                }} className={`w-12 h-6 rounded-full p-1 transition-colors ${user!.settings.readReceipts ? 'bg-vibe' : 'bg-slate-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${user!.settings.readReceipts ? 'translate-x-6' : ''}`} />
                                </button>
                            </Card>
                             <Card className="flex justify-between items-center !p-4">
                                <span className="font-bold uppercase text-xs">Show Last Seen</span>
                                <button onClick={() => {
                                    const u = { ...user!, settings: { ...user!.settings, showLastSeen: !user!.settings.showLastSeen } };
                                    setUser(u); localStorage.setItem('duospace_user_v6', JSON.stringify(u));
                                }} className={`w-12 h-6 rounded-full p-1 transition-colors ${user!.settings.showLastSeen ? 'bg-vibe' : 'bg-slate-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${user!.settings.showLastSeen ? 'translate-x-6' : ''}`} />
                                </button>
                            </Card>
                            <div>
                                <p className="font-bold uppercase text-xs mb-3 text-slate-500">Vibe Selector</p>
                                <div className="flex gap-3">
                                    {['violet', 'rose', 'emerald', 'sky', 'amber'].map(c => (
                                        <button key={c} onClick={() => {
                                            const u = { ...user!, settings: { ...user!.settings, theme: c as any } };
                                            setUser(u); localStorage.setItem('duospace_user_v6', JSON.stringify(u));
                                        }} className={`w-10 h-10 rounded-full border-4 ${user!.settings.theme === c ? 'border-slate-400' : 'border-transparent'}`} style={{background: `var(--theme-${c})`, backgroundColor: c === 'violet' ? '#7c3aed' : c === 'rose' ? '#f43f5e' : c === 'emerald' ? '#10b981' : c === 'sky' ? '#0ea5e9' : '#f59e0b'}}/>
                                    ))}
                                </div>
                            </div>
                            <Button variant="secondary" onClick={leaveSpace} className="w-full !py-4 mb-2 mt-8">LEAVE SPACE (RETURN HOME)</Button>
                            <Button variant="danger" onClick={fullLogout} className="w-full !py-4">LOG OUT COMPLETELY</Button>
                        </div>
                     </div>
                )}
            </div>

            {/* BOTTOM TABS */}
            <div className="h-20 bg-white dark:bg-slate-900 border-t dark:border-white/10 flex justify-around items-center px-2 pb-2">
                {[
                    { id: 'chat', icon: MessageCircle, label: 'Chat' },
                    { id: 'game', icon: Gamepad2, label: 'Game' },
                    { id: 'music', icon: Music2, label: 'Music' },
                    { id: 'settings', icon: Settings, label: 'Settings' }
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex flex-col items-center gap-1 transition-all w-16 ${activeTab === t.id ? 'text-vibe-primary -translate-y-2' : 'text-slate-400'}`}>
                        <div className={`p-3 rounded-2xl ${activeTab === t.id ? 'bg-vibe text-white shadow-lg shadow-vibe/30' : ''}`}><t.icon size={24}/></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* OVERLAYS */}
            {showSketch && <Sketchpad onSend={(d: string) => { sendMessage('sketch', d); setShowSketch(false); }} onClose={() => setShowSketch(false)} />}
        </div>
    );
}
