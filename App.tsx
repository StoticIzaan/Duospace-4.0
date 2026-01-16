import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Heart, Send, Gamepad2, LogOut, Plus, ArrowLeft, 
  X, Sparkles, Trophy, Share2, Search, User as UserIcon,
  Zap, MessageCircle, Bell, UserPlus, CheckCircle2, Rocket, Waves
} from 'lucide-react';
import { p2p } from './services/peerService'; 
import { User, Message, GameState } from './types';
import { Button, Input, Card, Badge } from './components/Common';
import * as AI from './services/geminiService';

const TypingIndicator = () => (
  <div className="flex gap-1.5 px-6 py-4 bg-white dark:bg-slate-800 rounded-3xl rounded-tl-none w-fit animate-message-pop shadow-sm border border-slate-100 dark:border-slate-700/50">
    <div className="w-2 h-2 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0s' }} />
    <div className="w-2 h-2 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.2s' }} />
    <div className="w-2 h-2 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.4s' }} />
  </div>
);

const Connect4 = ({ game, onMove, isMyTurn, myId }: { game: GameState, onMove: (col: number) => void, isMyTurn: boolean, myId: string }) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  return (
    <Card className="!p-8 animate-slide-up mb-8 border-2 border-white/60 dark:border-white/5">
      <div className="flex justify-between items-center mb-8">
        <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-600 dark:text-slate-300 flex items-center gap-3">
          <Zap size={16} className="text-amber-500 animate-pulse" /> Duel Arena
        </h4>
        <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm ${isMyTurn ? 'bg-vibe text-white scale-110' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          {isMyTurn ? "Your Turn" : "Opponent Turn"}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-3 bg-slate-100 dark:bg-black/30 p-6 rounded-[3rem] relative ring-1 ring-slate-200 dark:ring-white/5">
        {game.board.map((ownerId, i) => {
          const col = i % 7;
          return (
            <div 
              key={i} 
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => onMove(col)} 
              className={`w-full aspect-square bg-white dark:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-inner ${hoverCol === col ? 'ring-2 ring-vibe-soft scale-105' : ''}`}
            >
              {ownerId && (
                <div className={`w-[85%] h-[85%] rounded-full shadow-2xl animate-gravity-drop ${ownerId === myId ? 'bg-vibe' : 'bg-rose-500'}`} />
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
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-10 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-8 mb-16 animate-slide-up">
        <div className="w-28 h-28 bg-vibe mx-auto rounded-[3rem] flex items-center justify-center text-white shadow-vibe animate-bounce">
            <Heart size={56} fill="currentColor" />
        </div>
        <div className="space-y-2">
            <h1 className="text-7xl font-black bg-clip-text text-transparent bg-vibe tracking-tighter">DuoSpace</h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm tracking-[0.3em] uppercase">Private Dimension</p>
        </div>
      </div>

      <Card className="w-full max-w-md space-y-8 !p-12 shadow-5xl animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <Input label="Your Identity Name" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. Sarah" autoFocus />
        {error && <p className="text-sm font-bold text-rose-500 text-center">{error}</p>}
        <Button onClick={handleRegister} className="w-full py-5 text-sm">Initialize Space</Button>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[12px] text-center text-slate-500 dark:text-slate-500 font-medium leading-relaxed">Everything is peer-to-peer. No servers. No tracking. Just two humans connected directly.</p>
        </div>
      </Card>
    </div>
  );
};

const Dashboard = ({ user, setView }: { user: User, setView: (v: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'make' | 'join' | 'inbox'>('make');
  const [targetName, setTargetName] = useState('');
  const [inbox, setInbox] = useState<any[]>([]);
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    p2p.init({
        onMessage: () => {},
        onStatus: setStatus,
        onInbox: (req) => {
            setInbox(prev => [...prev, req]);
        }
    });
  }, []);

  const handleSendRequest = () => {
    if (!targetName.trim()) return;
    p2p.sendRequest(targetName);
  };

  const handleAccept = (req: any) => {
    p2p.acceptRequest(req.conn);
    setView('space');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-8 md:p-12 max-w-2xl mx-auto overflow-hidden">
      <header className="flex justify-between items-start mb-12 shrink-0 animate-slide-up">
        <div className="space-y-1">
            <h2 className="text-5xl font-black dark:text-white tracking-tighter">Dimension</h2>
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse-emerald"></div>
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-[0.3em]">{status} • {user.id}</span>
            </div>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-5 bg-white dark:bg-slate-900 text-slate-500 rounded-[1.5rem] shadow-sm hover:text-rose-500 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
            <LogOut size={28}/>
        </button>
      </header>

      <nav className="flex gap-3 p-2 bg-slate-200/40 dark:bg-slate-900/50 rounded-[2rem] mb-10 shrink-0 border border-slate-100 dark:border-white/5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <button onClick={() => setActiveTab('make')} className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'make' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-xl scale-105' : 'text-slate-500'}`}>
            <Plus size={20} className="mb-1"/> Make DuoSpace
        </button>
        <button onClick={() => setActiveTab('join')} className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'join' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-xl scale-105' : 'text-slate-500'}`}>
            <UserPlus size={20} className="mb-1"/> Join Room
        </button>
        <button onClick={() => setActiveTab('inbox')} className={`flex-1 flex flex-col items-center gap-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 relative ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-xl scale-105' : 'text-slate-500'}`}>
            <Bell size={20} className="mb-1"/> Inbox
            {inbox.length > 0 && <span className="absolute top-2 right-4 w-6 h-6 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-bounce">{inbox.length}</span>}
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {activeTab === 'make' && (
            <Card className="!p-12 text-center space-y-8">
                <div className="w-28 h-28 bg-vibe-soft mx-auto rounded-[3rem] flex items-center justify-center text-vibe-primary shadow-inner ring-4 ring-white dark:ring-slate-800">
                    <Rocket size={56} className="animate-pulse" />
                </div>
                <div className="space-y-3">
                    <h3 className="text-3xl font-black dark:text-white">Hosting Space</h3>
                    <p className="text-base text-slate-700 dark:text-slate-400 font-medium">Your identity is active and waiting for a friend's handshake.</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-[11px] font-black uppercase text-slate-600 mb-2">Share this name with your friend</p>
                    <div className="text-3xl font-black text-vibe-primary tracking-tighter select-all">{user.username}</div>
                </div>
            </Card>
        )}

        {activeTab === 'join' && (
            <Card className="!p-12 space-y-8">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 mx-auto rounded-2xl flex items-center justify-center mb-4">
                        <Waves size={32} />
                    </div>
                    <h3 className="text-3xl font-black dark:text-white">Join by Name</h3>
                    <p className="text-base text-slate-700 dark:text-slate-400 font-medium leading-relaxed">Enter your friend's name to send a handshake request.</p>
                </div>
                <Input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="Friend's P2P Name..." icon={<Search size={24}/>} onIconClick={handleSendRequest} onKeyDown={e => e.key === 'Enter' && handleSendRequest()} />
                <Button onClick={handleSendRequest} className="w-full py-5">Initiate Handshake</Button>
                {status === 'request_sent' && <Badge color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 w-full justify-center py-4">✓ Request Sent! Tell them to check their Inbox.</Badge>}
            </Card>
        )}

        {activeTab === 'inbox' && (
            <div className="space-y-5">
                {inbox.length === 0 ? (
                    <div className="text-center py-32 bg-white/40 dark:bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-300 dark:border-slate-800">
                        <MessageCircle size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-lg text-slate-500 dark:text-slate-400 font-bold tracking-tight">Your inbox is waiting for pulses...</p>
                    </div>
                ) : (
                    inbox.map((req, i) => (
                        <Card key={i} className="flex items-center justify-between !p-8 hover:scale-[1.02] transition-all border-2 border-emerald-100 dark:border-emerald-900/20">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-vibe text-white rounded-[1.5rem] flex items-center justify-center shadow-lg">
                                    <UserIcon size={32}/>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black dark:text-white">{req.user.username}</h4>
                                    <p className="text-[11px] font-black text-vibe-primary uppercase tracking-widest mt-1">Handshake Requested</p>
                                </div>
                            </div>
                            <Button onClick={() => handleAccept(req)} className="!w-16 !h-16 !p-0 !rounded-2xl !bg-emerald-500"><CheckCircle2 size={32}/></Button>
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
  const [status, setStatus] = useState('connected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [game, setGame] = useState<GameState>({ board: Array(42).fill(null), status: 'waiting' });
  const [showGame, setShowGame] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    p2p.init({
        onMessage: (data) => {
            if (data.type === 'CHAT') setMessages(prev => [...prev, data.msg]);
            if (data.type === 'GAME') setGame(data.game);
        },
        onStatus: setStatus
    });
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiLoading]);

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg: Message = { sender_id: user.id, sender_name: user.username, content: chatInput, timestamp: Date.now(), type: 'text' };
    setMessages(prev => [...prev, msg]);
    p2p.send({ type: 'CHAT', msg });
    setChatInput('');

    if (chatInput.toLowerCase().includes('@ai')) {
        setAiLoading(true);
        const reply = await AI.getAiResponse(chatInput, messages, user.settings.aiTone);
        const aiMsg: Message = { sender_id: 'ai', sender_name: 'Duo AI', content: reply, timestamp: Date.now(), type: 'ai' };
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
        <header className="p-8 flex items-center justify-between border-b dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shrink-0 z-20">
            <button onClick={onBack} className="p-4 text-slate-600 hover:text-vibe-primary transition-all active:scale-90"><ArrowLeft size={32}/></button>
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-black dark:text-white tracking-tight">Linked Space</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-emerald"></span>
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-400 tracking-[0.2em]">P2P Active</span>
              </div>
            </div>
            <button onClick={() => setShowGame(!showGame)} className={`p-4 rounded-2xl transition-all duration-500 ${showGame ? 'bg-vibe text-white shadow-vibe rotate-12' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                <Gamepad2 size={32}/>
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 pb-48 no-scrollbar text-slate-900 dark:text-slate-100">
            {showGame && <Connect4 game={game} onMove={handleMove} isMyTurn={true} myId={user.id} />}
            
            <div className="flex flex-col gap-2">
                {messages.map((m, i) => {
                    const isMine = m.sender_id === user.id;
                    const isAi = m.sender_id === 'ai';
                    const prevMsg = messages[i - 1];
                    const nextMsg = messages[i + 1];
                    const isGroupedTop = prevMsg?.sender_id === m.sender_id;
                    const isGroupedBottom = nextMsg?.sender_id === m.sender_id;

                    return (
                        <div key={m.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-message-pop`} style={{ animationDelay: `${i * 0.05}s` }}>
                            <div className={`
                                px-6 py-4 font-bold shadow-sm max-w-[88%] transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5
                                ${isMine ? 'bg-vibe text-white shadow-vibe/10' : 'bg-white dark:bg-slate-800 dark:text-slate-100'}
                                ${isAi ? 'bg-emerald-600 text-white shadow-emerald-500/10' : ''}
                                ${isMine ? (isGroupedTop ? 'rounded-tr-md' : 'rounded-tr-none') : (isGroupedTop ? 'rounded-tl-md' : 'rounded-tl-none')}
                                ${isGroupedBottom ? (isMine ? 'rounded-br-md mb-0.5' : 'rounded-bl-md mb-0.5') : 'rounded-[2rem]'}
                                ${!isGroupedTop && !isGroupedBottom ? 'rounded-[2rem]' : ''}
                            `}>
                                <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-base">{m.content}</p>
                            </div>
                            {!isGroupedBottom && (
                                <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-500 mt-2.5 px-4 tracking-[0.15em]">
                                    {isAi ? '✨ Duo AI' : m.sender_name}
                                </span>
                            )}
                        </div>
                    );
                })}
                {aiLoading && <TypingIndicator />}
            </div>
            <div ref={scrollRef} className="h-1" />
        </div>

        <div className="absolute bottom-10 left-0 right-0 px-8 z-30">
            <Card className="flex items-center gap-4 !p-4 shadow-5xl border-white dark:border-white/5 group focus-within:ring-8 focus-within:ring-vibe/10 transition-all duration-500">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-transparent outline-none font-bold text-slate-900 dark:text-white px-5 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Type a message or whisper to @ai..." />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="w-16 h-16 bg-vibe text-white rounded-[1.75rem] flex items-center justify-center shadow-xl active:scale-90 disabled:opacity-20 transition-all group-focus-within:scale-110"><Send size={28}/></button>
            </Card>
        </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(p2p.user);
  const [view, setView] = useState<'dashboard' | 'space'>('dashboard');

  if (!user) return <Auth onLogin={setUser} />;
  
  return (
    <HashRouter>
      {view === 'dashboard' ? <Dashboard user={user} setView={setView} /> : <Space user={user} onBack={() => setView('dashboard')} />}
    </HashRouter>
  );
};

export default App;