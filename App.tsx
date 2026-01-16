

import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Heart, Users, Send, Gamepad2, MessageCircle, 
  LogOut, Plus, Play, Bot, ArrowLeft, 
  Trash2, X, Mic, Image as ImageIcon, CheckCheck, 
  Palette, StopCircle, Volume2, Camera, FileUp, 
  Pause, Check, Reply, Settings, Pencil, Eraser,
  Globe, Copy, Info, Zap, Share2, Moon, Sun, Paperclip
} from 'lucide-react';
import * as API from './services/storage';
import * as AI from './services/geminiService';
import { User, DuoSpace, Message, ThemeColor } from './types';
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
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5;
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
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in">
      <Card className="w-full max-w-lg h-[80vh] flex flex-col !p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-3xl">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
           <h3 className="font-black text-xl dark:text-white">Sketch</h3>
           <button onClick={onCancel} className="p-2 text-slate-400 hover:text-rose-500"><X size={24}/></button>
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
        <div className="p-6 flex gap-3">
          <Button variant="secondary" onClick={() => ctxRef.current?.clearRect(0,0,canvasRef.current!.width, canvasRef.current!.height)} className="flex-1">Clear</Button>
          <Button onClick={() => onSave(canvasRef.current!.toDataURL())} className="flex-1">Send</Button>
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
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 bg-vibe mx-auto rounded-4xl flex items-center justify-center text-white shadow-2xl animate-pulse">
          <Heart size={48} fill="currentColor" />
        </div>
        <h1 className="text-5xl font-black dark:text-white tracking-tighter">DuoSpace</h1>
      </div>
      <Card className="w-full max-w-xs !p-8 space-y-6 bg-white dark:bg-slate-900 border-none">
        <Input label="Your Alias" value={name} onChange={e => setName(e.target.value)} placeholder="Enter name..." onKeyDown={e => e.key === 'Enter' && handleAuth()} />
        <Button onClick={handleAuth} isLoading={loading} className="w-full">Materialize</Button>
      </Card>
    </div>
  );
};

// --- View: Dashboard ---
const Dashboard = ({ user }: { user: User }) => {
  const [spaces, setSpaces] = useState<DuoSpace[]>([]);
  const [joinInput, setJoinInput] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const portal = params.get('portal');
    if (portal) {
      try {
        const space = API.importSpace(portal, user);
        navigate(`/space/${space.id}`, { replace: true });
      } catch (e) { setError("Quantum sync failed."); }
    }
  }, [location]);

  useEffect(() => {
    const fetch = () => {
      const db = JSON.parse(localStorage.getItem('duospace_v7_db') || '{"spaces":[]}');
      setSpaces(db.spaces.filter((s: any) => s.members.some((m: any) => m.id === user.id)));
    };
    fetch(); const interval = setInterval(fetch, 2000); return () => clearInterval(interval);
  }, [user.id]);

  const handleJoin = () => {
    try {
      const input = joinInput.trim();
      const actualInput = input.includes('?portal=') ? input.split('?portal=')[1] : input;
      const space = API.joinSpace(user, actualInput);
      navigate(`/space/${space.id}`);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  return (
    <div className="max-w-md mx-auto h-full flex flex-col p-8 justify-between bg-slate-50 dark:bg-slate-950">
      <header className="flex justify-between items-center py-4">
        <h2 className="text-3xl font-black dark:text-white">Worlds</h2>
        <button onClick={() => { API.clearSession(); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-400"><LogOut size={20} /></button>
      </header>

      <div className="flex-1 flex flex-col justify-center space-y-6 overflow-y-auto no-scrollbar">
        {spaces.length === 0 ? (
          <div className="text-center opacity-40 py-20"><Users size={48} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-xs">No Dimensions Yet</p></div>
        ) : (
          spaces.map(s => (
            <Card key={s.id} className="cursor-pointer !p-6 border-none bg-white dark:bg-slate-900 shadow-xl" onClick={() => navigate(`/space/${s.id}`)}>
              <div className="flex justify-between items-center">
                <div className="space-y-1"><h3 className="text-xl font-black dark:text-white">{s.name}</h3><Badge color="bg-vibe-soft text-vibe-primary">Synced</Badge></div>
                <div className="w-10 h-10 bg-vibe text-white rounded-xl flex items-center justify-center"><Play size={20} fill="currentColor" /></div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <Card className="!p-8 space-y-5 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-5xl">
          {showCreate ? (
            <div className="space-y-4">
              <Input label="New World Name" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} placeholder="Our Place" />
              <div className="flex gap-2"><Button onClick={() => setShowCreate(false)} variant="secondary" className="flex-1">Back</Button><Button onClick={() => navigate(`/space/${API.createSpace(user, newSpaceName).id}`)} className="flex-1">Create</Button></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input value={joinInput} onChange={e => setJoinInput(e.target.value)} placeholder="Paste Code or Link" className="flex-1 bg-slate-50 dark:bg-slate-800 px-5 py-4 rounded-2xl outline-none font-bold dark:text-white border-2 border-transparent focus:border-vibe-primary transition-all" />
                <Button onClick={handleJoin}>Join</Button>
              </div>
              {error && <p className="text-[10px] text-rose-500 font-black uppercase text-center">{error}</p>}
              <Button onClick={() => setShowCreate(true)} variant="secondary" className="w-full border-dashed"><Plus size={16} /> New World</Button>
            </div>
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
    fetch(); const interval = setInterval(fetch, 1500); return () => clearInterval(interval);
  }, [spaceId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [space?.messages, aiLoading]);

  // Fix: Removed incorrect comparison of media type with 'text' since type is only 'image' | 'file' | 'voice'
  const sendMedia = (type: 'image' | 'file' | 'voice', content: string, fileName?: string) => {
    if (!space) return;
    const msg: Message = { 
      id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.username, 
      content: `Sent a ${type}`, timestamp: Date.now(), 
      type, mediaUrl: content, fileName 
    };
    API.updateSpace(space.id, { messages: [...space.messages, msg] });
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
        reader.onloadend = () => sendMedia('voice', reader.result as string);
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
      sendMedia(type, reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const shareLink = () => {
    const key = API.exportSpace(spaceId!);
    const url = `${window.location.origin}${window.location.pathname}#?portal=${key}`;
    navigator.clipboard.writeText(url);
    alert("Quantum Sync Link copied! Send this to your Duo to join from any device.");
  };

  if (!space) return null;
  const isAlone = space.members.length < 2;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      {showSketchpad && <Sketchpad onCancel={() => setShowSketchpad(false)} onSave={(url) => { sendMedia('image', url); setShowSketchpad(false); }} />}

      <header className="px-6 py-6 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50">
        <button onClick={() => navigate('/')} className="text-slate-400"><ArrowLeft size={24} /></button>
        <div className="text-center">
          <h2 className="font-black text-xl dark:text-white leading-none">{space.name}</h2>
          <Badge color={isAlone ? "bg-amber-50 text-amber-500" : "bg-emerald-50 text-emerald-500"}>{isAlone ? 'Alone' : 'Synced'}</Badge>
        </div>
        <button onClick={shareLink} className="p-3 bg-vibe-soft text-vibe-primary rounded-2xl"><Share2 size={20} /></button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeTab === 'chat' && (
          <div className="p-6 space-y-6 pb-48">
            {isAlone && (
               <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-5xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Globe size={48} className="mx-auto mb-4 text-vibe-primary animate-spin-slow" />
                  <h4 className="font-black text-lg dark:text-white">Quantum Portal Required</h4>
                  <p className="text-[11px] text-slate-500 font-bold mb-4">Join Code: {space.code}</p>
                  <Button onClick={shareLink} variant="secondary" className="mx-auto">Copy Sync Link</Button>
               </div>
            )}
            {space.messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`px-6 py-4 rounded-3xl font-bold shadow-sm max-w-[85%] ${m.senderId === currentUser.id ? 'bg-vibe text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 dark:text-white rounded-tl-none'}`}>
                  {m.type === 'image' && <img src={m.mediaUrl} className="rounded-2xl mb-2 w-full max-h-80 object-cover shadow-inner" />}
                  {m.type === 'voice' && <audio src={m.mediaUrl} controls className="w-full h-10 mb-2" />}
                  {m.type === 'file' && <a href={m.mediaUrl} download={m.fileName} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-xl mb-2"><Paperclip size={16}/> <span className="text-xs truncate">{m.fileName}</span></a>}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                <div className="mt-1 px-2 flex items-center gap-1">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   {m.senderId === currentUser.id && <CheckCheck size={10} className="text-vibe-primary" />}
                </div>
              </div>
            ))}
            {aiLoading && <div className="flex gap-1 px-6 py-4 animate-pulse"><div className="w-1.5 h-1.5 bg-vibe-primary rounded-full"></div><div className="w-1.5 h-1.5 bg-vibe-primary rounded-full"></div></div>}
            <div ref={scrollRef} />
          </div>
        )}

        {activeTab === 'play' && (
          <div className="h-full flex flex-col items-center justify-center p-8 space-y-12">
             <h3 className="text-2xl font-black uppercase dark:text-white">The Arena</h3>
             <div className="grid grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-6 rounded-4xl shadow-2xl">
                {space.activeGame.board.map((cell, i) => (
                  <button key={i} onClick={() => {
                    if (space.activeGame.board[i]) return;
                    const board = [...space.activeGame.board];
                    board[i] = board.filter(Boolean).length % 2 === 0 ? 'X' : 'O';
                    API.updateSpace(space.id, { activeGame: { board, status: 'active' }});
                  }} className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-3xl font-black dark:text-white flex items-center justify-center shadow-inner active:scale-90 transition-all">{cell}</button>
                ))}
             </div>
             <Button onClick={() => API.updateSpace(space.id, { activeGame: { board: Array(9).fill(null), status: 'active' }})}>Reset Game</Button>
          </div>
        )}

        {activeTab === 'vibe' && (
          <div className="p-8 space-y-8 pb-40">
             <div className="flex justify-between items-center"><h3 className="text-3xl font-black dark:text-white">Settings</h3><button onClick={() => { const s = {...currentUser.settings, darkMode: !currentUser.settings.darkMode}; API.saveSession({user: {...currentUser, settings: s}}); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 rounded-2xl">{currentUser.settings.darkMode ? <Sun/> : <Moon/>}</button></div>
             <Card className="!p-8 space-y-8 bg-white dark:bg-slate-900 border-none">
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase text-slate-400">Atmosphere Theme</p>
                   <div className="grid grid-cols-3 gap-4">
                      {(['violet', 'rose', 'red', 'sky', 'emerald', 'gold'] as ThemeColor[]).map(t => (
                        <button key={t} onClick={() => API.updateSpace(space.id, { theme: t })} className={`h-12 rounded-xl transition-all ${space.theme === t ? 'ring-4 ring-vibe ring-offset-4 ring-offset-white dark:ring-offset-slate-900 scale-105' : 'opacity-30'} ${t === 'violet' ? 'bg-violet-600' : t === 'rose' ? 'bg-rose-500' : t === 'red' ? 'bg-red-600' : t === 'sky' ? 'bg-sky-500' : t === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      ))}
                   </div>
                </div>
                <Button variant="danger" className="w-full" onClick={() => { if(confirm("Purge Dimension?")) { API.deleteSpace(space.id); navigate('/'); }}}>Purge Space</Button>
             </Card>
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="fixed bottom-28 left-0 right-0 px-4 z-50">
          <div className="max-w-3xl mx-auto glass p-3 rounded-5xl shadow-2xl border border-white/20 flex items-center gap-2">
             <label className="p-3 text-slate-400 cursor-pointer hover:text-vibe-primary"><Paperclip size={24}/><input type="file" className="hidden" onChange={handleFileUpload} /></label>
             <button onClick={() => setShowSketchpad(true)} className="p-3 text-slate-400 hover:text-vibe-primary"><Pencil size={24}/></button>
             <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." onKeyDown={async (e) => { 
                if(e.key === 'Enter' && chatInput.trim()) {
                   const msg: Message = { id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.username, content: chatInput, timestamp: Date.now(), type: 'text' };
                   const newMsgs = [...space.messages, msg];
                   API.updateSpace(space.id, { messages: newMsgs }); 
                   setChatInput('');
                   if (chatInput.toLowerCase().includes('@ai')) {
                      setAiLoading(true);
                      const reply = await AI.getAiResponse(chatInput, newMsgs);
                      API.updateSpace(space.id, { messages: [...newMsgs, { id: 'ai-'+Date.now(), senderId: 'ai', senderName: 'Duo', content: reply, timestamp: Date.now(), type: 'ai' }] });
                      setAiLoading(false);
                   }
                }
             }} className="flex-1 bg-transparent px-3 py-4 outline-none font-bold dark:text-white" />
             {chatInput.trim() ? (
                <button onClick={async () => {
                   const msg: Message = { id: Date.now().toString(), senderId: currentUser.id, senderName: currentUser.username, content: chatInput, timestamp: Date.now(), type: 'text' };
                   const newMsgs = [...space.messages, msg];
                   API.updateSpace(space.id, { messages: newMsgs }); setChatInput('');
                   if (chatInput.toLowerCase().includes('@ai')) {
                      setAiLoading(true);
                      const reply = await AI.getAiResponse(chatInput, newMsgs);
                      API.updateSpace(space.id, { messages: [...newMsgs, { id: 'ai-'+Date.now(), senderId: 'ai', senderName: 'Duo', content: reply, timestamp: Date.now(), type: 'ai' }] });
                      setAiLoading(false);
                   }
                }} className="w-12 h-12 bg-vibe text-white rounded-full flex items-center justify-center shadow-lg"><Send size={20}/></button>
             ) : (
                <button onMouseDown={startVoice} onMouseUp={stopVoice} onTouchStart={startVoice} onTouchEnd={stopVoice} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 scale-125 animate-pulse text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}><Mic size={20}/></button>
             )}
          </div>
        </div>
      )}

      <nav className="h-24 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-10 pb-4 z-50">
        <NavBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle />} label="Chat" />
        <NavBtn active={activeTab === 'play'} onClick={() => setActiveTab('play')} icon={<Gamepad2 />} label="Arena" />
        <NavBtn active={activeTab === 'vibe'} onClick={() => setActiveTab('vibe')} icon={<Palette />} label="Vibe" />
      </nav>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-vibe-primary scale-110' : 'text-slate-300'}`}>
    <div className={`p-3 rounded-2xl ${active ? 'bg-vibe-soft' : ''}`}>{React.cloneElement(icon, { size: 24, strokeWidth: active ? 3 : 2 })}</div>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
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
