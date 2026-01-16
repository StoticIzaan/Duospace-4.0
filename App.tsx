import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Send, Gamepad2, LogOut, Plus, ArrowLeft, 
  Search, User as UserIcon, Zap, MessageCircle, Bell, UserPlus, 
  CheckCircle2, Rocket, Waves, XCircle
} from 'lucide-react';
import { p2p } from './services/peerService'; 
import { User, Message, GameState } from './types';
import { Button, Input, Card, Badge } from './components/Common';
import * as AI from './services/geminiService';

const TypingIndicator = () => (
  <div className="flex gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none w-fit animate-message-pop shadow-md border border-slate-100 dark:border-slate-700/50">
    <div className="w-1.5 h-1.5 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0s' }} />
    <div className="w-1.5 h-1.5 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.2s' }} />
    <div className="w-1.5 h-1.5 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.4s' }} />
  </div>
);

const Connect4 = ({ game, onMove, isMyTurn, myId }: { game: GameState, onMove: (col: number) => void, isMyTurn: boolean, myId: string }) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  return (
    <Card className="!p-4 animate-slide-up mb-6 border-2 border-white/60 dark:border-white/5">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Zap size={14} className="text-amber-500 animate-pulse" /> Battle Arena
        </h4>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500 shadow-md ${isMyTurn ? 'bg-vibe text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
          {isMyTurn ? "Your Strategy" : "Opponent's Move"}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 bg-slate-100 dark:bg-black/20 p-4 rounded-xl relative">
        {game.board.map((ownerId, i) => {
          const col = i % 7;
          return (
            <div 
              key={i} 
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => onMove(col)} 
              className={`w-full aspect-square bg-white dark:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${hoverCol === col ? 'ring-2 ring-vibe/30 scale-105' : ''}`}
            >
              {ownerId && (
                <div className={`w-[80%] h-[80%] rounded-full shadow-lg animate-gravity-drop ${ownerId === myId ? 'bg-vibe' : 'bg-rose-500'}`} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const Auth = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
        const user = await p2p.register(username);
        onLogin(user);
    } catch (err: any) { setError(err.message || "Identity check failed"); }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4 mb-8 animate-slide-up">
        <div className="w-16 h-16 bg-vibe mx-auto rounded-2xl flex items-center justify-center text-white shadow-vibe animate-bounce">
            <Heart size={32} fill="currentColor" />
        </div>
        <div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-vibe tracking-tighter">DuoSpace</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] tracking-[0.3em] uppercase mt-1">Encrypted Connection</p>
        </div>
      </div>

      <Card className="w-full max-w-[340px] space-y-6 !p-8 shadow-2xl animate-slide-up">
        <Input label="Your Identity" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. Maverick" className="!text-sm py-3" autoFocus />
        {error && <p className="text-[10px] font-bold text-rose-500 text-center">{error}</p>}
        <Button onClick={handleRegister} className="w-full !py-4 !text-xs">Initialize World</Button>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-medium">True P2P • No Cloud Storage</p>
        </div>
      </Card>
    </div>
  );
};

const Dashboard = ({ user, setView }: { user: User, setView: (v: 'dashboard' | 'space') => void }) => {
  const [activeTab, setActiveTab] = useState<'make' | 'join' | 'inbox'>('make');
  const [targetName, setTargetName] = useState('');
  const [inbox, setInbox] = useState<any[]>([]);
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    p2p.init({
        onMessage: () => {},
        onStatus: (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'connected') setView('space');
        },
        onInbox: (req) => {
            setInbox(prev => {
                // Prevent duplicate requests
                if (prev.find(p => p.user.id === req.user.id)) return prev;
                return [...prev, req];
            });
        }
    });
  }, []);

  const handleSendRequest = () => {
    const trimmed = targetName.trim();
    if (!trimmed) return;
    p2p.sendRequest(trimmed);
  };

  const handleAccept = (req: any) => {
    p2p.acceptRequest(req.conn);
    setInbox(prev => prev.filter(r => r.user.id !== req.user.id));
    setView('space');
  };

  const handleDecline = (req: any) => {
    p2p.declineRequest(req.conn);
    setInbox(prev => prev.filter(r => r.user.id !== req.user.id));
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-6 md:p-10 max-w-2xl mx-auto overflow-hidden">
      <header className="flex justify-between items-center mb-8 shrink-0 animate-slide-up">
        <div className="space-y-1">
            <h2 className="text-3xl font-black dark:text-white tracking-tighter">Your Hub</h2>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-emerald"></div>
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em]">{String(status)} • ID: {String(user.id)}</span>
            </div>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 text-slate-400 rounded-xl shadow-md hover:text-rose-500 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
            <LogOut size={20}/>
        </button>
      </header>

      <nav className="flex gap-2 p-1 bg-slate-200/40 dark:bg-slate-900/40 rounded-xl mb-8 shrink-0 border border-white dark:border-white/5 animate-slide-up">
        <button onClick={() => setActiveTab('make')} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-lg font-black text-[9px] uppercase tracking-[0.15em] transition-all ${activeTab === 'make' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-lg scale-105' : 'text-slate-500 opacity-60'}`}>
            <Plus size={18}/> Host Room
        </button>
        <button onClick={() => setActiveTab('join')} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-lg font-black text-[9px] uppercase tracking-[0.15em] transition-all ${activeTab === 'join' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-lg scale-105' : 'text-slate-500 opacity-60'}`}>
            <UserPlus size={18}/> Join Space
        </button>
        <button onClick={() => setActiveTab('inbox')} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-lg font-black text-[9px] uppercase tracking-[0.15em] transition-all relative ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-lg scale-105' : 'text-slate-500 opacity-60'}`}>
            <Bell size={18}/> Inbox
            {inbox.length > 0 && <span className="absolute top-2 right-4 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-bounce font-black">{inbox.length}</span>}
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-16 animate-slide-up">
        {activeTab === 'make' && (
            <Card className="!p-8 text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-vibe-soft mx-auto rounded-3xl flex items-center justify-center text-vibe-primary ring-4 ring-white dark:ring-slate-800 shadow-xl">
                    <Rocket size={36} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-xl font-black dark:text-white">Awaiting Partner</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Your world is open. Tell your friend your ID.</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 group transition-all hover:border-vibe">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Share this ID</p>
                    <div className="text-3xl font-black text-vibe-primary tracking-tighter select-all cursor-pointer group-hover:scale-105 transition-transform">{String(user.username)}</div>
                </div>
            </Card>
        )}

        {activeTab === 'join' && (
            <Card className="!p-8 space-y-6 shadow-2xl">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 mx-auto rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                        <Waves size={28} />
                    </div>
                    <h3 className="text-xl font-black dark:text-white">Teleport</h3>
                    <p className="text-sm text-slate-500 font-medium">Enter the identity of the world host.</p>
                </div>
                <Input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="Host ID (e.g. Sarah)" icon={<Search size={16}/>} onIconClick={handleSendRequest} onKeyDown={e => e.key === 'Enter' && handleSendRequest()} className="!py-4 !text-base" />
                <Button onClick={handleSendRequest} className="w-full !py-4 !text-xs" isLoading={status === 'request_sent'}>Initiate Connection</Button>
                {status === 'request_sent' && <Badge color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 w-full justify-center py-3 text-[10px]">Signal Broadcasted...</Badge>}
            </Card>
        )}

        {activeTab === 'inbox' && (
            <div className="space-y-4">
                {inbox.length === 0 ? (
                    <div className="text-center py-16 bg-white/40 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <MessageCircle size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Inbox is Empty</p>
                    </div>
                ) : (
                    inbox.map((req, i) => (
                        <Card key={i} className="flex items-center justify-between !p-5 border-2 border-emerald-50 dark:border-emerald-900/10 shadow-lg animate-message-pop">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-vibe text-white rounded-xl flex items-center justify-center shadow-lg">
                                    <UserIcon size={24}/>
                                </div>
                                <div>
                                    <h4 className="text-lg font-black dark:text-white">{String(req.user?.username || "Peer")}</h4>
                                    <p className="text-[10px] font-black text-vibe-primary uppercase tracking-widest">Requests Entrance</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => handleDecline(req)} variant="danger" className="!w-12 !h-12 !p-0 !rounded-xl !bg-rose-100 !text-rose-600 shadow-none"><XCircle size={20}/></Button>
                                <Button onClick={() => handleAccept(req)} className="!w-12 !h-12 !p-0 !rounded-xl !bg-emerald-500 shadow-lg"><CheckCircle2 size={24}/></Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        )}
      </div>
    </div>
  );
};

const Space = ({ user, onBack }: { user: User, onBack: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [game, setGame] = useState<GameState>({ board: Array(42).fill(null), status: 'waiting' });
  const [showGame, setShowGame] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    p2p.init({
        onMessage: (data) => {
            if (data && data.type === 'CHAT') setMessages(prev => [...prev, data.msg]);
            if (data && data.type === 'GAME') setGame(data.game);
        },
        onStatus: (s) => {
            if (s === 'disconnected') onBack();
        }
    });
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiLoading]);

  const sendMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const msg: Message = { sender_id: user.id, sender_name: user.username, content: trimmed, timestamp: Date.now(), type: 'text' };
    setMessages(prev => [...prev, msg]);
    p2p.send({ type: 'CHAT', msg });
    setChatInput('');

    if (trimmed.toLowerCase().includes('@ai')) {
        setAiLoading(true);
        const reply = await AI.getAiResponse(trimmed, messages, user.settings.aiTone);
        const aiMsg: Message = { sender_id: 'ai', sender_name: 'Duo AI', content: String(reply), timestamp: Date.now(), type: 'ai' };
        setMessages(prev => [...prev, aiMsg]);
        p2p.send({ type: 'CHAT', msg: aiMsg });
        setAiLoading(false);
    }
  };

  const handleMove = (col: number) => {
      const board = [...game.board];
      for (let r = 5; r >= 0; r--) {
          if (!board[r * 7 + col]) {
              board[r * 7 + col] = user.id;
              const newGame = { ...game, board, status: 'active' as const };
              setGame(newGame);
              p2p.send({ type: 'GAME', game: newGame });
              return;
          }
      }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <header className="p-5 flex items-center justify-between border-b-2 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shrink-0 z-20 shadow-sm">
            <button onClick={() => { p2p.disconnect(); onBack(); }} className="p-2 text-slate-500 hover:text-vibe-primary transition-all bg-slate-100 dark:bg-slate-800 rounded-xl"><ArrowLeft size={20}/></button>
            <div className="flex flex-col items-center">
              <h2 className="text-base font-black dark:text-white tracking-tight">Active Portal</h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-emerald"></span>
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">P2P Link Synchronized</span>
              </div>
            </div>
            <button onClick={() => setShowGame(!showGame)} className={`p-2 rounded-xl transition-all shadow-md ${showGame ? 'bg-vibe text-white rotate-12 scale-110' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                <Gamepad2 size={24}/>
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-32 no-scrollbar text-slate-900 dark:text-slate-100 max-w-2xl mx-auto w-full">
            {showGame && <Connect4 game={game} onMove={handleMove} isMyTurn={true} myId={user.id} />}
            
            <div className="flex flex-col gap-1">
                {messages.map((m, i) => {
                    const isMine = m.sender_id === user.id;
                    const isAi = m.sender_id === 'ai';
                    const prevMsg = messages[i - 1];
                    const nextMsg = messages[i + 1];
                    const isGroupedTop = prevMsg?.sender_id === m.sender_id;
                    const isGroupedBottom = nextMsg?.sender_id === m.sender_id;

                    return (
                        <div key={m.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-message-pop`}>
                            <div className={`
                                px-4 py-2.5 font-bold shadow-md max-w-[88%] ring-1 ring-black/5 dark:ring-white/5
                                ${isMine ? 'bg-vibe text-white shadow-vibe/10' : 'bg-white dark:bg-slate-800 dark:text-slate-100'}
                                ${isAi ? 'bg-emerald-600 text-white shadow-emerald-600/10' : ''}
                                ${isMine ? (isGroupedTop ? 'rounded-tr-sm' : 'rounded-tr-none') : (isGroupedTop ? 'rounded-tl-sm' : 'rounded-tl-none')}
                                ${isGroupedBottom ? (isMine ? 'rounded-br-sm' : 'rounded-bl-sm') : 'rounded-2xl'}
                                ${!isGroupedTop && !isGroupedBottom ? 'rounded-2xl' : ''}
                            `}>
                                <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-base">{String(m.content)}</p>
                            </div>
                            {!isGroupedBottom && (
                                <span className="text-[8px] font-black uppercase text-slate-400 mt-1.5 px-3 tracking-[0.1em]">
                                    {isAi ? '✨ Duo AI Assistant' : String(m.sender_name)}
                                </span>
                            )}
                        </div>
                    );
                })}
                {aiLoading && <TypingIndicator />}
            </div>
            <div ref={scrollRef} className="h-4" />
        </div>

        <div className="absolute bottom-6 left-0 right-0 px-6 z-30 max-w-2xl mx-auto w-full">
            <Card className="flex items-center gap-3 !p-2 shadow-2xl border-2 border-white dark:border-white/5 group focus-within:ring-4 focus-within:ring-vibe/5 transition-all !rounded-2xl">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-transparent outline-none font-bold text-slate-900 dark:text-white px-4 placeholder:text-slate-400 text-base" placeholder="Transmit message..." />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="w-12 h-12 bg-vibe text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-20 transition-all"><Send size={20}/></button>
            </Card>
        </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(p2p.user);
  const [view, setView] = useState<'dashboard' | 'space'>('dashboard');

  if (!user) return <Auth onLogin={setUser} />;
  
  return view === 'dashboard' 
    ? <Dashboard user={user} setView={setView} /> 
    : <Space user={user} onBack={() => setView('dashboard')} />;
};

export default App;