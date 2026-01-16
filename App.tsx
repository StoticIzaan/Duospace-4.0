
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { 
  Heart, Users, Send, Gamepad2, MessageCircle, 
  LogOut, Plus, Play, Bot, ArrowLeft, 
  Trash2, X, Mic, Image as ImageIcon, CheckCheck, 
  Palette, StopCircle, Volume2, Camera, FileUp, 
  Pause, Check, Reply, Settings
} from 'lucide-react';
import * as API from './services/storage';
import * as AI from './services/geminiService';
import { User, DuoSpace, Message, ThemeColor } from './types';
import { Button, Input, Card, Badge } from './components/Common';

// --- Sub-component: Voice Message Player ---
const VoicePlayer = ({ url, senderColor }: { url: string; senderColor: string }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => {
        const p = (audioRef.current!.currentTime / audioRef.current!.duration) * 100;
        setProgress(p);
      };
      audioRef.current.onended = () => {
        setPlaying(false);
        setProgress(0);
      };
    }

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-4 py-2 min-w-[200px]">
      <button 
        onClick={togglePlay} 
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          senderColor === 'white' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden relative">
        <div 
          className="h-full bg-current transition-all duration-100 absolute left-0 top-0" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- View: Authentication ---
const Auth = ({ onLogin }: any) => {
  const [name, setName] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleNext = () => { if (name.trim().length >= 2) setIsConfirming(true); };
  const handleFinish = () => {
    const user: User = { 
      id: Math.random().toString(36).substr(2, 9), 
      username: name, 
      avatarColor: 'bg-vibe-primary',
      settings: {
        darkMode: false, showLastSeen: true, readReceipts: true, theme: 'violet', aiInChat: true
      }
    };
    API.saveSession({ user });
    onLogin(user);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 animate-in fade-in duration-700">
      <div className="w-24 h-24 bg-vibe rounded-4xl flex items-center justify-center shadow-2xl relative z-10 transition-transform hover:scale-105 duration-500">
        <Heart className="text-white w-12 h-12 fill-current" />
      </div>
      {!isConfirming ? (
        <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom-4">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Identity</h1>
            <p className="text-slate-400 font-medium">Choose a name for your duo space.</p>
          </div>
          <Input autoFocus label="Your Name" value={name} onChange={e => setName(e.target.value)} placeholder="E.g. Alex" onKeyDown={(e) => e.key === 'Enter' && handleNext()} />
          <Button onClick={handleNext} className="w-full" disabled={name.trim().length < 2}>Continue</Button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-8 animate-in zoom-in duration-300">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Confirm?</h1>
            <p className="text-slate-400 font-medium">Setting your name to <span className="text-vibe-primary font-bold">{name}</span>.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsConfirming(false)} className="flex-1">Back</Button>
            <Button onClick={handleFinish} className="flex-1">Confirm</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- View: Dashboard ---
const Dashboard = ({ user }: { user: User }) => {
  const [spaces, setSpaces] = useState<DuoSpace[]>([]);
  const [code, setCode] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    const fetch = () => {
      const db = JSON.parse(localStorage.getItem('duospace_v6_db') || '{"spaces":[]}');
      setSpaces(db.spaces.filter((s: any) => s.members.some((m: any) => m.id === user.id)));
    };
    fetch();
    const interval = setInterval(fetch, 2000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleCreate = () => {
    try {
      const space = API.createSpace(user, newSpaceName);
      navigate(`/space/${space.id}`);
    } catch (e: any) { alert(e.message); }
  };

  const handleJoin = () => {
    try {
      const space = API.joinSpace(user, code);
      navigate(`/space/${space.id}`);
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="max-w-md mx-auto h-full flex flex-col p-8 justify-between animate-in fade-in duration-500">
      <header className="flex justify-between items-center py-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Spaces</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Connected Worlds</p>
        </div>
        <button onClick={() => { API.clearSession(); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-400 border border-slate-100 dark:border-slate-800 active:scale-90 transition-all">
          <LogOut size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center space-y-6 overflow-y-auto no-scrollbar py-10">
        {spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-6 opacity-80">
            <div className="w-32 h-32 bg-slate-50 dark:bg-slate-900 rounded-5xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800">
               <Users size={48} className="text-slate-300 dark:text-slate-700" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-center">No active dimensions found.</p>
          </div>
        ) : (
          spaces.map(s => (
            <Card key={s.id} className="cursor-pointer !p-8 hover:scale-[1.02] active:scale-[0.98] transition-all border-none" onClick={() => navigate(`/space/${s.id}`)}>
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black dark:text-white leading-none">{s.name}</h3>
                  <Badge color={s.members.length < 2 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}>
                    {s.members.length < 2 ? 'Alone' : 'Paired'}
                  </Badge>
                </div>
                <div className="w-14 h-14 bg-vibe text-white rounded-2xl flex items-center justify-center shadow-vibe">
                   <Play size={24} fill="currentColor" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="!p-8 space-y-5 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-2xl rounded-[3rem]">
        {showCreate ? (
          <div className="space-y-4 animate-in slide-in-from-top-4">
            <Input label="New World Name" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} placeholder="The Sanctuary" />
            <div className="flex gap-2">
              <Button onClick={() => setShowCreate(false)} variant="secondary" className="flex-1">Back</Button>
              <Button onClick={handleCreate} className="flex-1">Create</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
             <div className="flex gap-2">
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter Code" className="flex-1 bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl outline-none font-bold text-slate-900 dark:text-white border-2 border-transparent focus:border-vibe-primary transition-all" />
                <Button onClick={handleJoin} className="px-8">Join</Button>
             </div>
             <Button onClick={() => setShowCreate(true)} variant="secondary" className="w-full border-dashed"><Plus size={18} /> New Dimension</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

// --- View: Space ---
const Space = ({ user: currentUser }: { user: User }) => {
  const { spaceId } = useParams();
  const [space, setSpace] = useState<DuoSpace | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'play' | 'vibe'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recTimer, setRecTimer] = useState(0);
  const recIntervalRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = () => {
      const s = API.getSpace(spaceId!);
      if (s) {
        setSpace(s);
        document.documentElement.setAttribute('data-theme', s.theme);
        const me = s.members.find(m => m.id === currentUser.id);
        if (me?.settings.darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } else navigate('/');
    };
    fetch();
    const interval = setInterval(fetch, 2000);
    return () => clearInterval(interval);
  }, [spaceId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [space?.messages, aiLoading]);

  const sendMessage = async (content: string, type: Message['type'] = 'text', mediaUrl?: string, fileName?: string) => {
    if (!space || (!content.trim() && !mediaUrl)) return;
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id, senderName: currentUser.username, content, timestamp: Date.now(), type,
      mediaUrl, fileName,
      replyToId: replyingTo?.id, replyToName: replyingTo?.senderName, replyContent: replyingTo?.content
    };
    const newMessages = [...space.messages, msg];
    API.updateSpace(space.id, { messages: newMessages });
    setChatInput(''); setReplyingTo(null); setRecordedAudio(null);

    const me = space.members.find(m => m.id === currentUser.id);
    if (me?.settings.aiInChat && content.toLowerCase().includes('@ai')) {
      setAiLoading(true);
      const aiReply = await AI.getAiResponse(content, newMessages);
      API.updateSpace(space.id, { 
        messages: [...newMessages, { 
          id: 'ai-'+Date.now(), senderId: 'ai', senderName: 'Duo', content: aiReply, timestamp: Date.now(), type: 'ai' 
        }] 
      });
      setAiLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => setRecordedAudio(reader.result as string);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecTimer(0);
      recIntervalRef.current = setInterval(() => setRecTimer(t => t + 1), 1000);
    } catch (e) { alert("Microphone access is required."); }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    clearInterval(recIntervalRef.current);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => sendMessage(type === 'image' ? "" : file.name, type, reader.result as string, file.name);
      reader.readAsDataURL(file);
    }
  };

  if (!space) return null;
  const isAlone = space.members.length < 2;
  const myMember = space.members.find(m => m.id === currentUser.id)!;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50">
        <button onClick={() => navigate('/')} className="text-slate-400 p-2"><ArrowLeft size={24} /></button>
        <div className="text-center">
          <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{space.name}</h2>
          <div className="flex items-center justify-center gap-1.5 mt-1">
             <div className={`w-1.5 h-1.5 rounded-full ${isAlone ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`}></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{space.code}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-vibe text-white flex items-center justify-center font-bold shadow-vibe">
          {currentUser.username[0].toUpperCase()}
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {activeTab === 'chat' && (
          <div className="p-6 space-y-8 pb-48">
            {space.messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 group`}>
                {m.replyToId && (
                  <div className={`mb-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-t-2xl text-[10px] font-bold text-slate-500 max-w-[80%] border-l-4 border-vibe-primary truncate ${m.senderId === currentUser.id ? 'mr-4' : 'ml-4'}`}>
                    <Reply size={10} className="inline mr-2" /> <b>{m.replyToName}</b>: {m.replyContent}
                  </div>
                )}
                <div className="flex items-center gap-2 max-w-full">
                  {m.senderId !== currentUser.id && (
                    <button onClick={() => setReplyingTo(m)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-vibe-primary transition-all active:scale-90"><Reply size={18} /></button>
                  )}
                  <div className={`px-6 py-4 rounded-4xl font-bold shadow-sm break-words max-w-[85%] ${
                    m.senderId === currentUser.id ? 'bg-vibe text-white rounded-tr-none shadow-vibe/20' : m.senderId === 'ai' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 rounded-tl-none' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-tl-none'
                  }`}>
                    {m.type === 'image' && <img src={m.mediaUrl} className="rounded-2xl mb-2 w-full max-h-80 object-cover shadow-inner" />}
                    {m.type === 'file' && <div className="flex items-center gap-3 p-3 bg-black/5 rounded-2xl mb-1 text-xs"><FileUp size={20} /> <span className="truncate">{m.fileName}</span></div>}
                    {m.type === 'voice' && (
                      <VoicePlayer url={m.mediaUrl!} senderColor={m.senderId === currentUser.id ? 'white' : 'dark'} />
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                  {m.senderId === currentUser.id && (
                    <button onClick={() => setReplyingTo(m)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-vibe-primary transition-all active:scale-90"><Reply size={18} /></button>
                  )}
                </div>
                <div className="mt-2.5 px-3 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  {m.senderId === currentUser.id && myMember.settings.readReceipts && <CheckCheck size={14} className="text-vibe-primary" />}
                </div>
              </div>
            ))}
            {aiLoading && <div className="text-[10px] font-black text-vibe-primary uppercase tracking-[0.2em] animate-pulse">Duo is decoding...</div>}
            <div ref={scrollRef} />
          </div>
        )}

        {activeTab === 'play' && (
          <div className="h-full flex flex-col items-center justify-center p-8 space-y-12 animate-in zoom-in">
             {isAlone ? (
                <Card className="text-center p-12 space-y-6 max-w-sm rounded-[3rem]">
                   <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto"><Users size={40} /></div>
                   <h3 className="text-3xl font-black dark:text-white">Duo Required</h3>
                   <p className="text-slate-400 font-bold leading-relaxed">Competition requires a partner. Give them your code: <span className="text-vibe-primary font-black tracking-widest">{space.code}</span></p>
                </Card>
             ) : (
                <div className="space-y-10 flex flex-col items-center">
                   <h3 className="text-3xl font-black uppercase tracking-tighter">The Arena</h3>
                   <div className="grid grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                      {space.activeGame.board.map((cell, i) => (
                        <button key={i} onClick={() => {
                          if (space.activeGame.board[i] || space.activeGame.status === 'won') return;
                          const board = [...space.activeGame.board];
                          board[i] = board.filter(Boolean).length % 2 === 0 ? 'X' : 'O';
                          let status: any = 'active';
                          const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                          if (wins.some(w => board[w[0]] && board[w[0]] === board[w[1]] && board[w[0]] === board[w[2]])) status = 'won';
                          else if (board.every(Boolean)) status = 'draw';
                          API.updateSpace(space.id, { activeGame: { board, status }});
                        }} className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl text-3xl font-black flex items-center justify-center shadow-inner active:scale-95 transition-all">
                          {cell}
                        </button>
                      ))}
                   </div>
                   {space.activeGame.status !== 'active' && <Button onClick={() => API.updateSpace(space.id, { activeGame: { board: Array(9).fill(null), status: 'active' }})}>Reset Arena</Button>}
                </div>
             )}
          </div>
        )}

        {activeTab === 'vibe' && (
          <div className="p-8 space-y-10 animate-slide-up pb-32">
             <header className="space-y-1">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Vibe</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">The Tuning Fork</p>
             </header>

             <Card className="!p-10 space-y-12 rounded-[3.5rem] border-none shadow-2xl bg-white dark:bg-slate-900">
                <section className="space-y-8">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2"><Palette size={16} className="text-vibe-primary" /> Visual Atmosphere</h4>
                   <div className="grid grid-cols-3 gap-6">
                      {(['violet', 'rose', 'red', 'sky', 'emerald', 'gold'] as ThemeColor[]).map(t => (
                        <button key={t} onClick={() => API.updateSpace(space.id, { theme: t })} className={`h-16 rounded-2xl transition-all duration-500 shadow-lg ${space.theme === t ? 'ring-4 ring-vibe-soft ring-offset-4 ring-offset-white dark:ring-offset-slate-900 scale-110 z-10' : 'opacity-40 hover:opacity-100'} ${
                           t === 'violet' ? 'bg-violet-600' : t === 'rose' ? 'bg-rose-500' : t === 'red' ? 'bg-red-600' : t === 'sky' ? 'bg-sky-500' : t === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      ))}
                   </div>
                </section>

                <section className="space-y-8 pt-10 border-t border-slate-100 dark:border-slate-800">
                   {/* Correctly using the imported Settings icon */}
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2"><Settings size={16} className="text-vibe-primary" /> Privacy & Tech</h4>
                   <div className="space-y-8">
                      <Toggle label="Dark Mode" desc="Optimized dark vision" value={myMember.settings.darkMode} onChange={() => {
                        const upd = space.members.map(m => m.id === currentUser.id ? { ...m, settings: { ...m.settings, darkMode: !m.settings.darkMode } } : m);
                        API.updateSpace(space.id, { members: upd });
                      }} />
                      <Toggle label="Read Receipts" desc="Sync delivery status" value={myMember.settings.readReceipts} onChange={() => {
                        const upd = space.members.map(m => m.id === currentUser.id ? { ...m, settings: { ...m.settings, readReceipts: !m.settings.readReceipts } } : m);
                        API.updateSpace(space.id, { members: upd });
                      }} />
                      <Toggle label="Show Last Seen" desc="Reveal active timestamps" value={myMember.settings.showLastSeen} onChange={() => {
                        const upd = space.members.map(m => m.id === currentUser.id ? { ...m, settings: { ...m.settings, showLastSeen: !m.settings.showLastSeen } } : m);
                        API.updateSpace(space.id, { members: upd });
                      }} />
                      <Toggle label="AI in Chat" desc="Summon Duo with @ai" value={myMember.settings.aiInChat} onChange={() => {
                        const upd = space.members.map(m => m.id === currentUser.id ? { ...m, settings: { ...m.settings, aiInChat: !m.settings.aiInChat } } : m);
                        API.updateSpace(space.id, { members: upd });
                      }} />
                   </div>
                </section>

                <Button variant="danger" className="w-full py-5 rounded-3xl uppercase tracking-[0.2em] font-black" onClick={() => { if(confirm("This will erase all messages and data. Continue?")) { API.deleteSpace(space.id); navigate('/'); }}}>Purge Dimension</Button>
             </Card>
          </div>
        )}
      </div>

      {/* Input Deck */}
      {activeTab === 'chat' && (
        <div className="fixed bottom-28 left-0 right-0 px-4 z-50">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
             {replyingTo && (
                <div className="glass p-4 rounded-t-4xl border border-b-0 flex items-center justify-between animate-in slide-in-from-bottom-2">
                   <div className="truncate"><p className="text-[10px] font-black uppercase text-vibe-primary tracking-widest">Quoting {replyingTo.senderName}</p><p className="text-xs text-slate-500 font-bold truncate">{replyingTo.content || "Media content"}</p></div>
                   <button onClick={() => setReplyingTo(null)} className="p-2 text-slate-400"><X size={16}/></button>
                </div>
             )}
             
             {recordedAudio ? (
                <div className="glass p-5 rounded-[2.5rem] shadow-2xl border flex items-center gap-5 animate-in slide-in-from-bottom-4">
                   <div className="w-14 h-14 bg-vibe-soft rounded-2xl flex items-center justify-center text-vibe-primary"><Volume2 className="animate-pulse" /></div>
                   <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voice Review</p>
                      <button onClick={() => new Audio(recordedAudio).play()} className="text-vibe-primary text-sm font-black hover:underline mt-0.5">Listen Again</button>
                   </div>
                   <button onClick={() => setRecordedAudio(null)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={24}/></button>
                   <button onClick={() => sendMessage("", "voice", recordedAudio)} className="w-16 h-16 bg-vibe text-white rounded-[1.8rem] flex items-center justify-center shadow-xl shadow-vibe/20 active:scale-90 transition-all"><Send size={28}/></button>
                </div>
             ) : isRecording ? (
                <div className="bg-rose-500 p-5 rounded-[2.8rem] shadow-2xl flex items-center gap-6 text-white animate-in slide-in-from-bottom-4">
                   <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse"><Mic size={32}/></div>
                   <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Recording Capture</p>
                      <p className="text-3xl font-black">{recTimer}s</p>
                   </div>
                   <button onClick={stopRecording} className="w-16 h-16 bg-white text-rose-500 rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-all"><StopCircle size={36}/></button>
                </div>
             ) : (
                <div className={`glass p-4 shadow-2xl border flex items-center gap-2 group transition-all ${replyingTo ? 'rounded-b-[2.5rem] rounded-t-none' : 'rounded-[3.5rem]'}`}>
                   <div className="flex gap-1 ml-1">
                      <button onClick={() => document.getElementById('cam')?.click()} className="p-3 text-slate-300 dark:text-slate-600 hover:text-vibe-primary transition-all active:scale-90"><Camera size={24}/></button>
                      <button onClick={() => document.getElementById('gal')?.click()} className="p-3 text-slate-300 dark:text-slate-600 hover:text-vibe-primary transition-all active:scale-90"><ImageIcon size={24}/></button>
                      <button onClick={() => document.getElementById('fil')?.click()} className="p-3 text-slate-300 dark:text-slate-600 hover:text-vibe-primary transition-all active:scale-90"><FileUp size={24}/></button>
                      <button onClick={startRecording} className="p-3 text-slate-300 dark:text-slate-600 hover:text-vibe-primary transition-all active:scale-90"><Mic size={24}/></button>
                   </div>
                   <input 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)} 
                      placeholder="Type a message..." 
                      onKeyDown={(e) => { if(e.key === 'Enter' && chatInput.trim()) sendMessage(chatInput); }}
                      className="flex-1 bg-transparent px-3 py-4 outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-800" 
                   />
                   <button onClick={() => sendMessage(chatInput)} disabled={!chatInput.trim()} className="w-14 h-14 bg-vibe text-white rounded-[1.8rem] flex items-center justify-center shadow-xl shadow-vibe/20 active:scale-90 disabled:opacity-20 transition-all">
                      <Send size={26} />
                   </button>
                   <input id="cam" type="file" capture="environment" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
                   <input id="gal" type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
                   <input id="fil" type="file" className="hidden" onChange={(e) => handleMediaUpload(e, 'file')} />
                </div>
             )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="h-28 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-10 pb-8 pt-4 z-50">
        <NavBtn active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle />} label="Chat" />
        <NavBtn active={activeTab === 'play'} onClick={() => setActiveTab('play')} icon={<Gamepad2 />} label="Arena" />
        <NavBtn active={activeTab === 'vibe'} onClick={() => setActiveTab('vibe')} icon={<Palette />} label="Vibe" />
      </nav>
    </div>
  );
};

const Toggle = ({ label, desc, value, onChange }: any) => (
  <div className="flex justify-between items-center group cursor-pointer" onClick={onChange}>
    <div className="space-y-0.5">
      <p className="font-black text-lg dark:text-white leading-tight">{label}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{desc}</p>
    </div>
    <div className={`w-14 h-8 rounded-full p-1.5 transition-all duration-300 ${value ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200 dark:bg-slate-800'}`}>
      <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm ${value ? 'translate-x-6' : ''}`} />
    </div>
  </div>
);

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all duration-500 ${active ? 'text-vibe-primary scale-110' : 'text-slate-300 dark:text-slate-700 opacity-60 hover:opacity-100'}`}>
    <div className={`p-3.5 rounded-2xl transition-all duration-500 ${active ? 'bg-vibe-soft' : ''}`}>
      {React.cloneElement(icon, { size: 26, strokeWidth: active ? 3 : 2 })}
    </div>
    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
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
