import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Send, Gamepad2, LogOut, Plus, ArrowLeft, 
  Search, User as UserIcon, Zap, MessageCircle, Bell, UserPlus, 
  CheckCircle2, Rocket, Waves, XCircle, Settings, Image as ImageIcon,
  Mic, MicOff, Moon, Sun, ShieldCheck, Users, Palette, Radio, Share2,
  LayoutGrid, Users2, Trash2, Power, PlugZap, Music2, PenTool, Eraser, MoreVertical, Edit2, Play, Pause, ExternalLink, ListMusic, Eye, EyeOff, Activity, Trophy, StopCircle,
  ChevronUp, ChevronDown, PlayCircle, Copy
} from 'lucide-react';
import { p2p } from './services/peerService'; 
import { User, Message, Friend, ThemeColor, PlaylistItem, RoomSettings, PongState } from './types';
import { Button, Input, Card, Badge } from './components/Common';
import * as AI from './services/geminiService';

// --- UTILS ---
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const scale = Math.min(1, 800 / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

const getLinkMetadata = (text: string): { url: string, type: 'youtube' | 'spotify' | 'apple' | 'generic', id?: string } | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    if (!match) return null;
    const url = match[0];
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = url.match(/(?:v=|be\/)([\w-]{11})/)?.[1];
        return { url, type: 'youtube', id };
    }
    if (url.includes('spotify.com')) return { url, type: 'spotify' };
    if (url.includes('music.apple.com')) return { url, type: 'apple' };
    
    return null;
};

// --- MAIN APP ---
const App = () => {
  const [user, setUser] = useState<User | null>(p2p.user);
  const [view, setView] = useState<'auth' | 'dash' | 'room'>('auth');
  const [friends, setFriends] = useState<Friend[]>(() => JSON.parse(localStorage.getItem('duospace_friends_v5') || '[]'));
  const [inbox, setInbox] = useState<any[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [status, setStatus] = useState('offline');
  const [activeSessions, setActiveSessions] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});
  const [isHostingSession, setIsHostingSession] = useState(false);

  useEffect(() => {
    if (user) {
        p2p.init({
            onMessage: (m) => {
                window.dispatchEvent(new CustomEvent('p2p_msg', { detail: m }));
                setChatHistory(prev => {
                    const sessionId = p2p.isHostMode ? 'host' : m.sender_id; 
                    const existing = prev[sessionId] || [];
                    if (existing.some(msg => msg.id === m.id)) return prev;
                    return { ...prev, [sessionId]: [...existing, m] };
                });
            },
            onStatus: setStatus,
            onInbox: (req) => setInbox(prev => [...prev, req]),
            onConnectionsChanged: (conns) => setActiveSessions(conns),
            onFriendAdded: (f) => {
                setFriends(prev => {
                    if (prev.find(existing => existing.id === f.id)) return prev;
                    const next = [...prev, { id: f.id, username: f.username, status: 'online' }];
                    localStorage.setItem('duospace_friends_v5', JSON.stringify(next));
                    return next;
                });
            }
        });
        if (view === 'auth') setView('dash');
    }
  }, [user]);

  const updateUserSettings = (newSettings: Partial<User['settings']>) => {
      if (!user) return;
      const updatedUser = { ...user, settings: { ...user.settings, ...newSettings } };
      setUser(updatedUser);
      localStorage.setItem('duospace_user_v5', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
      if (confirm("Disconnect?")) {
          localStorage.removeItem('duospace_user_v5');
          p2p.destroy();
          setUser(null);
          setView('auth');
          setIsHostingSession(false);
      }
  };

  const getCurrentSessionId = () => !activeFriend ? 'host' : activeFriend.id;

  const updateHistory = (msg: Message) => {
      const sid = getCurrentSessionId();
      setChatHistory(prev => {
          const list = prev[sid] || [];
          if (list.some(m => m.id === msg.id)) return prev;
          return { ...prev, [sid]: [...list, msg] };
      });
  };

  if (!user) return <Auth onLogin={setUser} />;
  
  return (
    <div className={`h-full flex flex-col transition-colors duration-500 theme-${user.settings.theme} ${user.settings.darkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} overflow-hidden`}>
        {view === 'dash' && (
            <Dashboard 
                user={user} 
                friends={friends} 
                inbox={inbox} 
                setInbox={setInbox} 
                setView={setView} 
                setActiveFriend={setActiveFriend}
                updateSettings={updateUserSettings}
                setFriends={setFriends}
                onLogout={handleLogout}
                activeSessions={activeSessions}
                isHostingSession={isHostingSession}
                setIsHostingSession={setIsHostingSession}
            />
        )}
        {view === 'room' && (
            <Room 
                user={user} 
                friend={activeFriend} 
                friendsList={friends}
                initialMessages={chatHistory[getCurrentSessionId()] || []}
                onUpdateHistory={updateHistory}
                onBack={() => {
                    setView('dash');
                    setActiveFriend(null);
                }}
                onLeave={() => {
                    if (activeFriend) {
                        p2p.disconnectPeer(activeFriend.id);
                    } else {
                        // If host, fully disconnect and reset hosting state
                        p2p.disconnect();
                        setIsHostingSession(false);
                    }
                    setChatHistory(prev => ({ ...prev, [getCurrentSessionId()]: [] }));
                    setView('dash');
                    setActiveFriend(null);
                }}
            />
        )}
    </div>
  );
};

const Auth = ({ onLogin }: { onLogin: (u: User) => void }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!name.trim()) return setError("Name required");
        setLoading(true);
        setError(null);
        try {
            const user = await p2p.register(name);
            onLogin(user);
        } catch (e: any) {
            setError(e.message || "Registration Failed");
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-vibe">
            <Card className="w-full max-w-lg !p-8 space-y-6 animate-slide-up shadow-2xl !rounded-2xl border-4 border-white/20">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-vibe-primary shadow-xl rotate-3">
                        <Heart size={32} fill="currentColor"/>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter">DuoSpace</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Personal Dimensional Bridge</p>
                    </div>
                </div>
                <Input 
                    value={name} 
                    onChange={e => { setName(e.target.value); setError(null); }} 
                    placeholder="Choose Identity..." 
                    className="!py-4 !text-xl !rounded-2xl" 
                    error={error || undefined}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <Button 
                    onClick={handleLogin} 
                    isLoading={loading}
                    className="w-full !py-4 !text-lg !rounded-2xl"
                >
                    Enter Nexus
                </Button>
            </Card>
        </div>
    );
};

const Dashboard = ({ user, friends, inbox, setInbox, setView, setActiveFriend, updateSettings, setFriends, onLogout, activeSessions, isHostingSession, setIsHostingSession }: any) => {
    const [search, setSearch] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [mobileTab, setMobileTab] = useState<'portal' | 'friends'>('portal');

    const handleAction = (req: any, index: number) => {
        if (req.type === 'room') {
            setActiveFriend(req.user);
            p2p.connectToRoom(req.user.id);
            setView('room');
        } else if (req.type === 'friend_request') {
            p2p.confirmFriendReq(req.user);
        }
        setInbox(inbox.filter((_: any, i: number) => i !== index));
    };

    const handleRemoveFriend = (friendId: string) => {
        if (confirm("Remove friend?")) {
            setFriends((prev: Friend[]) => {
                const updated = prev.filter(f => f.id !== friendId);
                localStorage.setItem('duospace_friends_v5', JSON.stringify(updated));
                return updated;
            });
            if (activeSessions.includes(friendId)) p2p.disconnectPeer(friendId);
        }
    };

    const handleCreateOrResume = () => {
        if (isHostingSession) {
            setActiveFriend(null);
            setView('room');
        } else {
            setIsHostingSession(true);
            setActiveFriend(null);
            setView('room');
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden relative">
            <aside className={`${mobileTab === 'friends' ? 'flex' : 'hidden'} md:flex w-full md:w-[320px] lg:w-[400px] border-r dark:border-slate-800 flex-col shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md h-full pb-20 md:pb-0`}>
                <div className="p-4 border-b dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-vibe">DuoSpace</h2>
                            <Badge color="bg-emerald-500/10 text-emerald-500 font-black">@{user.username}</Badge>
                        </div>
                        <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90">
                            <Settings size={20} />
                        </button>
                    </div>
                    {/* User Code Display */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => navigator.clipboard.writeText(user.id)}>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Your Signal Code</span>
                            <span className="font-mono text-sm font-bold text-vibe-primary truncate">{user.id}</span>
                        </div>
                        <div className="p-2 text-slate-400 group-hover:text-vibe-primary transition-colors">
                            <Copy size={16}/>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto no-scrollbar">
                    {friends.map((f: Friend) => {
                        const isActive = activeSessions.includes(f.id);
                        return (
                            <div key={f.id} className="p-2.5 flex items-center justify-between bg-white/50 dark:bg-slate-800/50 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-vibe/20">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-900 text-slate-400'}`}>
                                        <UserIcon size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{f.username}</h4>
                                        {isActive && <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest leading-none mt-0.5">Active</p>}
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveFriend(f.id); }} 
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                    title="Remove Friend"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        );
                    })}
                    {friends.length === 0 && <div className="text-center py-8 opacity-20"><Users size={32} className="mx-auto"/><p className="text-[10px] font-black uppercase mt-2">No Partners</p></div>}
                </div>

                <div className="p-4 bg-white/20 dark:bg-black/20 border-t dark:border-slate-800">
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Add Friend Code..." icon={<UserPlus size={16}/>} onIconClick={() => { p2p.sendFriendRequest(search); setSearch(''); }} className="!rounded-xl" />
                </div>
            </aside>

            <main className={`${mobileTab === 'portal' ? 'flex' : 'hidden'} md:flex flex-1 p-4 md:p-10 flex-col items-center justify-center relative bg-slate-100/50 dark:bg-slate-950/50 pb-24 md:pb-10 overflow-y-auto`}>
                <div className="max-w-2xl w-full space-y-6">
                    {activeSessions.length > 0 && (
                        <div className="w-full space-y-2 animate-slide-up">
                            <div className="flex items-center gap-2 px-1 text-slate-400">
                                <Activity size={16} />
                                <span className="text-xs font-black uppercase tracking-widest">Active Rooms</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {activeSessions.map((peerId: string) => {
                                    const friend = friends.find((f: Friend) => f.id === peerId);
                                    const label = p2p.isHostMode ? `Hosting: Connected Peer` : `Connected to: ${friend?.username || peerId}`;
                                    return (
                                        <div key={peerId} onClick={() => { 
                                            setActiveFriend(p2p.isHostMode ? null : friend || { id: peerId, username: peerId, status: 'online' });
                                            setView('room');
                                        }} className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl shadow-lg border-l-4 border-l-emerald-500 cursor-pointer hover:scale-[1.01] transition-transform">
                                            <div>
                                                <h4 className="font-black text-sm">{label}</h4>
                                                <p className="text-[10px] text-emerald-500 font-bold uppercase mt-0.5">Live Connection</p>
                                            </div>
                                            <Button className="!py-1.5 !px-3 !text-[10px]">Resume</Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 text-center pt-4">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter dark:text-white">Portal Hub.</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={handleCreateOrResume} className="text-left group outline-none w-full">
                            <Card className={`!p-6 h-full space-y-4 shadow-xl !rounded-2xl relative overflow-hidden transition-all ${isHostingSession ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white dark:bg-slate-900 hover:border-vibe'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform ${isHostingSession ? 'bg-white text-emerald-600' : 'bg-vibe text-white'}`}>
                                    {isHostingSession ? <Radio size={24}/> : <Plus size={24}/>}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">{isHostingSession ? "Already in a room" : "Create Room"}</h3>
                                    <p className={`text-xs font-bold ${isHostingSession ? 'text-white/80' : 'text-slate-400'}`}>{isHostingSession ? "Resume Host Session" : "Initialize Host Mode"}</p>
                                </div>
                            </Card>
                        </button>

                        <Card className="!p-6 space-y-4 bg-white/50 dark:bg-slate-900/50 shadow-xl !rounded-2xl h-[200px] overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><Bell size={16} className="text-emerald-500"/><h3 className="font-black text-sm uppercase">Inbox</h3></div>
                                {inbox.length > 0 && <Badge color="bg-rose-500 text-white">{inbox.length}</Badge>}
                            </div>
                            <div className="space-y-2">
                                {inbox.map((req: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl animate-message-pop">
                                        <div>
                                            <p className="font-bold text-sm">{req.user.username}</p>
                                            <p className="text-[8px] uppercase font-black opacity-50">
                                                {req.type === 'friend_request' ? 'Friend Request' : 'Room Invite'}
                                            </p>
                                        </div>
                                        <button onClick={() => handleAction(req, i)} className={`p-2 text-white rounded-lg ${req.type === 'friend_request' ? 'bg-emerald-500' : 'bg-vibe'}`}>
                                            {req.type === 'friend_request' ? <UserPlus size={14}/> : <CheckCircle2 size={14} />}
                                        </button>
                                    </div>
                                ))}
                                {inbox.length === 0 && <p className="text-[10px] font-bold text-slate-400 italic">No signals...</p>}
                            </div>
                        </Card>
                    </div>
                </div>
            </main>

            <div className="md:hidden absolute bottom-0 inset-x-0 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t dark:border-slate-800 flex items-center justify-around z-40">
                <button onClick={() => setMobileTab('friends')} className={`flex flex-col items-center gap-1 ${mobileTab === 'friends' ? 'text-vibe-primary' : 'text-slate-400'}`}><Users2 size={24} /></button>
                <button onClick={() => setMobileTab('portal')} className={`flex flex-col items-center gap-1 ${mobileTab === 'portal' ? 'text-vibe-primary' : 'text-slate-400'}`}><LayoutGrid size={24} /></button>
            </div>
            
            {showSettings && <SettingsPanel user={user} updateSettings={updateSettings} onClose={() => setShowSettings(false)} onLogout={onLogout} />}
        </div>
    );
};

const SettingsPanel = ({ user, updateSettings, onClose, onLogout }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <Card className="w-full max-w-lg !p-8 space-y-6 relative !rounded-2xl border-4 border-white/10 shadow-2xl">
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500"><XCircle size={24}/></button>
            <h2 className="text-3xl font-black tracking-tighter">Core Config</h2>
            <div className="space-y-4">
                <button onClick={() => updateSettings({ darkMode: !user.settings.darkMode })} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${user.settings.darkMode ? 'bg-slate-900 border-vibe text-white' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3">{user.settings.darkMode ? <Moon size={20}/> : <Sun size={20}/>}<span className="font-bold">Dark Mode</span></div>
                    <div className={`w-10 h-5 rounded-full relative ${user.settings.darkMode ? 'bg-vibe' : 'bg-slate-200'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${user.settings.darkMode ? 'left-6' : 'left-1'}`}></div></div>
                </button>
                <div className="flex gap-2 justify-center">
                    {(['violet', 'rose', 'emerald', 'sky', 'amber'] as ThemeColor[]).map(c => (
                        <button key={c} onClick={() => updateSettings({ theme: c })} className={`w-10 h-10 rounded-xl bg-${c === 'violet' ? 'violet' : c}-500 ${user.settings.theme === c ? 'ring-4 ring-white/20 scale-110' : ''}`} />
                    ))}
                </div>
            </div>
            <Button onClick={onLogout} variant="danger" className="w-full !py-4 !rounded-xl"><Power className="mr-2" size={16}/> Disconnect</Button>
        </Card>
    </div>
);

const PongGame = ({ isHost, p1Name, p2Name, onClose }: { isHost: boolean, p1Name: string, p2Name: string, onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<PongState>({ 
        ball: { x: 300, y: 200, dx: 4, dy: 4 }, p1Y: 150, p2Y: 150, 
        score: { p1: 0, p2: 0 }, gameStatus: 'intro', countdown: 3 
    });
    const keysPressed = useRef({ up: false, down: false });

    useEffect(() => {
        const handleSync = (e: any) => !isHost && setGameState(e.detail);
        window.addEventListener('p2p_game_sync', handleSync);
        return () => window.removeEventListener('p2p_game_sync', handleSync);
    }, [isHost]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') keysPressed.current.up = true;
            if (e.key === 'ArrowDown') keysPressed.current.down = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
             if (e.key === 'ArrowUp') keysPressed.current.up = false;
             if (e.key === 'ArrowDown') keysPressed.current.down = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Input Loop
    useEffect(() => {
        let animationFrameId: number;
        const processInput = () => {
             if (keysPressed.current.up || keysPressed.current.down) {
                 setGameState(prev => {
                     const currentY = isHost ? prev.p1Y : prev.p2Y;
                     let nextY = currentY;
                     // Speed of paddle movement (approx 8px per frame)
                     if (keysPressed.current.up) nextY -= 8;
                     if (keysPressed.current.down) nextY += 8;
                     
                     const boundedY = Math.max(0, Math.min(340, nextY));
                     
                     if (isHost) {
                         return { ...prev, p1Y: boundedY };
                     } else {
                         // As guest, we optimize by updating local state for smoothness, but send payload
                         // Note: In real production, we'd want to throttle sends, but for P2P LAN/Fast net it's okay
                         p2p.send({ type: 'GAME_INPUT', payload: { y: boundedY } });
                         return { ...prev, p2Y: boundedY };
                     }
                 });
             }
             animationFrameId = requestAnimationFrame(processInput);
        };
        processInput();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isHost]);

    const handleTouchMove = (e: React.TouchEvent) => {
        // Keep drag support as fallback
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && isHost) setGameState(prev => ({ ...prev, p1Y: Math.max(0, Math.min(340, e.touches[0].clientY - rect.top - 30)) }));
        else if (rect) p2p.send({ type: 'GAME_INPUT', payload: { y: Math.max(0, Math.min(340, e.touches[0].clientY - rect.top - 30)) } });
    };

    // Render 
    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#1e293b'; 
        ctx.fillRect(0, 0, 600, 400);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.score.p1.toString(), 150, 50);
        ctx.fillText(gameState.score.p2.toString(), 450, 50);
        
        ctx.font = '12px sans-serif';
        ctx.fillText(p1Name, 150, 380);
        ctx.fillText(p2Name, 450, 380);

        ctx.fillRect(0, 0, 600, 4); 
        ctx.fillRect(0, 396, 600, 4); 
        for(let i=0; i<400; i+=20) ctx.fillRect(298, i, 4, 10); 

        ctx.fillStyle = '#34d399'; ctx.fillRect(20, gameState.p1Y, 10, 60);
        ctx.fillStyle = '#f43f5e'; ctx.fillRect(570, gameState.p2Y, 10, 60);

        if (gameState.gameStatus === 'playing') {
             ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(gameState.ball.x, gameState.ball.y, 6, 0, Math.PI * 2); ctx.fill();
        }
    }, [gameState, p1Name, p2Name]);

    // Host Logic Loop (Ball movement)
    useEffect(() => {
        if (!isHost) return;
        let animId: number;
        let interval: any;

        const loop = () => {
            setGameState(prev => {
                if (prev.gameStatus !== 'playing') return prev;
                let { x, y, dx, dy } = prev.ball;
                let { p1, p2 } = prev.score;
                let status = prev.gameStatus;
                let winner = prev.winner;

                x += dx; y += dy;
                if (y <= 10 || y >= 390) dy *= -1;

                if (x <= 35 && y >= prev.p1Y && y <= prev.p1Y + 60) { dx *= -1; x = 35; dx *= 1.05; }
                if (x >= 565 && y >= prev.p2Y && y <= prev.p2Y + 60) { dx *= -1; x = 565; dx *= 1.05; }

                if (x < 0) { p2++; x = 300; y = 200; dx = 4; dy = 4; }
                if (x > 600) { p1++; x = 300; y = 200; dx = -4; dy = 4; }

                if (p1 >= 5) { status = 'ended'; winner = 'host'; }
                if (p2 >= 5) { status = 'ended'; winner = 'guest'; }

                const next = { ...prev, ball: { x, y, dx, dy }, score: { p1, p2 }, gameStatus: status, winner };
                p2p.send({ type: 'GAME_SYNC', payload: next });
                return next;
            });
            animId = requestAnimationFrame(loop);
        };

        if (gameState.gameStatus === 'intro') {
             setTimeout(() => setGameState(p => { const n = {...p, gameStatus: 'countdown'}; p2p.send({type:'GAME_SYNC', payload: n}); return n; }), 3000);
        } else if (gameState.gameStatus === 'countdown') {
             interval = setInterval(() => {
                 setGameState(prev => {
                     const nextC = prev.countdown - 1;
                     const nextS = nextC <= 0 ? 'playing' : 'countdown';
                     const n = { ...prev, countdown: nextC, gameStatus: nextS };
                     p2p.send({ type: 'GAME_SYNC', payload: n });
                     if (nextS === 'playing') clearInterval(interval);
                     return n;
                 });
             }, 1000);
        } else if (gameState.gameStatus === 'playing') {
            animId = requestAnimationFrame(loop);
        } else if (gameState.gameStatus === 'ended') {
            setTimeout(onClose, 3000);
        }

        return () => { cancelAnimationFrame(animId); clearInterval(interval); }
    }, [isHost, gameState.gameStatus]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center p-4">
                <div className="w-full max-w-4xl aspect-[3/2] relative shadow-2xl rounded-xl overflow-hidden border-2 border-white/10 group">
                    <canvas 
                        ref={canvasRef} width={600} height={400} 
                        className="w-full h-full bg-slate-900 touch-none cursor-none block"
                        onTouchMove={handleTouchMove}
                    />
                    
                    {/* Visual Controls for Mobile - Always visible or only on touch devices? Let's make them visible but subtle */}
                    <div className="absolute right-4 bottom-4 flex flex-col gap-4 z-10 md:opacity-20 hover:opacity-100 transition-opacity">
                        <button 
                            className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/30 backdrop-blur-sm"
                            onTouchStart={(e) => { e.preventDefault(); keysPressed.current.up = true; }}
                            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current.up = false; }}
                            onMouseDown={() => keysPressed.current.up = true}
                            onMouseUp={() => keysPressed.current.up = false}
                        >
                            <ChevronUp className="text-white w-8 h-8" />
                        </button>
                        <button 
                            className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/30 backdrop-blur-sm"
                            onTouchStart={(e) => { e.preventDefault(); keysPressed.current.down = true; }}
                            onTouchEnd={(e) => { e.preventDefault(); keysPressed.current.down = false; }}
                            onMouseDown={() => keysPressed.current.down = true}
                            onMouseUp={() => keysPressed.current.down = false}
                        >
                            <ChevronDown className="text-white w-8 h-8" />
                        </button>
                    </div>

                    {gameState.gameStatus === 'intro' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in z-20">
                            <div className="text-white text-center">
                                <h3 className="text-4xl font-black mb-4 text-vibe-primary">MINI PONG</h3>
                                <p className="text-xl font-bold">USE ARROW KEYS OR BUTTONS TO PLAY</p>
                                <p className="mt-4 text-xs opacity-50 uppercase tracking-widest">First to 5 wins</p>
                            </div>
                        </div>
                    )}

                    {gameState.gameStatus === 'countdown' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <span className="text-8xl font-black text-white animate-pulse">{gameState.countdown}</span>
                        </div>
                    )}

                    {gameState.gameStatus === 'ended' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none animate-in fade-in z-20">
                            <div className="text-white text-center">
                                <Trophy size={64} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
                                <h3 className="text-4xl font-black mb-2">{gameState.winner === 'host' ? p1Name : p2Name} WINS!</h3>
                                <p className="text-sm opacity-50">Returning to chat...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MusicPanel = ({ onClose, playlist, onUpdatePlaylist, user }: any) => {
    const [input, setInput] = useState('');
    const [generated, setGenerated] = useState<any>(null);

    const handleGenerate = () => {
        const meta = getLinkMetadata(input);
        if (meta) setGenerated(meta);
        setInput('');
    };

    return (
        <div className="h-full flex flex-col p-4 bg-white dark:bg-slate-900 border-t dark:border-white/5 shadow-2xl animate-slide-up">
             <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-black text-lg flex items-center gap-2"><Music2 size={20}/> Music Hub</h3>
                <button onClick={onClose}><XCircle size={20} className="text-slate-400 hover:text-rose-500"/></button>
            </div>
            
            <div className="flex gap-2 mb-4 shrink-0">
                 <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Paste Link..." className="!rounded-xl" />
                 <Button onClick={handleGenerate} disabled={!input}><Plus size={16}/></Button>
            </div>

            {generated && (
                 <div className="mb-4 shrink-0 animate-in zoom-in">
                     <MusicCard {...generated} onAddToPlaylist={() => {
                         const newItem: PlaylistItem = { 
                             id: Date.now().toString(), url: generated.url, title: `${generated.type} Track`, 
                             platform: generated.type, addedBy: user.username, ...generated 
                         };
                         onUpdatePlaylist([...playlist.items, newItem]);
                         setGenerated(null);
                     }} />
                 </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar border-t dark:border-white/5 pt-4">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Shared Playlist</h4>
                 {playlist.items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-lg group">
                        <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center shrink-0 text-[10px] font-black uppercase">{item.platform[0]}</div>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs truncate">{item.title}</p>
                            <p className="text-[9px] opacity-40 truncate">By {item.addedBy}</p>
                        </div>
                        <a href={item.url} target="_blank" className="p-1.5 hover:bg-emerald-500 hover:text-white rounded transition-colors"><Play size={10}/></a>
                    </div>
                 ))}
                 {playlist.items.length === 0 && <p className="text-center text-xs opacity-30 mt-4">No tracks added</p>}
            </div>
        </div>
    );
};

const SettingsDrawer = ({ settings, toggleSetting, onLeave, onClose }: any) => (
    <div className="h-full flex flex-col p-4 bg-white dark:bg-slate-900 border-t dark:border-white/5 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="font-black text-lg flex items-center gap-2"><Settings size={20}/> Config</h3>
            <button onClick={onClose}><XCircle size={20} className="text-slate-400 hover:text-rose-500"/></button>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto">
            {[
                { k: 'aiEnabled', l: 'Duo AI', i: <Zap size={16}/> },
                { k: 'showLastSeen', l: 'Last Seen', i: <Eye size={16}/> },
                { k: 'readReceipts', l: 'Read Receipts', i: <CheckCircle2 size={16}/> },
                { k: 'themeSync', l: 'Theme Sync', i: <Palette size={16}/> }
            ].map((s: any) => (
                <label key={s.k} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 cursor-pointer">
                    <div className="flex items-center gap-3 text-sm font-bold">{s.i} {s.l}</div>
                    <div onClick={() => toggleSetting(s.k)} className={`w-10 h-6 rounded-full relative transition-colors ${settings[s.k] ? 'bg-vibe' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[s.k] ? 'left-5' : 'left-1'}`}/>
                    </div>
                </label>
            ))}
        </div>
        <div className="mt-4 pt-4 border-t dark:border-white/5 shrink-0">
            <Button onClick={onLeave} variant="danger" className="w-full !py-3 !text-sm !rounded-xl"><LogOut size={16}/> End Session</Button>
        </div>
    </div>
);

const Room = ({ user, friend, friendsList, onBack, initialMessages, onUpdateHistory, onLeave }: any) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState('');
    const [gameActive, setGameActive] = useState(false);
    const [showSketch, setShowSketch] = useState(false);
    
    // Voice & Media
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [imgPreview, setImgPreview] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Bottom Dock State
    const [activePanel, setActivePanel] = useState<'none' | 'music' | 'settings'>('none');
    
    const [playlist, setPlaylist] = useState<{name: string, items: PlaylistItem[]}>({ name: 'Shared Playlist', items: [] });
    const [settings, setSettings] = useState<RoomSettings>({ aiEnabled: true, themeSync: true, showLastSeen: true, readReceipts: true });
    const [editMsgId, setEditMsgId] = useState<string | null>(null);
    const [showMsgActions, setShowMsgActions] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const isHost = !friend;
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMessages(initialMessages); }, [initialMessages]);
    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        const handlers: any = {
            p2p_game_input: (e: any) => isHost && window.dispatchEvent(new CustomEvent('p2p_game_host_input', { detail: e.detail })),
            p2p_game_sync: (e: any) => {
                const state = e.detail;
                if (state.gameStatus !== 'ended' && !gameActive) setGameActive(true);
                if (state.gameStatus === 'ended' && state.winner) { /* Handled in Game Component */ }
            },
            p2p_playlist_sync: (e: any) => setPlaylist(e.detail),
            p2p_msg_update: (e: any) => {
                const { id, action, content } = e.detail;
                setMessages(prev => prev.map(m => {
                    if (m.id !== id) return m;
                    if (action === 'delete') return { ...m, isDeleted: true, content: 'Message deleted' };
                    if (action === 'edit') return { ...m, isEdited: true, content };
                    return m;
                }));
            },
            p2p_room_settings: (e: any) => setSettings(e.detail),
            p2p_msg: (e: any) => {
                const newMsg = e.detail;
                setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
            }
        };

        const list = Object.keys(handlers);
        list.forEach(k => window.addEventListener(k, handlers[k]));
        return () => list.forEach(k => window.removeEventListener(k, handlers[k]));
    }, [isHost, gameActive]);

    const send = (type: Message['type'], content?: string, media_url?: string) => {
        const msg: Message = { id: Date.now() + Math.random().toString(36).substr(2), sender_id: user.id, sender_name: user.username, content, media_url, type, timestamp: Date.now() };
        setMessages(prev => [...prev, msg]);
        onUpdateHistory(msg);
        p2p.send({ type: 'CHAT', msg });
        
        if (type === 'text' && settings.aiEnabled && content?.toLowerCase().includes('@ai')) {
            AI.getAiResponse(content, messages, user.settings.aiTone).then(reply => {
                const aiMsg: Message = { id: `ai_${Date.now()}`, sender_id: 'ai', sender_name: 'Duo AI', content: String(reply), type: 'ai', timestamp: Date.now() };
                setMessages(prev => [...prev, aiMsg]);
                onUpdateHistory(aiMsg);
                p2p.send({ type: 'CHAT', msg: aiMsg });
            });
        }
    };

    const handleSend = () => {
        if (editMsgId) {
            const m = messages.find(m => m.id === editMsgId);
            if (m && input.trim()) {
                p2p.send({ type: 'MSG_UPDATE', payload: { id: editMsgId, action: 'edit', content: input } });
                setMessages(prev => prev.map(msg => msg.id === editMsgId ? { ...msg, isEdited: true, content: input } : msg));
                setEditMsgId(null);
                setInput('');
            }
        } else if (imgPreview) {
             send('image', input, imgPreview);
             setImgPreview(null);
             setInput('');
        } else if (audioBlob) {
             const reader = new FileReader();
             reader.readAsDataURL(audioBlob);
             reader.onloadend = () => {
                 send('voice', undefined, reader.result as string);
                 setAudioBlob(null);
             }
        } else if (input.trim()) {
            send('text', input);
            setInput('');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
            };

            mediaRecorderRef.current.start();
            setRecording(true);
        } catch (e) {
            console.error("Mic access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const compressed = await compressImage(file);
            setImgPreview(compressed);
        }
    };

    const updatePlaylist = (items: PlaylistItem[]) => {
        const next = { ...playlist, items };
        setPlaylist(next);
        p2p.send({ type: 'PLAYLIST_SYNC', payload: next });
    };

    const deleteMsg = (id: string) => {
        p2p.send({ type: 'MSG_UPDATE', payload: { id, action: 'delete' } });
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, content: 'Message deleted' } : m));
        setShowMsgActions(null);
    };

    const toggleSetting = (key: keyof RoomSettings) => {
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        p2p.send({ type: 'ROOM_SETTINGS', payload: next });
    };

    const startPong = () => {
        if (!isHost) return;
        setGameActive(true);
        p2p.send({type:'GAME_SYNC', payload: { active: true, ball: {x:300, y:200, dx:4, dy:4}, score:{p1:0, p2:0}, p1Y:150, p2Y:150, gameStatus: 'intro', countdown: 3 }});
    };

    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto w-full bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden transition-all duration-500">
            {/* Header */}
            <header className="p-2.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><ArrowLeft size={20}/></button>
                    <div>
                         <h2 className="text-base md:text-lg font-black tracking-tighter leading-none">{isHost ? "Your Portal" : friend?.username}</h2>
                         <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span className="text-[9px] font-black uppercase opacity-40">Live</span></div>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[radial-gradient(circle_at_center,_var(--theme-primary-soft)_0%,_transparent_100%)] dark:bg-none" onClick={() => { setActivePanel('none'); setShowMsgActions(null); }}>
                {messages.map((m) => {
                    const isMe = m.sender_id === user.id;
                    const canEdit = isMe && m.type === 'text' && !m.isDeleted && (Date.now() - m.timestamp < 5 * 60 * 1000);
                    
                    return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] font-medium text-sm border border-transparent ${isMe ? 'bg-vibe text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:border-white/5 rounded-bl-none shadow-sm'}`}>
                                {m.isDeleted ? <span className="italic opacity-50 text-xs flex items-center gap-1"><Trash2 size={10}/> Message deleted</span> : (
                                    <>
                                        {m.type === 'image' && <img src={m.media_url} className="rounded-lg max-h-60 border-2 border-white/10 mb-1" />}
                                        {m.type === 'voice' && <audio src={m.media_url} controls className="h-8 w-48" />}
                                        {m.type === 'text' && <p className="whitespace-pre-wrap">{m.content}</p>}
                                        {m.isEdited && <span className="text-[9px] opacity-50 block text-right mt-1">(edited)</span>}
                                    </>
                                )}
                            </div>
                            {!m.isDeleted && isMe && (
                                <div className="relative">
                                     <button onClick={(e) => { e.stopPropagation(); setShowMsgActions(showMsgActions === m.id ? null : m.id); }} className="opacity-50 hover:opacity-100 p-1 text-[10px]"><MoreVertical size={12}/></button>
                                     {showMsgActions === m.id && (
                                         <div className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-800 shadow-xl rounded-lg border dark:border-white/5 p-1 flex flex-col z-30 min-w-[80px]">
                                             {canEdit && <button onClick={() => { setInput(m.content || ''); setEditMsgId(m.id); setShowMsgActions(null); }} className="text-left p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-xs">Edit</button>}
                                             <button onClick={() => deleteMsg(m.id)} className="text-left p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded text-xs">Delete</button>
                                         </div>
                                     )}
                                </div>
                            )}
                            <span className="text-[9px] font-black uppercase opacity-30 mt-1 px-1">{m.sender_name}</span>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-4" />
            </div>

            {/* Input & Dock Container */}
            <div className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t dark:border-white/5 z-30">
                {/* Input Area */}
                <div className="p-2">
                    <Card className="!p-2 flex items-center gap-2 !rounded-2xl shadow-lg border-none bg-white dark:bg-slate-950">
                        {imgPreview ? (
                            <div className="flex-1 flex items-center gap-2 p-1">
                                <img src={imgPreview} className="h-10 w-10 rounded-lg object-cover" />
                                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Add caption..." className="!border-none !px-0" />
                                <button onClick={() => setImgPreview(null)}><XCircle size={20} className="text-rose-500"/></button>
                            </div>
                        ) : recording ? (
                            <div className="flex-1 flex items-center gap-4 px-4 text-rose-500 animate-pulse font-bold">
                                <Mic size={20}/> <span>Recording...</span>
                                <button onClick={stopRecording} className="ml-auto"><StopCircle size={24}/></button>
                            </div>
                        ) : audioBlob ? (
                             <div className="flex-1 flex items-center gap-2 p-1">
                                 <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
                                 <button onClick={() => setAudioBlob(null)}><Trash2 size={20} className="text-rose-500"/></button>
                             </div>
                        ) : (
                            <>
                                <button onClick={() => setShowSketch(true)} className="p-2 text-slate-400 hover:text-vibe hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all"><PenTool size={20}/></button>
                                <label className="p-2 text-slate-400 hover:text-vibe hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer">
                                    <ImageIcon size={20}/>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </label>
                                <button onClick={startRecording} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-900 rounded-xl transition-all"><Mic size={20}/></button>
                                <input 
                                    value={input} 
                                    onChange={e => setInput(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && handleSend()} 
                                    className="flex-1 bg-transparent outline-none font-bold text-sm md:text-base px-2 placeholder:text-slate-400 min-w-0" 
                                    placeholder={editMsgId ? "Edit message..." : "Signal..."} 
                                />
                            </>
                        )}
                        
                        {editMsgId && <button onClick={() => { setEditMsgId(null); setInput(''); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><XCircle size={20}/></button>}
                        <button onClick={handleSend} className={`p-2.5 bg-vibe text-white rounded-xl shadow-lg shadow-vibe/30 active:scale-95 transition-all ${(!input.trim() && !imgPreview && !audioBlob) ? 'opacity-50' : ''}`}>
                            {editMsgId ? <CheckCircle2 size={20}/> : <Send size={20}/>}
                        </button>
                    </Card>
                </div>

                {/* Bottom Dock */}
                <div className="grid grid-cols-3 gap-1 p-1">
                     <button 
                        onClick={() => setActivePanel(activePanel === 'music' ? 'none' : 'music')} 
                        className={`p-3 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${activePanel === 'music' ? 'bg-vibe text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                     >
                         <Music2 size={20}/>
                         <span className="text-[9px] font-black uppercase">Music</span>
                     </button>
                     <button 
                        disabled={!isHost}
                        onClick={startPong} 
                        className={`p-3 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${isHost ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : 'opacity-40'}`}
                     >
                         <Gamepad2 size={20}/>
                         <span className="text-[9px] font-black uppercase">Pong</span>
                     </button>
                     <button 
                        onClick={() => setActivePanel(activePanel === 'settings' ? 'none' : 'settings')}
                        className={`p-3 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${activePanel === 'settings' ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                     >
                         <Settings size={20}/>
                         <span className="text-[9px] font-black uppercase">Config</span>
                     </button>
                </div>
            </div>

            {/* Bottom Panels (Overlay) */}
            {(activePanel !== 'none') && (
                <div className="absolute inset-x-0 bottom-[140px] h-[300px] z-20">
                    {activePanel === 'music' && <MusicPanel user={user} playlist={playlist} onUpdatePlaylist={updatePlaylist} onClose={() => setActivePanel('none')} />}
                    {activePanel === 'settings' && <SettingsDrawer settings={settings} toggleSetting={toggleSetting} onLeave={onLeave} onClose={() => setActivePanel('none')} />}
                </div>
            )}

            {/* Overlays */}
            {gameActive && <PongGame isHost={isHost} p1Name={isHost ? user.username : friend?.username} p2Name={!isHost ? user.username : friend?.username} onClose={() => { setGameActive(false); if(isHost) p2p.send({ type: 'GAME_SYNC', payload: { gameStatus: 'ended' }}); }} />}
            {showSketch && <Sketchpad onSend={(blob) => send('image', undefined, blob)} onClose={() => setShowSketch(false)} />}
        </div>
    );
};

// ... Sketchpad and MusicCard Components remain unchanged, just need to be included in file ...
const Sketchpad = ({ onSend, onClose }: { onSend: (blob: string) => void, onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const start = (e: any) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath();
        const { offsetX, offsetY } = getCoords(e);
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        const { offsetX, offsetY } = getCoords(e);
        ctx?.lineTo(offsetX, offsetY);
        ctx?.stroke();
    };

    const getCoords = (e: any) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        if (e.touches) return { offsetX: e.touches[0].clientX - rect.left, offsetY: e.touches[0].clientY - rect.top };
        return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
    };

    const handleSend = () => {
        if (canvasRef.current) onSend(canvasRef.current.toDataURL('image/png'));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md !p-4 bg-slate-900 border-2 border-white/10 space-y-4">
                <div className="flex justify-between text-white"><h3 className="font-black uppercase">Sketchpad</h3><button onClick={onClose}><XCircle/></button></div>
                <div className="bg-black rounded-xl overflow-hidden touch-none border border-white/10">
                    <canvas 
                        ref={canvasRef} width={350} height={400} 
                        className="w-full h-[400px] cursor-crosshair"
                        onMouseDown={start} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)}
                        onTouchStart={start} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => { const ctx = canvasRef.current?.getContext('2d'); ctx?.clearRect(0,0,400,400); }} variant="secondary" className="flex-1">Clear</Button>
                    <Button onClick={handleSend} className="flex-1">Send</Button>
                </div>
            </Card>
        </div>
    );
};

const MusicCard = ({ url, type, id, onAddToPlaylist }: { url: string, type: string, id?: string, onAddToPlaylist: () => void }) => (
    <div className="mt-2 rounded-xl bg-slate-100 dark:bg-black/40 border border-black/5 dark:border-white/5 p-2.5 flex gap-3 items-center w-full group relative overflow-hidden">
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
            {type === 'youtube' && id ? <img src={`https://img.youtube.com/vi/${id}/0.jpg`} className="w-full h-full object-cover" /> : <Music2 size={20}/>}
        </div>
        <div className="min-w-0 flex-1">
            <h5 className="font-bold text-xs truncate capitalize">{type} Track</h5>
            <a href={url} target="_blank" className="text-[10px] text-vibe-primary hover:underline truncate block opacity-80">{url}</a>
        </div>
        <div className="flex flex-col gap-1">
            <a href={url} target="_blank" className="p-1.5 bg-white dark:bg-slate-700 rounded-lg hover:bg-vibe hover:text-white transition-colors"><ExternalLink size={12}/></a>
            <button onClick={onAddToPlaylist} className="p-1.5 bg-white dark:bg-slate-700 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"><Plus size={12}/></button>
        </div>
    </div>
);

export default App;