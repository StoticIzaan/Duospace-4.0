
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Heart, Users, Send, Gamepad2, MessageCircle, 
  LogOut, Plus, Play, Bot, ArrowLeft, 
  Trash2, X, Mic, Image as ImageIcon, CheckCheck, 
  Palette, StopCircle, Volume2, Camera, FileUp, 
  Pause, Check, Reply, Settings, Pencil, Eraser,
  Globe, Copy, Info, Zap, Share2, Moon, Sun, Paperclip, Search, Bell
} from 'lucide-react';
import * as API from './services/storage';
import * as AI from './services/geminiService';
import { User, DuoSpace, Message, ThemeColor, JoinRequest } from './types';
import { Button, Input, Card, Badge } from './components/Common';

// --- Sub-component: Sketchpad ---
const Sketchpad = ({ onSave, onCancel }: { onSave: (dataUrl: string) => void, onCancel: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) { canvas.width = rect.width; canvas.height = rect.height; }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 6;
      ctx.strokeStyle = '#7c3aed';
      ctxRef.current = ctx;
    }
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in">
      <Card className="w-full max-w-lg h-[80vh] flex flex-col !p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-5xl">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
           <h3 className="font-black text-xl dark:text-white">Sketch Dimension</h3>
           <button onClick={onCancel} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 touch-none cursor-crosshair">
          <canvas ref={canvasRef}
            onMouseDown={(e) => { setIsDrawing(true); const p = getPos(e); ctxRef.current?.beginPath(); ctxRef.current?.moveTo(p.x, p.y); }}
            onMouseMove={(e) => { if (isDrawing) { const p = getPos(e); ctxRef.current?.lineTo(p.x, p.y); ctxRef.current?.stroke(); } }}
            onMouseUp={() => { setIsDrawing(false); ctxRef.current?.closePath(); }}
            onTouchStart={(e) => { setIsDrawing(true); const p = getPos(e); ctxRef.current?.beginPath(); ctxRef.current?.moveTo(p.x, p.y); }}
            onTouchMove={(e) => { if (isDrawing) { const p = getPos(e); ctxRef.current?.lineTo(p.x, p.y); ctxRef.current?.stroke(); } }}
            onTouchEnd={() => { setIsDrawing(false); ctxRef.current?.closePath(); }}
            className="w-full h-full" />
        </div>
        <div className="p-6 flex gap-3 bg-white dark:bg-slate-900">
          <Button variant="secondary" onClick={() => ctxRef.current?.clearRect(0,0,canvasRef.current!.width, canvasRef.current!.height)} className="flex-1">Clear</Button>
          <Button onClick={() => onSave(canvasRef.current!.toDataURL())} className="flex-1">Send Drawing</Button>
        </div>
      </Card>
    </div>
  );
};

// --- View: Auth ---
const Auth = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = () => {
    if (!name.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const user: User = {
        id: Math.random().toString(36).substring(2, 11),
        username: name.trim(),
        avatarColor: 'violet',
        settings: { darkMode: true, showLastSeen: true, readReceipts: true, theme: 'violet', aiInChat: true }
      };
      API.saveSession({ user });
      onLogin(user);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-10 space-y-16 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-8 animate-in slide-in-from-top-10 duration-1000">
        <div className="w-28 h-28 bg-vibe mx-auto rounded-[2.5rem] flex items-center justify-center text-white shadow-5xl rotate-6 hover:rotate-0 transition-transform duration-500">
          <Heart size={56} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-6xl font-black dark:text-white tracking-tight mb-2">DuoSpace</h1>
          <p className="text-xs font-black uppercase text-vibe-primary tracking-[0.4em] opacity-80">Premium Private Worlds</p>
        </div>
      </div>
      <Card className="w-full max-w-sm !p-10 space-y-8 bg-white dark:bg-slate-900 border-none shadow-5xl rounded-[3.5rem]">
        <Input label="Your Identity" value={name} onChange={e => setName(e.target.value)} placeholder="Type your username..." onKeyDown={e => e.key === 'Enter' && handleAuth()} />
        <Button onClick={handleAuth} isLoading={loading} className="w-full py-5 rounded-3xl">Enter Dimension</Button>
      </Card>
    </div>
  );
};

// --- View: Dashboard ---
const Dashboard = ({ user }: { user: User }) => {
  const [spaces, setSpaces] = useState<DuoSpace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DuoSpace[]>([]);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [view, setView] = useState<'mine' | 'discover'>('mine');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = () => {
      const db = JSON.parse(localStorage.getItem('duospace_v9_db') || '{"spaces":[], "publicRegistry":[]}');
      const mySpaces = db.spaces.filter((s: any) => s.members.some((m: any) => m.id === user.id));
      setSpaces(mySpaces);
      
      const requests = db.spaces
        .filter((s: any) => s.ownerId === user.id)
        .flatMap((s: any) => s.requests);
      setPendingRequests(requests);
    };
    fetch(); const interval = setInterval(fetch, 2000); return () => clearInterval(interval);
  }, [user.id]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setSearchResults(API.searchByUsername(searchQuery));
  };

  return (
    <div className="max-w-md mx-auto h-full flex flex-col p-8 justify-between bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="flex justify-between items-center py-6">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black dark:text-white tracking-tighter">Worlds</h2>
          <Badge color="bg-vibe-soft text-vibe-primary w-fit mt-1">v9.0 Discovery</Badge>
        </div>
        <div className="flex gap-2">
          {pendingRequests.length > 0 && (
            <div className="relative">
              <button className="p-3 bg-vibe-soft text-vibe-primary rounded-2xl"><Bell size={24}/></button>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">{pendingRequests.length}</div>
            </div>
          )}
          <button onClick={() => { API.clearSession(); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-400 border border-slate-100 dark:border-slate-800"><LogOut size={24} /></button>
        </div>
      </header>

      <nav className="flex gap-4 mb-8">
        <button onClick={() => setView('mine')} className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${view === 'mine' ? 'bg-vibe text-white shadow-xl shadow-vibe/20' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>My Spaces</button>
        <button onClick={() => setView('discover')} className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${view === 'discover' ? 'bg-vibe text-white shadow-xl shadow-vibe/20' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>Discover</button>
      </nav>

      <div className="flex-1 flex flex-col space-y-6 overflow-y-auto no-scrollbar pb-10">
        {view === 'mine' ? (
          <>
            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Join Requests</p>
                {pendingRequests.map(req => (
                  <Card key={req.id} className="!p-6 border-l-4 border-vibe-primary bg-vibe-soft/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-black dark:text-white">{req.fromUser.username}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Wants to join {req.spaceName}</p>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => API.acceptRequest(req.spaceId, req.id)} className="p-2 bg-vibe text-white rounded-xl"><Check size={20}/></button>
                         <button className="p-2 bg-white dark:bg-slate-800 text-rose-500 rounded-xl"><X size={20}/></button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">My Dimensions</p>
              {spaces.length === 0 ? (
                <div className="text-center opacity-30 py-20"><Users size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-[10px]">No private worlds yet</p></div>
              ) : (
                spaces.map(s => (
                  <Card key={s.id} className="cursor-pointer !p-8 border-none bg-white dark:bg-slate-900 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all" onClick={() => navigate(`/space/${s.id}`)}>
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-black dark:text-white">{s.name}</h3>
                        <Badge color="bg-emerald-50 text-emerald-500">{s.members.length}/2 Synced</Badge>
                      </div>
                      <div className="w-12 h-12 bg-vibe text-white rounded-2xl flex items-center justify-center shadow-vibe"><Play size={24} fill="currentColor" /></div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search Username..." className="flex-1 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-vibe-primary transition-all" />
              <button onClick={handleSearch} className="p-4 bg-vibe text-white rounded-2xl"><Search size={24}/></button>
            </div>
            <div className="space-y-4">
              {searchResults.length === 0 && searchQuery ? (
                <p className="text-center text-xs font-bold text-slate-400 py-10">No users found.</p>
              ) : (
                searchResults.map(s => (
                  <Card key={s.id} className="!p-6 flex justify-between items-center border-none shadow-xl bg-white dark:bg-slate-900">
                    <div>
                      <h4 className="text-xl font-black dark:text-white">{s.members[0].username}</h4>
                      <p className="text-[10px] font-black uppercase text-slate-400">{s.name}</p>
                    </div>
                    {s.members.some(m => m.id === user.id) ? (
                       <Badge color="bg-emerald-50 text-emerald-500">Joined</Badge>
                    ) : s.requests.some(r => r.fromUser.id === user.id) ? (
                       <Badge color="bg-amber-50 text-amber-500">Pending</Badge>
                    ) : (
                       <Button onClick={() => { API.sendJoinRequest(user, s.id); handleSearch(); }} variant="secondary" className="px-4 py-2 text-xs">Join</Button>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pt-6">
        <Card className="!p-8 bg-white dark:bg-slate-900 border-none shadow-5xl rounded-[3rem]">
          {showCreate ? (
            <div className="space-y-4 animate-in slide-in-from-top-4">
              <Input label="Dimension Name" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} placeholder="Our Place" />
              <div className="flex gap-2"><Button onClick={() => setShowCreate(false)} variant="secondary" className="flex-1">Back</Button><Button onClick={() => navigate(`/space/${API.createSpace(user, newSpaceName).id}`)} className="flex-1">Create</Button></div>
            </div>
          ) : (
            <Button onClick={() => setShowCreate(true)} className="w-full py-5 rounded-3xl"><Plus size={24} /> New Space</Button>
          )}
        </Card>
      </div>
    </div>
  );
};

// --- View: Space ---
const Space = ({ user: currentUser }: { user: User }) => {
  const { spaceId } = useParams();
  const [space, setSpace] = useState<DuoSpace | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'play' | 'vibe'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showSketchpad, setShowSketchpad] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = () => {
      const s = API.getSpace(spaceId!);
      if (s) {
        setSpace(s);
        document.documentElement.setAttribute('data-theme', s.theme);
        if (currentUser.settings.darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } else navigate('/');
    };
    fetch(); const interval = setInterval(fetch, 2000); return () => clearInterval(interval);
  }, [spaceId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [space?.messages, aiLoading]);

  const sendMessage = async (type: 'text' | 'image' | 'voice' | 'file', content: string, fileName?: string) => {
    if (!space) return;
    const msg: Message = { 
      id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.username, 
      content: type === 'text' ? content : `Sent a ${type}`, timestamp: Date.now(), 
      type, mediaUrl: (type !== 'text' ? content : undefined), fileName, read: false
    };
    const newMsgs = [...space.messages, msg];
    API.updateSpace(space.id, { messages: newMsgs });
    
    if (type === 'text' && content.toLowerCase().includes('@ai')) {
      setAiLoading(true);
      const reply = await AI.getAiResponse(content, newMsgs);
      API.updateSpace(space.id, { 
        messages: [...newMsgs, { 
          id: 'ai-'+Date.now(), senderId: 'ai', senderName: 'Duo AI', 
          content: reply, timestamp: Date.now(), type: 'ai' 
        }] 
      });
      setAiLoading(false);
    }
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => sendMessage('voice', reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) { alert("Mic required for voice notes."); }
  };

  const stopVoice = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      sendMessage(type, reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  if (!space) return null;
  const isAlone = space.members.length < 2;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-700 overflow-hidden">
      {showSketchpad && <Sketchpad onCancel={() => setShowSketchpad(false)} onSave={(url) => { sendMessage('image', url); setShowSketchpad(false); }} />}

      <header className="px-8 py-8 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-b border-slate-100 dark:border-slate-800 z-50">
        <button onClick={() => navigate('/')} className="text-slate-400 p-2 hover:text-vibe-primary transition-all"><ArrowLeft size={32} /></button>
        <div className="text-center">
          <h2 className="font-black text-2xl dark:text-white leading-none tracking-tight">{space.name}</h2>
          <div className="mt-2 flex items-center justify-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isAlone ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">{isAlone ? 'Awaiting Duo' : 'Synced'}</span>
          </div>
        </div>
        <button onClick={() => setActiveTab('vibe')} className="p-3 bg-vibe-soft text-vibe-primary rounded-2xl active:scale-90 transition-all"><Settings size={24} /></button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeTab === 'chat' && (
          <div className="p-8 space-y-10 pb-56">
            {isAlone && (
               <div className="text-center p-14 bg-white/50 dark:bg-slate-900/50 rounded-[4rem] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-md">
                  <Globe size={64} className="mx-auto mb-8 text-vibe-primary animate-spin-slow" />
                  <h4 className="font-black text-2xl dark:text-white mb-4 tracking-tighter">Private Dimension</h4>
                  <p className="text-xs text-slate-500 font-bold max-w-[260px] mx-auto leading-relaxed mb-6">This world is locked. Others can search your username **"{currentUser.username}"** to request access.</p>
                  <Badge color="bg-vibe-soft text-vibe-primary py-3 px-6 text-xs tracking-widest font-black">Searchable Username: {currentUser.username}</Badge>
               </div>
            )}
            {space.messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-700`}>
                <div className={`px-8 py-5 rounded-[2.5rem] font-bold shadow-sm max-w-[88%] ${m.senderId === currentUser.id ? 'bg-vibe text-white rounded-tr-none shadow-2xl shadow-vibe/20' : m.senderId === 'ai' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 rounded-tl-none' : 'bg-white dark:bg-slate-800 dark:text-white rounded-tl-none border border-slate-50 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none'}`}>
                  {m.type === 'image' && <img src={m.mediaUrl} className="rounded-3xl mb-3 w-full max-h-[30rem] object-cover shadow-inner" />}
                  {m.type === 'voice' && <audio src={m.mediaUrl} controls className="w-full h-12 mb-3 rounded-full overflow-hidden brightness-90" />}
                  {m.type === 'file' && <a href={m.mediaUrl} download={m.fileName} className="flex items-center gap-4 p-5 bg-slate-100/50 dark:bg-slate-700/50 rounded-3xl mb-3 border border-slate-200 dark:border-slate-600"><Paperclip size={24}/> <span className="text-sm truncate font-black uppercase tracking-widest">{m.fileName}</span></a>}
                  <p className="whitespace-pre-wrap leading-relaxed text-lg">{m.content}</p>
                </div>
                <div className="mt-3 px-4 flex items-center gap-2 opacity-60">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   {m.senderId === currentUser.id && <CheckCheck size={16} className="text-vibe-primary" />}
                </div>
              </div>
            ))}
            {aiLoading && <div className="flex gap-2 px-8 py-4 animate-pulse"><div className="w-3 h-3 bg-vibe-primary rounded-full"></div><div className="w-3 h-3 bg-vibe-primary rounded-full"></div><div className="w-3 h-3 bg-vibe-primary rounded-full"></div></div>}
            <div ref={scrollRef} />
          </div>
        )}

        {activeTab === 'play' && (
          <div className="h-full flex flex-col items-center justify-center p-8 space-y-16 animate-in zoom-in duration-700">
             <header className="text-center space-y-2">
                <h3 className="text-5xl font-black uppercase tracking-tighter dark:text-white">The Arena</h3>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Combat Sim Synced</p>
             </header>
             <div className="grid grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-10 rounded-[4rem] shadow-5xl border border-slate-100 dark:border-slate-800">
                {space.activeGame.board.map((cell, i) => (
                  <button key={i} onClick={() => {
                    if (space.activeGame.board[i]) return;
                    const board = [...space.activeGame.board];
                    board[i] = board.filter(Boolean).length % 2 === 0 ? 'X' : 'O';
                    API.updateSpace(space.id, { activeGame: { board, status: 'active' }});
                  }} className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-5xl font-black dark:text-white flex items-center justify-center shadow-inner active:scale-90 transition-all hover:bg-slate-100 dark:hover:bg-slate-700">{cell}</button>
                ))}
             </div>
             <Button onClick={() => API.updateSpace(space.id, { activeGame: { board: Array(9).fill(null), status: 'active' }})} variant="secondary" className="px-12 py-4 rounded-full border-dashed font-black uppercase tracking-widest">Reset Combat</Button>
          </div>
        )}

        {activeTab === 'vibe' && (
          <div className="p-10 space-y-12 animate-slide-up pb-48">
             <div className="flex justify-between items-center">
                <h3 className="text-5xl font-black dark:text-white tracking-tighter">Settings</h3>
                <button onClick={() => { 
                   const newSettings = {...currentUser.settings, darkMode: !currentUser.settings.darkMode}; 
                   API.saveSession({user: {...currentUser, settings: newSettings}});
                   window.location.reload(); 
                }} className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl text-vibe-primary transition-all active:scale-90">
                  {currentUser.settings.darkMode ? <Sun size={32}/> : <Moon size={32}/>}
                </button>
             </div>
             <Card className="!p-12 space-y-14 bg-white dark:bg-slate-900 border-none shadow-5xl rounded-[4rem]">
                <section className="space-y-10">
                   <h4 className="text-xs font-black uppercase text-slate-400 tracking-[0.5em]">Theme Accent</h4>
                   <div className="grid grid-cols-3 gap-8">
                      {(['violet', 'rose', 'red', 'sky', 'emerald', 'gold'] as ThemeColor[]).map(t => (
                        <button key={t} onClick={() => API.updateSpace(space.id, { theme: t })} className={`h-20 rounded-[1.8rem] shadow-inner transition-all duration-700 ${space.theme === t ? 'ring-8 ring-vibe ring-offset-4 ring-offset-white dark:ring-offset-slate-900 scale-110' : 'opacity-30 hover:opacity-100'} ${t === 'violet' ? 'bg-violet-600' : t === 'rose' ? 'bg-rose-500' : t === 'red' ? 'bg-red-600' : t === 'sky' ? 'bg-sky-500' : t === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      ))}
                   </div>
                </section>
                <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="danger" className="w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em]" onClick={() => { if(confirm("Purge Dimension?")) { API.deleteSpace(space.id); navigate('/'); }}}>Purge Dimension</Button>
                </div>
             </Card>
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="fixed bottom-36 left-0 right-0 px-8 z-50">
          <div className="max-w-5xl mx-auto glass p-4 rounded-[3.5rem] shadow-5xl border border-white/20 flex items-center gap-4">
             <div className="flex gap-2">
                <label className="p-4 text-slate-400 cursor-pointer hover:text-vibe-primary transition-all active:scale-90"><Paperclip size={28}/><input type="file" className="hidden" onChange={handleFileUpload} /></label>
                <button onClick={() => setShowSketchpad(true)} className="p-4 text-slate-400 hover:text-vibe-primary transition-all active:scale-90"><Pencil size={28}/></button>
             </div>
             <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => { 
                if(e.key === 'Enter' && chatInput.trim()) { sendMessage('text', chatInput); setChatInput(''); }
             }} className="flex-1 bg-transparent px-4 py-5 outline-none font-bold dark:text-white placeholder:text-slate-300 text-lg" />
             {chatInput.trim() ? (
                <button onClick={() => { sendMessage('text', chatInput); setChatInput(''); }} className="w-16 h-16 bg-vibe text-white rounded-[2rem] flex items-center justify-center shadow-2xl active:scale-90 transition-all"><Send size={28}/></button>
             ) : (
                <button onMouseDown={startVoice} onMouseUp={stopVoice} onTouchStart={startVoice} onTouchEnd={stopVoice} className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all shadow-xl ${isRecording ? 'bg-rose-500 scale-150 animate-pulse text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><Mic size={28}/></button>
             )}
          </div>
        </div>
      )}

      <nav className="h-32 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-12 pb-10 z-50">
        <NavBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle />} label="Chat" />
        <NavBtn active={activeTab === 'play'} onClick={() => setActiveTab('play')} icon={<Gamepad2 />} label="Arena" />
        <NavBtn active={activeTab === 'vibe'} onClick={() => setActiveTab('vibe')} icon={<Palette />} label="Vibe" />
      </nav>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all duration-700 ${active ? 'text-vibe-primary scale-110' : 'text-slate-300 opacity-60'}`}>
    <div className={`p-4 rounded-3xl transition-all duration-500 ${active ? 'bg-vibe-soft shadow-xl' : ''}`}>{React.cloneElement(icon, { size: 32, strokeWidth: active ? 3 : 2 })}</div>
    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{label}</span>
  </button>
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const s = API.getSession(); if (s) setUser(s.user); setLoading(false); }, []);
  if (loading) return null;
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={user ? <Dashboard user={user} /> : <Auth onLogin={setUser} />} />
        <Route path="/space/:spaceId" element={user ? <Space user={user} /> : <Auth onLogin={setUser} />} />
      </Routes>
    </HashRouter>
  );
};
export default App;
