import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Heart, Users, Send, Gamepad2, MessageCircle, 
  LogOut, Plus, Play, Bot, ArrowLeft, 
  Trash2, X, Mic, Image as ImageIcon, CheckCheck, 
  Palette, StopCircle, Volume2, Camera, FileUp, 
  Pause, Check, Reply, Settings, Pencil, Eraser,
  Globe, Copy, Info, Zap, Share2, Moon, Sun, Paperclip, Search, Bell, Loader2, Signal, Clock, Eye, EyeOff, Brain, CornerUpLeft, RefreshCw, Cloud, AlertTriangle, Database, Mail, Smile, MoreHorizontal
} from 'lucide-react';
import * as API from './services/storage';
import * as AI from './services/geminiService';
import { cloud } from './services/peerService'; 
import { User, DuoSpace, Message, ThemeColor, JoinRequest, P2PPayload, GameState } from './types';
import { Button, Input, Card, Badge } from './components/Common';

const ConfigModal = ({ onClose }: { onClose: () => void }) => {
    const [url, setUrl] = useState(cloud.dbUrl || '');
    const save = () => {
        if (!url.trim()) return;
        localStorage.setItem('duospace_custom_db_url', url.trim());
        window.location.reload();
    };
    const reset = () => {
        localStorage.removeItem('duospace_custom_db_url');
        window.location.reload();
    };
    return (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <Card className="w-full max-w-md !p-8 bg-white dark:bg-slate-900 border-none shadow-5xl space-y-6 text-slate-900 dark:text-white">
                 <div className="flex items-center gap-4 text-rose-500">
                    <Database size={32} />
                    <h3 className="text-2xl font-black">Database Connection</h3>
                 </div>
                 <p className="text-sm font-medium opacity-70">
                    Connection failed. Ensure your Realtime Database URL is configured correctly.
                 </p>
                 <Input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="https://..." 
                    label="Database URL"
                 />
                 <div className="flex gap-3 pt-2">
                    <Button variant="ghost" onClick={reset}>Reset</Button>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={save}>Save & Sync</Button>
                 </div>
            </Card>
        </div>
    );
}

const Sketchpad = ({ onSave, onCancel }: { onSave: (dataUrl: string) => void, onCancel: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#7c3aed');
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) { canvas.width = rect.width; canvas.height = rect.height; }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 6;
      ctx.strokeStyle = color;
      ctxRef.current = ctx;
    }
  }, []);
  useEffect(() => { if (ctxRef.current) ctxRef.current.strokeStyle = color; }, [color]);
  const getPos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const colors = ['#000000', '#ffffff', '#7c3aed', '#f43f5e', '#ef4444', '#0ea5e9', '#10b981', '#f59e0b'];
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in">
      <Card className="w-full max-w-lg h-[80vh] flex flex-col !p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-5xl">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
           <h3 className="font-black text-xl dark:text-white">Sketch Dimension</h3>
           <button onClick={onCancel} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 touch-none cursor-crosshair relative">
          <canvas ref={canvasRef}
            onMouseDown={(e) => { setIsDrawing(true); const p = getPos(e); ctxRef.current?.beginPath(); ctxRef.current?.moveTo(p.x, p.y); }}
            onMouseMove={(e) => { if (isDrawing) { const p = getPos(e); ctxRef.current?.lineTo(p.x, p.y); ctxRef.current?.stroke(); } }}
            onMouseUp={() => { setIsDrawing(false); ctxRef.current?.closePath(); }}
            onTouchStart={(e) => { setIsDrawing(true); const p = getPos(e); ctxRef.current?.beginPath(); ctxRef.current?.moveTo(p.x, p.y); }}
            onTouchMove={(e) => { if (isDrawing) { const p = getPos(e); ctxRef.current?.lineTo(p.x, p.y); ctxRef.current?.stroke(); } }}
            onTouchEnd={() => { setIsDrawing(false); ctxRef.current?.closePath(); }}
            className="w-full h-full" />
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-full shadow-lg">
                {colors.map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
            </div>
        </div>
        <div className="p-6 flex gap-3 bg-white dark:bg-slate-900">
          <Button variant="secondary" onClick={() => ctxRef.current?.clearRect(0,0,canvasRef.current!.width, canvasRef.current!.height)} className="flex-1">Clear</Button>
          <Button onClick={() => onSave(canvasRef.current!.toDataURL())} className="flex-1">Send Drawing</Button>
        </div>
      </Card>
    </div>
  );
};

const Auth = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) { setError("All fields required"); return; }
    setError(''); setLoading(true);
    try {
        const user = isRegister ? await cloud.register(username, password) : await cloud.login(username, password);
        API.saveSession({ user });
        onLogin(user);
    } catch (err: any) { setError(err.message || "Auth failed"); } finally { setLoading(false); }
  };
  return (
    <div className="h-full flex flex-col items-center justify-center p-10 space-y-10 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4 animate-in slide-in-from-top-10 duration-1000">
        <div className="w-24 h-24 bg-vibe mx-auto rounded-[2rem] flex items-center justify-center text-white shadow-5xl rotate-3 hover:rotate-0 transition-transform duration-500">
          <Heart size={48} fill="currentColor" />
        </div>
        <div>
          {/* VISIBILITY FIX: Switched to bg-clip-text gradient for max visibility on white backgrounds */}
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-vibe tracking-tighter mb-2 drop-shadow-sm">DuoSpace</h1>
          <p className="text-[10px] font-black uppercase text-vibe-primary tracking-[0.5em] opacity-60 text-center">
              {isRegister ? 'Begin Your Story' : 'Private Dimension'}
          </p>
        </div>
      </div>
      <Card className="w-full max-w-sm !p-10 space-y-8 bg-white dark:bg-slate-900 border-none shadow-5xl rounded-[3rem]">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button onClick={() => { setIsRegister(false); setError(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isRegister ? 'bg-white dark:bg-slate-700 text-vibe-primary shadow-sm' : 'text-slate-400'}`}>Sign In</button>
            <button onClick={() => { setIsRegister(true); setError(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isRegister ? 'bg-white dark:bg-slate-700 text-vibe-primary shadow-sm' : 'text-slate-400'}`}>Sign Up</button>
        </div>
        <div className="space-y-4">
            <Input label="Username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Unique Name" />
            <Input label="Password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Secret Key" icon={showPassword ? <EyeOff size={20}/> : <Eye size={20}/>} onIconClick={() => setShowPassword(!showPassword)} />
        </div>
        {error && <p className="text-xs font-bold text-rose-500 text-center animate-pulse">{error}</p>}
        <Button onClick={handleSubmit} isLoading={loading} className="w-full py-5 rounded-3xl font-black uppercase tracking-widest text-[11px]">{isRegister ? 'Create World' : 'Enter Dimension'}</Button>
      </Card>
    </div>
  );
};

const Dashboard = ({ user }: { user: User }) => {
  const [spaces, setSpaces] = useState<DuoSpace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [searchResult, setSearchResult] = useState<{id: string, username: string} | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'mine' | 'inbox' | 'discover'>('mine');
  const [invites, setInvites] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(cloud.isOnline);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    setSpaces(API.getMySpaces(user.id));
    const interval = setInterval(() => setIsOnline(cloud.isOnline), 2000);
    const connTimer = setTimeout(() => { if (!cloud.isOnline) setConnectionWarning(true); }, 10000);
    const unsubInvites = cloud.subscribeToInvites(user.id, (list) => setInvites(list));
    return () => { clearInterval(interval); clearTimeout(connTimer); unsubInvites(); };
  }, [user.id]);
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchStatus('searching'); setInviteSent(false);
    const result = await cloud.findUser(searchQuery);
    if (result && result.id !== user.id) { setSearchStatus('found'); setSearchResult(result); }
    else { setSearchStatus('not_found'); setSearchResult(null); }
  };
  const sendInvite = async () => {
      if (!searchResult) return;
      await cloud.sendInvite(searchResult.id, { type: 'JOIN_REQUEST', data: { user }, fromUsername: user.username, timestamp: Date.now() });
      setInviteSent(true);
  };
  const handleCreateSpace = () => { const s = API.createSpace(user, newSpaceName); cloud.syncSpace(s); navigate(`/space/${s.id}`); };
  const acceptInvite = (invite: any) => {
       const payload = invite;
       const currentSpaces = API.getMySpaces(user.id);
       let targetSpace = currentSpaces.find(s => s.members.some(m => m.username === payload.fromUsername)) || currentSpaces.find(s => s.ownerId === user.id);
       if (!targetSpace) targetSpace = API.createSpace(user, `${user.username} & ${payload.fromUsername}`);
       if (!targetSpace.members.some(m => m.id === payload.data.user.id)) targetSpace.members.push(payload.data.user);
       cloud.syncSpace(targetSpace); cloud.deleteInvite(user.id, invite.inviteId); navigate(`/space/${targetSpace.id}`);
  };
  return (
    <div className="max-w-md mx-auto h-full flex flex-col p-8 justify-between bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-500">
      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      <header className="flex justify-between items-center py-6">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black dark:text-white tracking-tighter">Worlds</h2>
          <div className="flex items-center gap-2 mt-1 cursor-pointer" onClick={() => connectionWarning && setShowConfig(true)}>
             <div className={`w-2 h-2 rounded-full transition-colors ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : connectionWarning ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`}></div>
             <Badge color={isOnline ? "bg-vibe-soft text-vibe-primary" : connectionWarning ? "bg-rose-100 text-rose-500" : "bg-amber-100 text-amber-500"}>
                {isOnline ? `Online as ${user.username}` : connectionWarning ? 'Config Error' : 'Connecting...'}
             </Badge>
          </div>
        </div>
        <button onClick={() => { API.clearSession(); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-400"><LogOut size={24} /></button>
      </header>
      <nav className="flex gap-2 mb-8 bg-white dark:bg-slate-900 p-2 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <button onClick={() => setView('mine')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'mine' ? 'bg-vibe text-white shadow-lg' : 'text-slate-400'}`}>Home</button>
        <button onClick={() => setView('inbox')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all relative ${view === 'inbox' ? 'bg-vibe text-white shadow-lg' : 'text-slate-400'}`}>
            Inbox {invites.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>}
        </button>
        <button onClick={() => setView('discover')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'discover' ? 'bg-vibe text-white shadow-lg' : 'text-slate-400'}`}>Connect</button>
      </nav>
      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto no-scrollbar pb-10">
        {view === 'mine' && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Active Links</p>
            {spaces.length === 0 ? <div className="text-center opacity-30 py-20"><Users size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-[10px]">No spaces yet</p></div> : spaces.map(s => (
                <Card key={s.id} className="cursor-pointer !p-8 border-none bg-white dark:bg-slate-900 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all" onClick={() => navigate(`/space/${s.id}`)}>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black dark:text-white">{s.name}</h3>
                      <Badge color="bg-emerald-50 text-emerald-500">{s.members.length} Users Linked</Badge>
                    </div>
                    <div className="w-12 h-12 bg-vibe text-white rounded-2xl flex items-center justify-center shadow-vibe"><Play size={24} fill="currentColor" /></div>
                  </div>
                </Card>
            ))}
          </div>
        )}
        {view === 'inbox' && (
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Requests</p>
                {invites.length === 0 ? <div className="text-center opacity-30 py-20"><Mail size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-[10px]">Empty Inbox</p></div> : invites.map(invite => (
                    <Card key={invite.inviteId} className="!p-6 bg-white dark:bg-slate-900 shadow-xl border-l-4 border-vibe-primary animate-in slide-in-from-right-4">
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className="text-xl font-black dark:text-white">{invite.fromUsername}</h4><p className="text-xs text-slate-400 font-medium">Invitation</p></div>
                        </div>
                        <div className="flex gap-3"><Button onClick={() => cloud.deleteInvite(user.id, invite.inviteId)} variant="secondary" className="flex-1 py-3 text-xs">Decline</Button><Button onClick={() => acceptInvite(invite)} className="flex-1 py-3 text-xs">Accept</Button></div>
                    </Card>
                ))}
            </div>
        )}
        {view === 'discover' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Username..." className="flex-1 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-vibe-primary transition-all" />
              <button onClick={handleSearch} className="p-4 bg-vibe text-white rounded-2xl flex items-center justify-center">{searchStatus === 'searching' ? <Loader2 className="animate-spin" size={24}/> : <Search size={24}/>}</button>
            </div>
            {searchStatus === 'found' && searchResult && (
                <Card className="!p-6 bg-white dark:bg-slate-900 shadow-xl animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                      <div><h4 className="text-xl font-black dark:text-white">{searchResult.username}</h4><p className="text-[10px] font-black uppercase text-emerald-500">Online</p></div>
                      {inviteSent ? <div className="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-50 px-4 py-2 rounded-xl"><Check size={16} /> Sent</div> : <Button onClick={sendInvite} className="py-2 px-6 text-xs">Invite</Button>}
                  </div>
                </Card>
            )}
          </div>
        )}
      </div>
      {view === 'mine' && (
        <div className="pt-6">
            <Card className="!p-8 bg-white dark:bg-slate-900 border-none shadow-5xl rounded-[3rem]">
                {showCreate ? <div className="space-y-4"><Input label="World Name" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} placeholder="Our Place" /><div className="flex gap-2"><Button onClick={() => setShowCreate(false)} variant="secondary" className="flex-1">Back</Button><Button onClick={handleCreateSpace} className="flex-1">Create</Button></div></div> : <Button onClick={() => setShowCreate(true)} className="w-full py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest"><Plus size={24} /> New Space</Button>}
            </Card>
        </div>
      )}
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 w-20 ${active ? 'text-vibe -translate-y-2' : 'text-slate-400'}`}>
    <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-vibe/10 shadow-lg' : 'bg-transparent'}`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 26, fill: active ? "currentColor" : "none" })}</div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

const Space = ({ user: currentUser, onUpdateUser }: { user: User, onUpdateUser: (u: User) => void }) => {
  const { spaceId } = useParams();
  const [space, setSpace] = useState<DuoSpace | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'play' | 'vibe'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showSketchpad, setShowSketchpad] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<{ blob: Blob, url: string } | null>(null);
  const [isPlayingDraft, setIsPlayingDraft] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftAudioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const localSpace = API.getSpace(spaceId!);
    if (localSpace) setSpace(localSpace);
    const unsub = cloud.subscribeToSpace(spaceId!, (remoteSpace) => { setSpace(remoteSpace); API.saveSpace(remoteSpace); document.documentElement.setAttribute('data-theme', remoteSpace.theme); });
    const unsubTyping = cloud.subscribeToTyping(spaceId!, (users) => setTypingUsers(users.filter(u => u !== currentUser.id)));
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => { unsub(); unsubTyping(); clearInterval(interval); };
  }, [spaceId, currentUser.id]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [space?.messages, aiLoading, typingUsers]);

  const handleTyping = () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      cloud.setTypingStatus(space!.id, currentUser.id, true);
      typingTimeoutRef.current = setTimeout(() => cloud.setTypingStatus(space!.id, currentUser.id, false), 3000);
  };

  const sendMessage = async (type: 'text' | 'image' | 'voice' | 'file', content: string, fileName?: string) => {
    if (!space) return;
    const msg: Message = { id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.username, content: type === 'text' ? content : `Sent a ${type}`, timestamp: Date.now(), type, mediaUrl: (type !== 'text' ? content : undefined), fileName, replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content } : undefined };
    setReplyingTo(null); cloud.setTypingStatus(space.id, currentUser.id, false);
    cloud.sendMessage(space.id, msg);
    if (type === 'text' && content.toLowerCase().includes('@ai')) {
      setAiLoading(true); const reply = await AI.getAiResponse(content, space.messages || [], currentUser.settings.aiTone);
      cloud.sendMessage(space.id, { id: 'ai-'+Date.now(), senderId: 'ai', senderName: 'Duo AI', content: reply, timestamp: Date.now(), type: 'ai' });
      setAiLoading(false);
    }
  };

  if (!space) return null;
  const winner = space.activeGame?.status === 'won' ? 'X' : null; // Simplified game check

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {showSketchpad && <Sketchpad onCancel={() => setShowSketchpad(false)} onSave={async (url) => { const r = await fetch(url); const b = await r.blob(); const link = await cloud.uploadFile(b, 'images'); sendMessage('image', link); setShowSketchpad(false); }} />}
      <header className="px-8 py-8 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-b border-slate-100 dark:border-slate-800 z-50">
        <button onClick={() => navigate('/')} className="text-slate-400 p-2"><ArrowLeft size={32} /></button>
        <div className="text-center"><h2 className="font-black text-2xl dark:text-white leading-none tracking-tight">{space.name}</h2></div>
        <button onClick={() => setActiveTab('vibe')} className="p-3 bg-vibe-soft text-vibe-primary rounded-2xl"><Settings size={24} /></button>
      </header>
      <div className="flex-1 overflow-y-auto no-scrollbar relative p-8 space-y-2 pb-56">
        {activeTab === 'chat' && (
          <>
            {(space.messages || []).map((m, i, arr) => {
              const isMe = m.senderId === currentUser.id;
              return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 group`}>
                <div className={`px-6 py-4 font-bold shadow-sm max-w-[85%] relative rounded-[2.5rem] ${isMe ? 'bg-vibe text-white' : 'bg-white dark:bg-slate-800 dark:text-white border dark:border-slate-700'}`}>
                  {m.type === 'image' && <img src={m.mediaUrl} className="rounded-3xl mb-3 w-full max-h-[30rem] object-cover shadow-inner" />}
                  <p className="whitespace-pre-wrap leading-relaxed text-lg">{m.content}</p>
                </div>
                <div className="mt-1 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Delivered</span></div>
              </div>
            )})}
            {aiLoading && <div className="flex flex-col items-start mt-4 animate-in fade-in"><div className="px-6 py-4 rounded-[2rem] bg-emerald-50 dark:bg-emerald-950 border border-emerald-100"><Loader2 className="animate-spin text-emerald-500" size={24} /></div></div>}
            
            {/* TYPING INDICATOR UI */}
            {typingUsers.map(uid => {
                const tu = space.members.find(m => m.id === uid);
                return (
                    <div key={uid} className="flex flex-col items-start mt-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="px-6 py-3.5 rounded-[2rem] rounded-tl-sm bg-white dark:bg-slate-800 text-slate-500 flex items-center gap-3 border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex gap-1.5 items-center">
                                <div className="w-1.5 h-1.5 bg-vibe-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-vibe-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-vibe-primary rounded-full animate-bounce"></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{tu?.username} typing</span>
                        </div>
                    </div>
                );
            })}
            <div ref={scrollRef} />
          </>
        )}
      </div>
      <div className="fixed bottom-36 left-0 right-0 px-8 z-50">
          <div className="max-w-5xl mx-auto glass rounded-[3.5rem] shadow-5xl border border-white/20 overflow-hidden relative">
             <div className="p-4 flex items-center gap-4 h-[5.5rem]">
                <button onClick={() => setShowSketchpad(true)} className="p-4 text-slate-400"><Pencil size={28}/></button>
                <input value={chatInput} onChange={e => { setChatInput(e.target.value); handleTyping(); }} placeholder="Type a message..." onKeyDown={(e) => { if(e.key === 'Enter' && chatInput.trim()) { sendMessage('text', chatInput); setChatInput(''); } }} className="flex-1 bg-transparent px-4 outline-none font-bold dark:text-white placeholder:text-slate-300 text-lg" />
                <button onClick={() => { if(chatInput.trim()) { sendMessage('text', chatInput); setChatInput(''); }}} className="w-16 h-16 bg-vibe text-white rounded-[2rem] flex items-center justify-center shadow-2xl"><Send size={28}/></button>
             </div>
          </div>
      </div>
      <nav className="h-32 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-12 pb-10 z-50">
        <NavBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle />} label="Chat" />
        <NavBtn active={activeTab === 'play'} onClick={() => setActiveTab('play')} icon={<Gamepad2 />} label="Arena" />
        <NavBtn active={activeTab === 'vibe'} onClick={() => setActiveTab('vibe')} icon={<Palette />} label="Vibe" />
      </nav>
    </div>
  );
};

const MainLayout = ({ user, onUpdateUser }: { user: User, onUpdateUser: (u: User) => void }) => {
    useEffect(() => { cloud.initialize(user, () => {}); }, [user.id]);
    return (<Routes><Route path="/" element={<Dashboard user={user} />} /><Route path="/space/:spaceId" element={<Space user={user} onUpdateUser={onUpdateUser} />} /></Routes>);
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const s = API.getSession(); if (s) setUser(s.user); setLoading(false); }, []);
  useEffect(() => {
      if (user?.settings.darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  }, [user?.settings.darkMode]);
  if (loading) return null;
  return (<HashRouter>{!user ? <Auth onLogin={setUser} /> : <MainLayout user={user} onUpdateUser={setUser} />}</HashRouter>);
};
export default App;