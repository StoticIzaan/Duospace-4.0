
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Heart, Users, Send, Gamepad2, MessageCircle, 
  LogOut, Plus, Play, Bot, ArrowLeft, 
  Trash2, X, Mic, Image as ImageIcon, CheckCheck, 
  Palette, StopCircle, Volume2, Camera, FileUp, 
  Pause, Check, Reply, Settings, Pencil, Eraser,
  Globe, Copy, Info, Zap, Share2
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
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '#7c3aed';
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
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-[70vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
           <h3 className="font-black text-xl dark:text-white">Duo Sketch</h3>
           <button onClick={onCancel} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24}/></button>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative touch-none">
          <canvas ref={canvasRef}
            onMouseDown={(e) => { setIsDrawing(true); const p = getPos(e); ctxRef.current?.beginPath(); ctxRef.current?.moveTo(p.x, p.y); }}
            onMouseMove={(e) => { if (isDrawing) { const p = getPos(e); ctxRef.current?.lineTo(p.x, p.y); ctxRef.current?.stroke(); } }}
            onMouseUp={() => { setIsDrawing(false); ctxRef.current?.closePath(); }}
            onTouchStart={(e) => { setIsDrawing(true); const p = getPos(e); ctxRef.current?.beginPath(); ctxRef.current?.moveTo(p.x, p.y); }}
            onTouchMove={(e) => { if (isDrawing) { const p = getPos(e); ctxRef.current?.lineTo(p.x, p.y); ctxRef.current?.stroke(); } }}
            onTouchEnd={() => { setIsDrawing(false); ctxRef.current?.closePath(); }}
            className="w-full h-full cursor-crosshair" />
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 flex gap-3">
          <Button variant="secondary" onClick={() => ctxRef.current?.clearRect(0,0,canvasRef.current!.width, canvasRef.current!.height)} className="flex-1">Clear</Button>
          <Button onClick={() => onSave(canvasRef.current!.toDataURL())} className="flex-1">Send</Button>
        </div>
      </div>
    </div>
  );
};

// --- View: Dashboard ---
const Dashboard = ({ user }: { user: User }) => {
  const [spaces, setSpaces] = useState<DuoSpace[]>([]);
  const [code, setCode] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [portalKey, setPortalKey] = useState('');
  const [showPortal, setShowPortal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle URL Sync Links
  useEffect(() => {
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const portalData = params.get('portal');
    if (portalData) {
      setLoading(true);
      setTimeout(() => {
        try {
          const space = API.importSpace(portalData);
          navigate(`/space/${space.id}`, { replace: true });
        } catch (e) {
          setError("Failed to materialize dimension from link.");
          setLoading(false);
        }
      }, 1500);
    }
  }, [location]);

  useEffect(() => {
    const fetch = () => {
      const db = JSON.parse(localStorage.getItem('duospace_v6_db') || '{"spaces":[]}');
      setSpaces(db.spaces.filter((s: any) => s.members.some((m: any) => m.id === user.id)));
    };
    fetch(); const interval = setInterval(fetch, 2000); return () => clearInterval(interval);
  }, [user.id]);

  const handleJoin = () => {
    try {
      setError('');
      // Smart join: handles codes, keys, and URLs
      let input = code.trim();
      if (input.includes('?portal=')) {
        input = input.split('?portal=')[1];
      }
      const space = API.joinSpace(user, input);
      navigate(`/space/${space.id}`);
    } catch (e: any) { 
      setError(e.message); 
      setTimeout(() => setError(''), 5000); 
    }
  };

  const handlePortalImport = () => {
    try {
      if (!portalKey.trim()) return;
      const space = API.importSpace(portalKey);
      navigate(`/space/${space.id}`);
    } catch (e: any) { alert("Invalid Portal Key."); }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-6 animate-in fade-in">
        <div className="w-20 h-20 bg-vibe rounded-3xl flex items-center justify-center text-white shadow-vibe animate-bounce">
          <Zap size={40} fill="currentColor" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black dark:text-white">Teleporting...</h2>
          <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Materializing Private Dimension</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-full flex flex-col p-8 justify-between animate-in fade-in">
      <header className="flex justify-between items-center py-4">
        <div><h2 className="text-3xl font-black text-slate-900 dark:text-white">Spaces</h2><Badge color="bg-vibe-soft text-vibe-primary">Private Dimension</Badge></div>
        <button onClick={() => { API.clearSession(); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-400 border border-slate-100 dark:border-slate-800"><LogOut size={20} /></button>
      </header>

      <div className="flex-1 flex flex-col justify-center space-y-6 overflow-y-auto no-scrollbar py-10">
        {spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-6 opacity-60">
            <div className="w-32 h-32 bg-slate-50 dark:bg-slate-900 rounded-5xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800"><Users size={48} className="text-slate-300" /></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-center">No active dimensions.</p>
          </div>
        ) : (
          spaces.map(s => (
            <Card key={s.id} className="cursor-pointer !p-8 border-none" onClick={() => navigate(`/space/${s.id}`)}>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black dark:text-white leading-none">{s.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Synced</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-vibe text-white rounded-xl flex items-center justify-center shadow-vibe"><Play size={20} fill="currentColor" /></div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <Card className="!p-8 space-y-5 bg-white dark:bg-slate-900 shadow-2xl rounded-[3rem] border-slate-100 dark:border-slate-800">
          {showCreate ? (
            <div className="space-y-4 animate-in slide-in-from-top-4">
              <Input label="Dimension Name" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} placeholder="Our Secret Place" />
              <div className="flex gap-2"><Button onClick={() => setShowCreate(false)} variant="secondary" className="flex-1">Back</Button><Button onClick={() => navigate(`/space/${API.createSpace(user, newSpaceName).id}`)} className="flex-1">Create</Button></div>
            </div>
          ) : showPortal ? (
            <div className="space-y-4 animate-in slide-in-from-top-4">
              <textarea 
                value={portalKey} 
                onChange={e => setPortalKey(e.target.value)} 
                placeholder="Paste the Portal Key or Link here..."
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl outline-none font-mono text-xs dark:text-white border-2 border-transparent focus:border-vibe-primary"
              />
              <div className="flex gap-2"><Button onClick={() => setShowPortal(false)} variant="secondary" className="flex-1">Back</Button><Button onClick={handlePortalImport} className="flex-1">Import</Button></div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
               <div className="flex gap-2 relative">
                  <input 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    placeholder="Enter Code or Link" 
                    className={`flex-1 bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl outline-none font-bold dark:text-white border-2 transition-all ${error ? 'border-rose-500' : 'border-transparent focus:border-vibe-primary'}`} 
                  />
                  <Button onClick={handleJoin} className="px-8">Join</Button>
               </div>
               {error && (
                 <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/50 animate-in slide-in-from-bottom-2">
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold leading-tight mb-2 text-center">
                      <Zap size={12} className="inline mr-1" /> {error}
                    </p>
                    <button onClick={() => setShowPortal(true)} className="w-full py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Manual Sync</button>
                 </div>
               )}
               <div className="grid grid-cols-2 gap-2 mt-1">
                 <Button onClick={() => setShowCreate(true)} variant="secondary" className="border-dashed"><Plus size={16} /> New World</Button>
                 <Button onClick={() => setShowPortal(true)} variant="secondary" className="border-dashed"><Globe size={16} /> Sync Key</Button>
               </div>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = () => {
      const s = API.getSpace(spaceId!);
      if (s) {
        setSpace(s); document.documentElement.setAttribute('data-theme', s.theme);
        if (s.members.find(m => m.id === currentUser.id)?.settings.darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } else navigate('/');
    };
    fetch(); const interval = setInterval(fetch, 2000); return () => clearInterval(interval);
  }, [spaceId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [space?.messages, aiLoading]);

  const shareSyncLink = async () => {
    const key = API.exportSpace(spaceId!);
    const baseUrl = window.location.href.split('#')[0];
    const syncUrl = `${baseUrl}#?portal=${key}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${space?.name} on DuoSpace`,
          text: `I've created a private dimension for us. Click to join:`,
          url: syncUrl
        });
      } catch (e) {
        navigator.clipboard.writeText(syncUrl);
        alert("Sync link copied to clipboard!");
      }
    } else {
      navigator.clipboard.writeText(syncUrl);
      alert("Sync link copied to clipboard!");
    }
  };

  if (!space) return null;
  const isAlone = space.members.length < 2;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
      {showSketchpad && <Sketchpad onCancel={() => setShowSketchpad(false)} onSave={(url) => { 
        const msg: Message = { id: 'sketch-'+Date.now(), senderId: currentUser.id, senderName: currentUser.username, content: "Shared a sketch", timestamp: Date.now(), type: 'image', mediaUrl: url };
        API.updateSpace(space.id, { messages: [...space.messages, msg] }); setShowSketchpad(false);
      }} />}

      <header className="px-6 py-6 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50">
        <button onClick={() => navigate('/')} className="text-slate-400 p-2"><ArrowLeft size={24} /></button>
        <div className="text-center">
          <h2 className="font-black text-xl text-slate-900 dark:text-white">{space.name}</h2>
          <div className="flex items-center justify-center gap-1.5 mt-1">
             <div className={`w-1.5 h-1.5 rounded-full ${isAlone ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`}></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{isAlone ? 'Awaiting Duo' : 'Synced'}</span>
          </div>
        </div>
        <button onClick={shareSyncLink} className="w-10 h-10 rounded-xl bg-vibe-soft text-vibe-primary flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm"><Share2 size={20} /></button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeTab === 'chat' && (
          <div className="p-6 space-y-8 pb-48">
            {isAlone && (
               <div className="text-center p-8 space-y-4 animate-in zoom-in duration-500 bg-white/50 dark:bg-slate-900/50 rounded-5xl border border-dashed border-slate-200 dark:border-slate-800 my-4 mx-2">
                  <div className="inline-block p-6 bg-vibe-soft rounded-full text-vibe-primary"><Globe size={40} className="animate-spin-slow" /></div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">Sync your Duo</h4>
                  <p className="text-[11px] text-slate-500 font-bold max-w-[220px] mx-auto leading-relaxed">Dimensions are private. Tap the Share button at the top to send a **Quantum Sync Link** to your Duo.</p>
                  <div className="pt-2">
                    <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Local Code: <span className="text-vibe-primary">{space.code}</span></span>
                  </div>
               </div>
            )}
            {space.messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-500`}>
                <div className={`px-6 py-4 rounded-4xl font-bold shadow-sm max-w-[85%] ${m.senderId === currentUser.id ? 'bg-vibe text-white rounded-tr-none shadow-vibe/20' : m.senderId === 'ai' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 rounded-tl-none' : 'bg-white dark:bg-slate-800 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700'}`}>
                  {m.type === 'image' && <img src={m.mediaUrl} className="rounded-2xl mb-2 w-full max-h-80 object-cover shadow-inner" />}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
                <div className="mt-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-80">{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex gap-1 items-center px-6 py-4 animate-pulse">
                <div className="w-1.5 h-1.5 bg-vibe-primary rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-vibe-primary rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-vibe-primary rounded-full"></div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}

        {activeTab === 'play' && (
          <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 animate-in zoom-in">
             <div className="space-y-10 flex flex-col items-center">
                <h3 className="text-3xl font-black uppercase tracking-tighter dark:text-white">The Arena</h3>
                <div className="grid grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                   {space.activeGame.board.map((cell, i) => (
                     <button key={i} onClick={() => {
                       if (space.activeGame.board[i] || space.activeGame.status === 'won') return;
                       const board = [...space.activeGame.board];
                       board[i] = board.filter(Boolean).length % 2 === 0 ? 'X' : 'O';
                       API.updateSpace(space.id, { activeGame: { board, status: 'active' }});
                     }} className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-3xl font-black flex items-center justify-center shadow-inner dark:text-white active:scale-90 transition-all">{cell}</button>
                   ))}
                </div>
                <Button onClick={() => API.updateSpace(space.id, { activeGame: { board: Array(9).fill(null), status: 'active' }})}>Reset Arena</Button>
             </div>
          </div>
        )}

        {activeTab === 'vibe' && (
          <div className="p-8 space-y-10 animate-slide-up pb-32">
             <header className="space-y-1">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Vibe</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Tuning Fork</p>
             </header>
             <Card className="!p-10 space-y-12 rounded-[3.5rem] bg-white dark:bg-slate-900 border-none shadow-2xl">
                <section className="space-y-8">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Atmosphere</h4>
                   <div className="grid grid-cols-3 gap-6">
                      {(['violet', 'rose', 'red', 'sky', 'emerald', 'gold'] as ThemeColor[]).map(t => (
                        <button key={t} onClick={() => API.updateSpace(space.id, { theme: t })} className={`h-16 rounded-2xl transition-all duration-500 ${space.theme === t ? 'ring-4 ring-vibe ring-offset-4 ring-offset-white dark:ring-offset-slate-900 scale-110' : 'opacity-40'} ${t === 'violet' ? 'bg-violet-600' : t === 'rose' ? 'bg-rose-500' : t === 'red' ? 'bg-red-600' : t === 'sky' ? 'bg-sky-500' : t === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      ))}
                   </div>
                </section>
                <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="danger" className="w-full py-5 rounded-3xl font-black uppercase tracking-widest" onClick={() => { if(confirm("This will purge the dimension. Continue?")) { API.deleteSpace(space.id); navigate('/'); }}}>Purge Dimension</Button>
                </div>
             </Card>
          </div>
        )}
      </div>

      {activeTab === 'chat' && (
        <div className="fixed bottom-28 left-0 right-0 px-4 z-50">
          <div className="max-w-3xl mx-auto glass p-4 rounded-[3.5rem] shadow-2xl border border-white/20 flex items-center gap-2">
             <button onClick={() => setShowSketchpad(true)} className="p-3 text-slate-300 hover:text-vibe-primary active:scale-90 transition-all"><Pencil size={24}/></button>
             <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type to Duo..." onKeyDown={async (e) => { 
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
             }} className="flex-1 bg-transparent px-3 py-4 outline-none font-bold dark:text-white placeholder:text-slate-300" />
             <button onClick={async () => {
                if (!chatInput.trim()) return;
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
             }} className="w-14 h-14 bg-vibe text-white rounded-[1.8rem] flex items-center justify-center shadow-lg shadow-vibe/20 active:scale-90 transition-all"><Send size={24}/></button>
          </div>
        </div>
      )}

      <nav className="h-28 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-10 pb-8 pt-4 z-50">
        <NavBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle />} label="Chat" />
        <NavBtn active={activeTab === 'play'} onClick={() => setActiveTab('play')} icon={<Gamepad2 />} label="Arena" />
        <NavBtn active={activeTab === 'vibe'} onClick={() => setActiveTab('vibe')} icon={<Palette />} label="Vibe" />
      </nav>
    </div>
  );
};

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all duration-500 ${active ? 'text-vibe-primary scale-110' : 'text-slate-300 opacity-60 hover:opacity-100'}`}>
    <div className={`p-3.5 rounded-2xl transition-colors duration-500 ${active ? 'bg-vibe-soft' : ''}`}>{React.cloneElement(icon, { size: 26, strokeWidth: active ? 3 : 2 })}</div>
    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
  </button>
);

// --- View: Auth ---
const Auth = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = () => {
    if (!username.trim()) return;
    setLoading(true);
    // Simulate auth delay for "vibe"
    setTimeout(() => {
      const user: User = {
        id: Math.random().toString(36).substring(2, 11),
        username: username.trim(),
        avatarColor: 'violet',
        settings: {
          darkMode: true,
          showLastSeen: true,
          readReceipts: true,
          theme: 'violet',
          aiInChat: true
        }
      };
      API.saveSession({ user });
      onLogin(user);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in zoom-in duration-700 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="space-y-6 text-center">
        <div className="w-24 h-24 bg-vibe mx-auto rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-vibe/30 rotate-12 transition-transform hover:rotate-0">
          <Heart size={48} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">DuoSpace</h1>
          <p className="text-xs text-slate-400 font-black uppercase tracking-[0.3em] mt-2">The Private Dimension</p>
        </div>
      </div>

      <Card className="w-full max-w-sm !p-10 space-y-6 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[3.5rem]">
        <Input 
          label="Identify Yourself" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
          placeholder="Enter name..." 
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
        />
        <Button onClick={handleAuth} isLoading={loading} className="w-full py-5 rounded-3xl">
          Materialize
        </Button>
      </Card>
      
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-vibe-primary animate-pulse"></div>
          <div className="w-1 h-1 rounded-full bg-vibe-primary animate-pulse delay-75"></div>
          <div className="w-1 h-1 rounded-full bg-vibe-primary animate-pulse delay-150"></div>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End-to-End Synced</p>
      </div>
    </div>
  );
};

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
