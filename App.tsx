import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Send, Gamepad2, LogOut, Plus, ArrowLeft, 
  Search, User as UserIcon, Zap, MessageCircle, Bell, UserPlus, 
  CheckCircle2, Rocket, Waves, XCircle, Settings, Image as ImageIcon,
  Mic, MicOff, Moon, Sun, ShieldCheck, Users, Palette, Radio, Share2,
  LayoutGrid, Users2, Trash2, Power, PlugZap, Music2, PenTool, Eraser, MoreVertical, Edit2, Play, Pause, ExternalLink, ListMusic, Eye, EyeOff, Activity, Trophy, StopCircle,
  ChevronUp, ChevronDown, PlayCircle, Copy, Loader2
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

// --- COMPONENTS ---
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up w-[90%] md:w-auto">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10 ring-4 ring-black/5">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"/>
                <span className="font-bold text-sm leading-tight">{message}</span>
            </div>
            <button onClick={onClose} className="hover:text-emerald-400 opacity-50 hover:opacity-100 transition-opacity shrink-0"><XCircle size={20}/></button>
        </div>
    </div>
);

const InboxModal = ({ inbox, onAction, onClose }: { inbox: any[], onAction: (req:any, idx:number) => void, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <Card className="w-full max-w-sm !p-6 space-y-4 !rounded-2xl border-2 border-white/20 relative shadow-2xl bg-white dark:bg-slate-900">
             <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-lg flex items-center gap-2"><Bell size={20} className="text-emerald-500"/> Inbox</h3>
                <button onClick={onClose}><XCircle size={20} className="text-slate-400 hover:text-rose-500"/></button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {inbox.length === 0 ? (
                    <p className="text-center text-slate-500 py-4 italic text-sm">No pending requests.</p>
                ) : (
                    inbox.map((req: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl animate-message-pop border border-transparent hover:border-vibe/20">
                            <div>
                                <p className="font-bold text-sm">{req.user.username}</p>
                                <p className="text-[9px] uppercase font-black opacity-50">
                                    {req.type === 'friend_request' ? 'Friend Request' : 'Room Invite'}
                                </p>
                            </div>
                            <button onClick={() => onAction(req, i)} className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold shadow-lg active:scale-95 transition-all ${req.type === 'friend_request' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-vibe shadow-vibe/30'}`}>
                                {req.type === 'friend_request' ? 'Accept' : 'Join'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </Card>
    </div>
);

const InviteModal = ({ onClose, friends, user }: { onClose: () => void, friends: Friend[], user: User }) => {
    const [code, setCode] = useState('');
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [sentIds, setSentIds] = useState<string[]>([]);
    const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const handleInviteFriend = async (friendId: string) => {
        setInvitingId(friendId);
        await p2p.inviteToRoom(friendId, user.id); 
        setTimeout(() => {
            setInvitingId(null);
            setSentIds(prev => [...prev, friendId]);
        }, 800);
    };

    const handleAddFriend = () => {
        if (!code.trim()) return;
        setAddStatus('loading');
        p2p.sendFriendRequest(code.trim());
        setTimeout(() => {
            setAddStatus('success');
            setCode('');
            setTimeout(() => setAddStatus('idle'), 2000);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-md !p-0 !rounded-2xl border-2 border-white/20 relative shadow-2xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                    <div>
                         <h3 className="text-lg font-black tracking-tight">Invite to Space</h3>
                         <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Manage Access</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors"><XCircle size={24}/></button>
                </div>
                
                <div className="overflow-y-auto p-4 space-y-4 flex-1">
                    {/* Friends List Section */}
                    <div>
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-3 flex items-center gap-2"><Users size={14}/> Your Circle</h4>
                        <div className="space-y-2">
                            {friends.length === 0 ? (
                                <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    No friends yet.<br/>Add a friend below using their Signal Code!
                                </p>
                            ) : (
                                friends.map(f => {
                                    const isSent = sentIds.includes(f.id);
                                    const isLoading = invitingId === f.id;
                                    return (
                                        <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent hover:border-vibe/20 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-vibe-soft text-vibe-primary flex items-center justify-center font-bold text-xs">{f.username[0].toUpperCase()}</div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{f.username}</span>
                                                    <span className="text-[9px] uppercase font-black text-slate-400">{f.status}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => !isSent && handleInviteFriend(f.id)}
                                                disabled={isSent || isLoading}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                                    isSent 
                                                    ? 'bg-emerald-500 text-white' 
                                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-vibe hover:text-white shadow-sm'
                                                }`}
                                            >
                                                {isLoading ? <Loader2 size={14} className="animate-spin"/> : isSent ? <CheckCircle2 size={14}/> : <Send size={14}/>}
                                                {isSent ? 'Sent' : 'Invite'}
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    <div className="border-t dark:border-white/5 my-4"></div>

                    {/* Add New Friend Section */}
                    <div>
                        <h4 className="text-xs font-black uppercase text-slate-400 mb-3 flex items-center gap-2"><Plus size={14}/> Add New Connection</h4>
                        <div className="flex gap-2">
                            <Input 
                                value={code} 
                                onChange={e => setCode(e.target.value)} 
                                placeholder="Enter Signal Code..." 
                                className="!py-2.5 font-mono text-sm" 
                            />
                            <Button 
                                onClick={handleAddFriend} 
                                disabled={!code.trim() || addStatus === 'loading'} 
                                className={`shrink-0 !py-2.5 min-w-[80px] ${addStatus === 'success' ? '!bg-emerald-500' : ''}`}
                            >
                                {addStatus === 'loading' ? <Loader2 size={16} className="animate-spin"/> : addStatus === 'success' ? <CheckCircle2 size={16}/> : 'Add'}
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                            Sending a request sends a notification to their Inbox. Once they accept, they will appear in your circle above.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
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
  const [toast, setToast] = useState<string | null>(null);

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
            onInbox: (req) => {
                setInbox(prev => [...prev, req]);
            },
            onConnectionsChanged: (conns) => setActiveSessions(conns),
            onFriendAdded: (f) => {
                setFriends(prev => {
                    if (prev.find(existing => existing.id === f.id)) return prev;
                    const next = [...prev, { id: f.id, username: f.username, status: 'online' }];
                    localStorage.setItem('duospace_friends_v5', JSON.stringify(next));
                    return next;
                });
                setToast(`Friend added: ${f.username}`);
                setTimeout(() => setToast(null), 3000);
            }
        });
        if (view === 'auth') setView('dash');
    }
  }, [user]);

  // Handle Toast Notifications
  useEffect(() => {
      if (status === 'req_sent') {
          setToast("Request sent waiting for them to reply");
          const t = setTimeout(() => { setToast(null); }, 3000);
          return () => clearTimeout(t);
      }
      if (status === 'error') {
          setToast("Connection failed. Check ID and try again.");
          setTimeout(() => setToast(null), 4000);
      }
      if (status === 'not_found') {
          setToast("User not found. Check the Signal Code.");
          setTimeout(() => setToast(null), 4000);
      }
      if (status === 'self_connect') {
          setToast("You cannot add yourself.");
          setTimeout(() => setToast(null), 4000);
      }
      if (status === 'taken') {
          setToast("ID Taken / Unavailable.");
          setTimeout(() => setToast(null), 4000);
      }
  }, [status]);

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

  // Shared Inbox Action Handler
  const handleInboxAction = (req: any, index: number) => {
      if (req.type === 'room') {
          setActiveFriend(req.user);
          p2p.connectToRoom(req.user.id);
          setView('room');
      } else if (req.type === 'friend_request') {
          p2p.confirmFriendReq(req.user);
      }
      setInbox(prev => prev.filter((_, i) => i !== index));
  };

  if (!user) return <Auth onLogin={setUser} />;
  
  return (
    <div className={`h-full flex flex-col transition-colors duration-500 theme-${user.settings.theme} ${user.settings.darkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} overflow-hidden`}>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        
        {view === 'dash' && (
            <Dashboard 
                user={user} 
                friends={friends} 
                inbox={inbox} 
                onInboxAction={handleInboxAction} 
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
                inbox={inbox}
                onInboxAction={handleInboxAction}
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

// ... Auth Component (Unchanged) ...
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

// ... Dashboard Component ...
const Dashboard = ({ user, friends, inbox, onInboxAction, setView, setActiveFriend, updateSettings, setFriends, onLogout, activeSessions, isHostingSession, setIsHostingSession }: any) => {
    const [search, setSearch] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [mobileTab, setMobileTab] = useState<'portal' | 'friends'>('portal');

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
                        <div className="flex flex-col min-w-0 flex-1 mr-2">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Your Signal Code</span>
                            <span className="font-mono text-sm font-bold text-vibe-primary break-all">{user.id}</span>
                        </div>
                        <div className="p-2 text-slate-400 group-hover:text-vibe-primary transition-colors shrink-0">
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
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Add Friend Code..." icon={<UserPlus size={16}/>} onIconClick={() => { p2p.sendFriendRequest(search.trim()); setSearch(''); }} className="!rounded-xl" />
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
                                        <button onClick={() => onInboxAction(req, i)} className={`p-2 text-white rounded-lg ${req.type === 'friend_request' ? 'bg-emerald-500' : 'bg-vibe'}`}>
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

const SettingsPanel = ({ user, updateSettings, onClose, onLogout }: { user: User, updateSettings: (s: any) => void, onClose: () => void, onLogout: () => void }) => {
    const themes: ThemeColor[] = ['violet', 'rose', 'emerald', 'sky', 'amber'];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end md:pr-0 bg-black/20 backdrop-blur-sm animate-in fade-in">
             <div className="w-full md:w-[400px] h-full bg-white dark:bg-slate-950 border-l dark:border-slate-800 shadow-2xl p-6 overflow-y-auto animate-slide-left">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black tracking-tighter">Configuration</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full"><XCircle/></button>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Interface Theme</h3>
                        <div className="flex gap-3">
                            {themes.map(t => (
                                <button 
                                    key={t}
                                    onClick={() => updateSettings({ theme: t })}
                                    className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${user.settings.theme === t ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: `var(--theme-${t}-primary)` }}
                                />
                            ))}
                        </div>
                    </section>

                    <section>
                         <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Display</h3>
                         <div className="space-y-3">
                             <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                 <div className="flex items-center gap-3">
                                     <Moon size={20}/>
                                     <span className="font-bold text-sm">Dark Mode</span>
                                 </div>
                                 <input type="checkbox" checked={user.settings.darkMode} onChange={e => updateSettings({ darkMode: e.target.checked })} className="toggle" />
                             </div>
                         </div>
                    </section>

                    <section>
                         <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Privacy</h3>
                         <div className="space-y-3">
                             <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                 <div className="flex items-center gap-3">
                                     <Eye size={20}/>
                                     <span className="font-bold text-sm">Last Seen</span>
                                 </div>
                                 <input type="checkbox" checked={user.settings.showLastSeen} onChange={e => updateSettings({ showLastSeen: e.target.checked })} className="toggle" />
                             </div>
                             <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                 <div className="flex items-center gap-3">
                                     <CheckCircle2 size={20}/>
                                     <span className="font-bold text-sm">Read Receipts</span>
                                 </div>
                                 <input type="checkbox" checked={user.settings.readReceipts} onChange={e => updateSettings({ readReceipts: e.target.checked })} className="toggle" />
                             </div>
                         </div>
                    </section>
                    
                    <section>
                         <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">AI Personality</h3>
                         <div className="grid grid-cols-2 gap-3">
                             {['playful', 'serious'].map((tone) => (
                                 <button
                                    key={tone}
                                    onClick={() => updateSettings({ aiTone: tone })}
                                    className={`p-3 rounded-xl border-2 font-bold text-sm capitalize transition-all ${user.settings.aiTone === tone ? 'border-vibe text-vibe bg-vibe-soft' : 'border-transparent bg-slate-50 dark:bg-slate-900'}`}
                                 >
                                     {tone}
                                 </button>
                             ))}
                         </div>
                    </section>

                    <Button variant="danger" onClick={onLogout} className="w-full !py-4 mt-8">Disconnect Identity</Button>
                </div>
             </div>
        </div>
    );
};

const PongGame = ({ isHost, p1Name, p2Name, onClose }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState({ p1: 0, p2: 0 });
    const [status, setStatus] = useState('waiting');
    
    // Game State Refs (for loop)
    const state = useRef<PongState>({
        ball: { x: 300, y: 200, dx: 5, dy: 5 },
        p1Y: 150, p2Y: 150,
        score: { p1: 0, p2: 0 },
        gameStatus: 'intro',
        countdown: 3
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let animationId: number;
        
        // Host Input Handlers
        const handleHostInput = (e: any) => { state.current.p2Y = e.detail.p2Y; };
        // Guest Sync Handler
        const handleSync = (e: any) => {
            if (!isHost) {
                state.current = { ...state.current, ...e.detail };
                setScore(e.detail.score);
                setStatus(e.detail.gameStatus);
                if (e.detail.gameStatus === 'ended') onClose();
            }
        };

        if (isHost) {
            window.addEventListener('p2p_game_host_input', handleHostInput);
        } else {
            window.addEventListener('p2p_game_sync', handleSync);
        }

        const update = () => {
            if (isHost && state.current.gameStatus === 'playing') {
                // Physics
                let { ball, p1Y, p2Y } = state.current;
                ball.x += ball.dx;
                ball.y += ball.dy;

                // Walls
                if (ball.y <= 0 || ball.y >= 400) ball.dy *= -1;

                // Paddles (p1 is left, p2 is right)
                if (ball.x <= 20 && ball.y >= p1Y && ball.y <= p1Y + 100) {
                    ball.dx *= -1.1; ball.x = 20;
                }
                if (ball.x >= 580 && ball.y >= p2Y && ball.y <= p2Y + 100) {
                    ball.dx *= -1.1; ball.x = 580;
                }

                // Score
                if (ball.x < 0) {
                    state.current.score.p2++;
                    resetBall();
                } else if (ball.x > 600) {
                    state.current.score.p1++;
                    resetBall();
                }
                
                // Win condition
                if (state.current.score.p1 >= 5 || state.current.score.p2 >= 5) {
                    state.current.gameStatus = 'ended';
                }

                // Sync
                p2p.send({ type: 'GAME_SYNC', payload: state.current });
                setScore({ ...state.current.score });
            }

            draw();
            animationId = requestAnimationFrame(update);
        };

        const resetBall = () => {
            state.current.ball = { x: 300, y: 200, dx: (Math.random() > 0.5 ? 5 : -5), dy: (Math.random() > 0.5 ? 5 : -5) };
        };

        const draw = () => {
            // Draw logic
            ctx.fillStyle = '#0f172a'; // dark bg
            ctx.fillRect(0, 0, 600, 400);
            
            // Net
            ctx.setLineDash([10, 15]);
            ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(300, 400);
            ctx.strokeStyle = '#334155'; ctx.stroke();

            // Ball
            ctx.beginPath(); ctx.arc(state.current.ball.x, state.current.ball.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981'; ctx.fill();

            // Paddles
            ctx.fillStyle = '#6366f1'; // p1 indigo
            ctx.fillRect(10, state.current.p1Y, 10, 100);
            ctx.fillStyle = '#f43f5e'; // p2 rose
            ctx.fillRect(580, state.current.p2Y, 10, 100);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top - 50; // center paddle
            // Clamp
            const clampedY = Math.max(0, Math.min(300, y));

            if (isHost) {
                state.current.p1Y = clampedY;
            } else {
                // Send to host
                p2p.send({ type: 'GAME_INPUT', payload: { p2Y: clampedY } });
            }
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        if (isHost && state.current.gameStatus === 'intro') {
            state.current.gameStatus = 'playing'; // Simplify start for now
            update(); 
        } else if (!isHost) {
            update(); // Start loop for guest (rendering only)
        }

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('p2p_game_host_input', handleHostInput);
            window.removeEventListener('p2p_game_sync', handleSync);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isHost]);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
             <div className="mb-4 flex items-center justify-between w-full max-w-[600px] text-white">
                 <div className="flex flex-col items-start">
                     <span className="text-xs font-black uppercase text-indigo-500">{p1Name}</span>
                     <span className="text-4xl font-black">{score.p1}</span>
                 </div>
                 <div className="text-2xl font-black tracking-widest opacity-20">VS</div>
                 <div className="flex flex-col items-end">
                     <span className="text-xs font-black uppercase text-rose-500">{p2Name}</span>
                     <span className="text-4xl font-black">{score.p2}</span>
                 </div>
             </div>
             <canvas 
                ref={canvasRef} width={600} height={400} 
                className="w-full max-w-[600px] bg-slate-900 rounded-xl shadow-2xl border border-white/10 touch-none cursor-none"
             />
             <Button onClick={onClose} variant="secondary" className="mt-8">Exit Game</Button>
        </div>
    );
};

const MusicPanel = ({ user, playlist, onUpdatePlaylist, onClose }: any) => {
    const [link, setLink] = useState('');
    const handleAdd = () => {
        const meta = getLinkMetadata(link);
        if (meta) {
            const item: PlaylistItem = {
                id: Date.now().toString(),
                url: meta.url,
                title: `${meta.type} Track`,
                platform: meta.type,
                addedBy: user.username,
                thumbnail: meta.id ? `https://img.youtube.com/vi/${meta.id}/0.jpg` : undefined
            };
            onUpdatePlaylist([...playlist.items, item]);
            setLink('');
        }
    };
    
    return (
        <Card className="h-full !p-0 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t dark:border-white/10 rounded-b-none rounded-t-2xl shadow-2xl animate-slide-up">
            <div className="p-3 border-b dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="font-black flex items-center gap-2"><Music2 size={16}/> Shared Queue</h3>
                <button onClick={onClose}><ChevronDown/></button>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-black/20 shrink-0">
                 <div className="flex gap-2">
                     <Input value={link} onChange={e => setLink(e.target.value)} placeholder="Paste YouTube/Spotify link..." className="!py-2 !text-xs" />
                     <Button onClick={handleAdd} disabled={!link} className="!py-2 !px-3"><Plus size={16}/></Button>
                 </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {playlist.items.length === 0 ? <p className="text-center text-slate-400 text-xs py-8">Queue is empty.</p> : playlist.items.map((item: PlaylistItem, i: number) => (
                    <div key={item.id} className="flex items-center gap-2 group">
                         <div className="flex-1">
                             <MusicCard url={item.url} type={item.platform} id={item.platform === 'youtube' ? item.url.match(/(?:v=|be\/)([\w-]{11})/)?.[1] : undefined} onAddToPlaylist={() => {}} />
                         </div>
                         <button onClick={() => onUpdatePlaylist(playlist.items.filter((_:any, idx:number) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100"><XCircle size={16}/></button>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const SettingsDrawer = ({ settings, toggleSetting, onLeave, onClose }: any) => (
    <Card className="h-full !p-4 flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t dark:border-white/10 rounded-b-none rounded-t-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
             <h3 className="font-black flex items-center gap-2"><Settings size={16}/> Room Settings</h3>
             <button onClick={onClose}><ChevronDown/></button>
        </div>
        <div className="space-y-2">
             <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                 <div className="flex items-center gap-2"><Zap size={16}/><span className="font-bold text-xs">AI Assistant</span></div>
                 <button onClick={() => toggleSetting('aiEnabled')} className={`w-8 h-4 rounded-full transition-colors relative ${settings.aiEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.aiEnabled ? 'left-4.5' : 'left-0.5'}`} /></button>
             </div>
             <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                 <div className="flex items-center gap-2"><Palette size={16}/><span className="font-bold text-xs">Sync Theme</span></div>
                  <button onClick={() => toggleSetting('themeSync')} className={`w-8 h-4 rounded-full transition-colors relative ${settings.themeSync ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.themeSync ? 'left-4.5' : 'left-0.5'}`} /></button>
             </div>
        </div>
        <div className="mt-auto">
            <Button variant="danger" onClick={onLeave} className="w-full">Leave Room</Button>
        </div>
    </Card>
);

const Room = ({ user, friend, friendsList, onBack, initialMessages, onUpdateHistory, onLeave, inbox, onInboxAction }: any) => {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState('');
    const [gameActive, setGameActive] = useState(false);
    const [showSketch, setShowSketch] = useState(false);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showInbox, setShowInbox] = useState(false);
    
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
                {/* Room Actions */}
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setShowInbox(true)}
                        className="p-2 relative hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
                    >
                        <Bell size={20}/>
                        {inbox.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border border-white dark:border-slate-900"></span>}
                    </button>
                    <button 
                        onClick={() => setShowAddFriend(true)} 
                        className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors text-slate-500"
                        title="Add Friend"
                    >
                        <UserPlus size={20}/>
                    </button>
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
            {showAddFriend && <InviteModal friends={friendsList} user={user} onClose={() => setShowAddFriend(false)} />}
            {showInbox && <InboxModal inbox={inbox} onAction={(req: any, i: number) => { onInboxAction(req, i); setShowInbox(false); }} onClose={() => setShowInbox(false)} />}
        </div>
    );
};

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