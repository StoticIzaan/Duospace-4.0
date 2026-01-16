import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Send, Gamepad2, LogOut, Plus, ArrowLeft, 
  Search, User as UserIcon, Zap, MessageCircle, Bell, UserPlus, 
  CheckCircle2, Rocket, Waves, XCircle, Settings, Image as ImageIcon,
  Mic, MicOff, Moon, Sun, ShieldCheck, Users, Palette, Radio, Share2,
  LayoutGrid, Users2, Trash2, Power, PlugZap
} from 'lucide-react';
import { p2p } from './services/peerService'; 
import { User, Message, Friend, ThemeColor } from './types';
import { Button, Input, Card, Badge } from './components/Common';
import * as AI from './services/geminiService';

const App = () => {
  const [user, setUser] = useState<User | null>(p2p.user);
  const [view, setView] = useState<'auth' | 'dash' | 'room'>('auth');
  const [friends, setFriends] = useState<Friend[]>(() => JSON.parse(localStorage.getItem('duospace_friends_v5') || '[]'));
  const [inbox, setInbox] = useState<any[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [status, setStatus] = useState('offline');
  const [activeSessions, setActiveSessions] = useState<string[]>([]);
  // Chat history cache to preserve messages when navigating: { [sessionId]: Message[] }
  // sessionId is 'host' if hosting, or friendId if guest
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    if (user) {
        p2p.init({
            onMessage: (m) => {
                // Dispatch event for Room component if active
                window.dispatchEvent(new CustomEvent('p2p_msg', { detail: m }));
                
                // Update global history store
                setChatHistory(prev => {
                    const sessionId = p2p.isHostMode ? 'host' : m.sender_id; // Approximation, better to use active connection ID
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
      if (confirm("Are you sure you want to disconnect? This will clear your session.")) {
          localStorage.removeItem('duospace_user_v5');
          p2p.destroy();
          setUser(null);
          setView('auth');
      }
  };

  // Helper to get current session ID for history
  const getCurrentSessionId = () => {
      if (!activeFriend) return 'host';
      return activeFriend.id;
  };

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
    <div className={`h-full flex flex-col transition-colors duration-500 theme-${user.settings.theme} ${user.settings.darkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
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
            />
        )}
        {view === 'room' && (
            <Room 
                user={user} 
                friend={activeFriend} 
                friendsList={friends}
                initialMessages={chatHistory[getCurrentSessionId()] || []}
                onUpdateHistory={updateHistory}
                onBack={() => setView('dash')} // Don't disconnect, just go back
                onLeave={() => {
                    p2p.disconnect();
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
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 md:p-12 bg-vibe">
            <Card className="w-full max-w-xl !p-8 md:!p-16 space-y-8 md:space-y-10 animate-slide-up shadow-2xl !rounded-3xl md:!rounded-5xl border-4 border-white/20">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl mx-auto flex items-center justify-center text-vibe-primary shadow-2xl rotate-3">
                        <Heart size={40} className="md:w-14 md:h-14" fill="currentColor"/>
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter">DuoSpace</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mt-2">Personal Dimensional Bridge</p>
                    </div>
                </div>
                <Input 
                    label="Choose Your Handle" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Neo" 
                    className="!py-5 md:!py-7 !text-xl md:!text-3xl !rounded-2xl md:!rounded-3xl" 
                />
                <Button onClick={async () => onLogin(await p2p.register(name))} className="w-full !py-6 md:!py-8 !text-lg md:!text-xl !rounded-2xl md:!rounded-3xl">Enter Nexus</Button>
            </Card>
        </div>
    );
};

const Dashboard = ({ user, friends, inbox, setInbox, setView, setActiveFriend, updateSettings, setFriends, onLogout, activeSessions }: any) => {
    const [search, setSearch] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [mobileTab, setMobileTab] = useState<'portal' | 'friends' | 'active'>('portal');

    const handleAction = (req: any, index: number) => {
        if (req.type === 'friend') {
            p2p.acceptFriend(req.conn);
            const newFriend = { id: req.user.id, username: req.user.username, status: 'online' };
            setFriends((prev: Friend[]) => {
                if (prev.find(f => f.id === newFriend.id)) return prev;
                const updated = [...prev, newFriend];
                localStorage.setItem('duospace_friends_v5', JSON.stringify(updated));
                return updated;
            });
        } else {
            setActiveFriend(req.user);
            p2p.connectToRoom(req.user.id);
            setView('room');
        }
        setInbox(inbox.filter((_: any, i: number) => i !== index));
    };

    const handleCreateRoom = () => {
        setActiveFriend(null);
        setView('room');
    };

    const handleResumeSession = (peerId: string) => {
        // Find friend object if possible
        const friend = friends.find((f: Friend) => f.id === peerId);
        // If I am hosting, activeFriend stays null. If I am connected to someone, activeFriend is them.
        // We need to know if we are Host or Guest for this session.
        if (p2p.isHostMode) {
             setActiveFriend(null); // I am host
        } else {
             setActiveFriend(friend || { id: peerId, username: peerId, status: 'online' });
        }
        setView('room');
    };

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden relative">
            {/* Sidebar (Friends) */}
            <aside className={`${mobileTab === 'friends' ? 'flex' : 'hidden'} md:flex w-full md:w-[350px] lg:w-[450px] border-r dark:border-slate-800 flex-col shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl h-full pb-20 md:pb-0`}>
                <div className="p-6 md:p-10 border-b dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-vibe">DuoSpace</h2>
                        <Badge color="bg-emerald-500/10 text-emerald-500 font-black mt-1">@{user.username}</Badge>
                    </div>
                    <button onClick={() => setShowSettings(true)} className="p-3 md:p-4 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-md active:scale-90">
                        <Settings size={24} className="md:w-7 md:h-7"/>
                    </button>
                </div>

                <div className="p-6 md:p-8 space-y-4 md:space-y-6 flex-1 overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-400">Trusted Partners</span>
                        <Badge color="bg-vibe text-white px-3">{friends.length}</Badge>
                    </div>

                    {friends.map((f: Friend) => (
                        <Card key={f.id} className="!p-4 md:!p-6 flex items-center justify-between group border-2 border-transparent hover:border-vibe/30 transition-all shadow-xl !rounded-2xl md:!rounded-3xl opacity-80 hover:opacity-100">
                            <div className="flex items-center gap-4 md:gap-5">
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-200 dark:bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                                    <UserIcon size={24} className="md:w-8 md:h-8"/>
                                </div>
                                <div>
                                    <h4 className="font-black text-lg md:text-xl">{f.username}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Friend</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {friends.length === 0 && <div className="text-center py-12 opacity-20"><Users size={48} className="mx-auto"/><p className="mt-2 text-xs font-black">No Friends</p></div>}
                </div>

                <div className="p-6 md:p-8 bg-white/20 dark:bg-black/20 border-t dark:border-slate-800">
                    <Input 
                        placeholder="Add Friend ID..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        className="!py-4 md:!py-5 !text-base md:!text-lg !rounded-2xl"
                        icon={<UserPlus size={20} className="md:w-6 md:h-6"/>}
                        onIconClick={() => { p2p.sendFriendRequest(search); setSearch(''); }}
                    />
                </div>
            </aside>

            {/* Main Surface */}
            <main className={`${mobileTab === 'portal' || mobileTab === 'active' ? 'flex' : 'hidden'} md:flex flex-1 p-6 md:p-20 flex-col items-center justify-center relative bg-slate-100/50 dark:bg-slate-950/50 pb-24 md:pb-20 overflow-y-auto`}>
                <div className="max-w-4xl w-full space-y-8 md:space-y-12">
                    
                    {/* Active Sessions Tab View (Mobile specific logic or Integrated in Desktop) */}
                    {(mobileTab === 'active' || (mobileTab === 'portal' && activeSessions.length > 0)) && (
                         <div className="space-y-4 animate-slide-up">
                            <div className="flex items-center gap-2 px-2">
                                <PlugZap className="text-emerald-500 animate-pulse" />
                                <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-500">Active Links ({activeSessions.length})</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeSessions.map((peerId: string) => {
                                    const friend = friends.find((f: Friend) => f.id === peerId);
                                    const label = p2p.isHostMode ? `Hosting Network (${activeSessions.length} Peers)` : `Linked to: ${friend?.username || peerId}`;
                                    // Deduplicate display if host
                                    if (p2p.isHostMode && peerId !== activeSessions[0]) return null;
                                    
                                    return (
                                        <Card key={peerId} className="!p-6 flex items-center justify-between border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900">
                                            <div>
                                                <h4 className="font-black text-lg">{label}</h4>
                                                <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">Signal Strong</p>
                                            </div>
                                            <Button onClick={() => handleResumeSession(peerId)}>Resume</Button>
                                        </Card>
                                    );
                                })}
                            </div>
                         </div>
                    )}

                    {mobileTab === 'portal' && (
                        <>
                        <div className="space-y-4 md:space-y-6 text-center">
                            <h1 className="text-5xl md:text-8xl font-black tracking-tighter dark:text-white">Portal Hub.</h1>
                            <p className="text-lg md:text-2xl text-slate-400 font-medium px-4">Create a private room first, then invite your friends.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                            {/* Create Room */}
                            <button onClick={handleCreateRoom} className="text-left group outline-none w-full">
                                <Card className="!p-8 md:!p-12 h-full space-y-4 md:space-y-6 bg-white dark:bg-slate-900 transition-all group-hover:scale-[1.02] group-active:scale-[0.98] border-4 border-transparent hover:border-vibe shadow-2xl !rounded-4xl md:!rounded-5xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-vibe opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity"></div>
                                    <div className="w-16 h-16 md:w-24 md:h-24 bg-vibe rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-2xl group-hover:rotate-12 transition-transform">
                                        <Plus size={32} className="md:w-12 md:h-12"/>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl md:text-4xl font-black mb-2">Create Room</h3>
                                        <p className="text-sm md:text-lg text-slate-400 font-medium">Initialize a secure dimension and invite friends.</p>
                                    </div>
                                </Card>
                            </button>

                            {/* Inbox */}
                            <Card className="!p-8 md:!p-12 space-y-4 md:space-y-6 bg-white/50 dark:bg-slate-900/50 border-4 border-transparent hover:border-emerald-500 shadow-2xl !rounded-4xl md:!rounded-5xl overflow-y-auto max-h-[300px] md:max-h-[500px]">
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl md:rounded-3xl flex items-center justify-center text-emerald-500 shadow-xl">
                                        <Bell size={24} className="md:w-8 md:h-8"/>
                                    </div>
                                    {inbox.length > 0 && <Badge color="bg-rose-500 text-white">{inbox.length}</Badge>}
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black">Inbox Signals</h3>
                                <div className="space-y-3 md:space-y-4">
                                    {inbox.map((req: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 md:p-6 bg-slate-100 dark:bg-slate-800 rounded-2xl md:rounded-3xl border-2 dark:border-slate-700 animate-message-pop">
                                            <div>
                                                <p className="font-black text-base md:text-lg">{req.user.username}</p>
                                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-50">{req.type === 'friend' ? 'Friend Req' : 'Invite'}</p>
                                            </div>
                                            <button onClick={() => handleAction(req, i)} className="p-3 md:p-4 bg-vibe text-white rounded-xl md:rounded-2xl shadow-xl hover:scale-110 transition-all"><CheckCircle2 size={18} /></button>
                                        </div>
                                    ))}
                                    {inbox.length === 0 && <p className="text-xs md:text-sm font-black text-slate-400 italic">No incoming dimension signals...</p>}
                                </div>
                            </Card>
                        </div>
                        </>
                    )}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden absolute bottom-0 inset-x-0 h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t dark:border-slate-800 flex items-center justify-around z-40 px-6 pb-2">
                <button onClick={() => setMobileTab('friends')} className={`flex flex-col items-center gap-1 p-2 ${mobileTab === 'friends' ? 'text-vibe-primary scale-110' : 'text-slate-400'}`}>
                    <Users2 size={28} /><span className="text-[10px] font-black uppercase">Friends</span>
                </button>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
                <button onClick={() => setMobileTab('portal')} className={`flex flex-col items-center gap-1 p-2 ${mobileTab === 'portal' ? 'text-vibe-primary scale-110' : 'text-slate-400'}`}>
                    <LayoutGrid size={28} /><span className="text-[10px] font-black uppercase">Portal</span>
                </button>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
                <button onClick={() => setMobileTab('active')} className={`flex flex-col items-center gap-1 p-2 relative ${mobileTab === 'active' ? 'text-vibe-primary scale-110' : 'text-slate-400'}`}>
                    {activeSessions.length > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>}
                    <PlugZap size={28} /><span className="text-[10px] font-black uppercase">Active</span>
                </button>
            </div>
            
            {showSettings && <SettingsPanel user={user} updateSettings={updateSettings} onClose={() => setShowSettings(false)} onLogout={onLogout} />}
        </div>
    );
};

const SettingsPanel = ({ user, updateSettings, onClose, onLogout }: any) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
        <Card className="w-full max-w-3xl !p-8 md:!p-16 space-y-6 md:space-y-10 animate-slide-up relative !rounded-4xl md:!rounded-5xl border-4 border-white/10 shadow-[0_0_100px_rgba(124,58,237,0.3)]">
            <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 text-slate-400 hover:text-rose-500 transition-all active:scale-90"><XCircle size={32} className="md:w-12 md:h-12"/></button>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Portal Core</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 px-2">Visual Preferences</p>
                    <button 
                        onClick={() => updateSettings({ darkMode: !user.settings.darkMode })}
                        className={`w-full flex items-center justify-between p-6 md:p-8 rounded-3xl border-4 transition-all ${user.settings.darkMode ? 'bg-slate-900 border-vibe text-white' : 'bg-white border-slate-100 text-slate-900'}`}
                    >
                        <div className="flex items-center gap-4">
                            {user.settings.darkMode ? <Moon size={24} className="md:w-7 md:h-7"/> : <Sun size={24} className="md:w-7 md:h-7"/>}
                            <span className="font-black text-lg md:text-xl">Dark Mode</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative ${user.settings.darkMode ? 'bg-vibe' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.darkMode ? 'left-7' : 'left-1'}`}></div>
                        </div>
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 px-2">Aesthetic Vibe</p>
                    <div className="grid grid-cols-5 md:grid-cols-3 gap-2 md:gap-3">
                        {(['violet', 'rose', 'emerald', 'sky', 'amber'] as ThemeColor[]).map(c => (
                            <button 
                                key={c}
                                onClick={() => updateSettings({ theme: c })}
                                className={`h-12 md:h-16 rounded-xl md:rounded-2xl border-4 transition-all bg-${c === 'violet' ? 'violet' : c}-500 ${user.settings.theme === c ? 'border-white scale-110 shadow-2xl' : 'border-transparent'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t dark:border-white/10">
                <Button onClick={onLogout} variant="danger" className="w-full !py-5 md:!py-6 !text-base md:!text-lg !rounded-2xl md:!rounded-3xl">
                    <Power className="mr-2" size={20}/> Disconnect (Logout)
                </Button>
            </div>
        </Card>
    </div>
);

const Room = ({ user, friend, friendsList, onBack, initialMessages, onUpdateHistory, onLeave }: { 
    user: User, 
    friend: Friend | null, 
    friendsList: Friend[], 
    onBack: () => void,
    initialMessages: Message[],
    onUpdateHistory: (m: Message) => void,
    onLeave: () => void
}) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const isHost = !friend;

    useEffect(() => {
        // Sync local state if initial messages change (e.g. resumption)
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        const handler = (e: any) => {
            const newMsg = e.detail;
            setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        };
        window.addEventListener('p2p_msg', handler);
        return () => window.removeEventListener('p2p_msg', handler);
    }, []);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = () => {
        if (imagePreview) {
            send('image', undefined, imagePreview);
            setImagePreview(null);
        } else if (input.trim()) {
            send('text', input);
        }
    };

    const send = (type: Message['type'] = 'text', content?: string, media_url?: string) => {
        const msg: Message = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            sender_id: user.id,
            sender_name: user.username,
            content,
            media_url,
            type,
            timestamp: Date.now()
        };
        
        // Update local UI
        setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
        
        // Update History in parent
        onUpdateHistory(msg);

        // Send via P2P
        p2p.send({ type: 'CHAT', msg });
        setInput('');

        if (content?.toLowerCase().includes('@ai')) {
            AI.getAiResponse(content, messages, user.settings.aiTone).then(reply => {
                const aiMsg: Message = {
                    id: `ai_${Date.now()}`,
                    sender_id: 'ai',
                    sender_name: 'Duo AI',
                    content: String(reply),
                    type: 'ai',
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, aiMsg]);
                onUpdateHistory(aiMsg);
                p2p.send({ type: 'CHAT', msg: aiMsg });
            });
        }
    };

    const toggleRecording = async () => {
        if (!isRecording) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            const chunks: any[] = [];
            mediaRecorder.current.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => send('voice', undefined, reader.result as string);
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        } else {
            mediaRecorder.current?.stop();
            setIsRecording(false);
        }
    };

    const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                e.target.value = '';
            };
        }
    };

    const handleInvite = (targetId: string) => {
        p2p.inviteToRoom(targetId, `room_${user.id}_${Date.now()}`);
        setShowInvite(false);
    };

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto w-full bg-white dark:bg-slate-900 shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500 ring-1 ring-white/10 relative">
            <header className="p-4 md:p-10 border-b-4 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl z-20">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-3 md:p-5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl md:rounded-3xl transition-all active:scale-90"><ArrowLeft size={24} className="md:w-8 md:h-8"/></button>
                    <div className="flex flex-col">
                         <h2 className="text-lg md:text-3xl font-black tracking-tighter line-clamp-1">{isHost ? "Your Portal" : friend?.username}</h2>
                         <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase opacity-40">Live</span>
                         </div>
                    </div>
                </div>
                
                <div className="flex gap-2 md:gap-3">
                    {isHost && (
                        <button onClick={() => setShowInvite(true)} className="p-3 md:p-5 bg-vibe text-white rounded-2xl md:rounded-3xl hover:scale-105 transition-all shadow-xl shadow-vibe/20">
                            <Share2 size={24} className="md:w-8 md:h-8"/>
                        </button>
                    )}
                    <button onClick={onLeave} className="p-3 md:p-5 bg-rose-50/50 dark:bg-rose-900/20 text-rose-500 rounded-2xl md:rounded-3xl hover:bg-rose-500 hover:text-white transition-all">
                        <LogOut size={24} className="md:w-8 md:h-8"/>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-4 md:space-y-8 no-scrollbar bg-[radial-gradient(circle_at_center,_var(--theme-primary-soft)_0%,_transparent_100%)] dark:bg-none">
                {messages.length === 0 && isHost && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <Share2 size={48} className="mb-4 md:mb-6 animate-bounce md:w-16 md:h-16"/>
                        <h3 className="text-xl md:text-2xl font-black">Portal Initialized</h3>
                        <p className="mt-2 text-sm md:text-base font-medium">Invite friends to start the signal.</p>
                    </div>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.sender_id === user.id ? 'items-end' : 'items-start'} animate-message-pop`}>
                        <div className={`px-6 py-4 md:px-10 md:py-6 rounded-3xl md:rounded-[3rem] shadow-xl md:shadow-2xl max-w-[85%] md:max-w-3xl font-bold border-2 md:border-4 border-transparent ${m.sender_id === user.id ? 'bg-vibe text-white border-white/10' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:border-white/5'}`}>
                            {m.type === 'text' && <p className="text-lg md:text-2xl leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                            {m.type === 'ai' && <p className="text-lg md:text-2xl leading-relaxed text-emerald-500 italic">{m.content}</p>}
                            {m.type === 'image' && <img src={m.media_url} className="rounded-2xl md:rounded-3xl max-h-[300px] md:max-h-[500px] border-4 border-white/10" />}
                            {m.type === 'voice' && (
                                <div className="flex items-center gap-3 md:gap-4 min-w-[200px] md:min-w-[300px]">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse"><Radio size={20} className="md:w-6 md:h-6"/></div>
                                    <audio src={m.media_url} controls className="h-8 md:h-10 filter invert dark:invert-0 w-full" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 md:mt-3 px-4 md:px-8">
                           {m.sender_id === 'ai' && <Zap size={12} className="text-amber-500 md:w-3.5 md:h-3.5"/>}
                           <span className="text-[9px] md:text-[10px] font-black uppercase opacity-40 tracking-[0.2em] md:tracking-[0.3em]">{m.sender_name}</span>
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} className="h-20" />
            </div>

            <div className="p-4 md:p-12 border-t-4 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl">
                <Card className={`flex items-center gap-3 md:gap-6 !p-3 md:!p-4 shadow-2xl border-2 md:border-4 dark:border-white/10 !rounded-[2.5rem] md:!rounded-[3.5rem] bg-white dark:bg-slate-950 transition-all ${imagePreview ? 'flex-col items-stretch !rounded-[2rem]' : ''}`}>
                    {imagePreview && (
                        <div className="relative w-full h-40 md:h-60 rounded-3xl overflow-hidden border-4 border-white/10 bg-black/50 mb-2 group">
                            <img src={imagePreview} className="w-full h-full object-contain" />
                            <button onClick={() => setImagePreview(null)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors">
                                <XCircle size={24}/>
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3 md:gap-6 w-full">
                        <div className="flex gap-1 md:gap-2">
                            <label className={`p-3 md:p-5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer ${imagePreview ? 'text-vibe' : 'text-slate-400 hover:text-vibe'}`}>
                                <ImageIcon size={24} className="md:w-9 md:h-9"/>
                                <input type="file" className="hidden" accept="image/*" onChange={onImageChange} />
                            </label>
                            <button onClick={toggleRecording} className={`p-3 md:p-5 rounded-full transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-vibe'}`}>
                                {isRecording ? <MicOff size={24} className="md:w-9 md:h-9"/> : <Mic size={24} className="md:w-9 md:h-9"/>}
                            </button>
                        </div>
                        
                        {!imagePreview && (
                            <input 
                                value={input} 
                                onChange={e => setInput(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSend()} 
                                className="flex-1 bg-transparent outline-none font-black text-xl md:text-3xl px-2 md:px-6 placeholder:opacity-20 placeholder:text-slate-400 min-w-0" 
                                placeholder="Signal..." 
                            />
                        )}
                        {imagePreview && <div className="flex-1 text-slate-400 font-bold px-4 italic">Image attached...</div>}
                        
                        <button onClick={handleSend} className={`w-14 h-14 md:w-20 md:h-20 bg-vibe text-white rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-vibe/40 active:scale-90 transition-all hover:brightness-110 shrink-0 ${!input.trim() && !imagePreview ? 'opacity-50 grayscale' : ''}`}>
                            <Send size={24} className="md:w-10 md:h-10"/>
                        </button>
                    </div>
                </Card>
            </div>

            {/* Invite Modal Overlay */}
            {showInvite && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 md:p-20 animate-in fade-in">
                    <Card className="w-full max-w-2xl !p-6 md:!p-12 space-y-6 md:space-y-8 relative !rounded-4xl md:!rounded-5xl shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                        <button onClick={() => setShowInvite(false)} className="absolute top-4 right-4 md:top-8 md:right-8 p-3 md:p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><XCircle size={24} className="md:w-8 md:h-8"/></button>
                        <h3 className="text-2xl md:text-4xl font-black">Invite Friends</h3>
                        <div className="space-y-3 md:space-y-4 max-h-[300px] md:max-h-[400px] overflow-y-auto no-scrollbar">
                            {friendsList.map(f => (
                                <button key={f.id} onClick={() => handleInvite(f.id)} className="w-full flex items-center justify-between p-4 md:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl md:rounded-3xl hover:bg-vibe hover:text-white group transition-all">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center"><UserIcon size={20} className="md:w-6 md:h-6"/></div>
                                        <span className="text-lg md:text-xl font-black">{f.username}</span>
                                    </div>
                                    <Send size={20} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 md:w-6 md:h-6"/>
                                </button>
                            ))}
                            {friendsList.length === 0 && <p className="text-center opacity-50 py-10 font-bold">No friends to invite yet.</p>}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default App;