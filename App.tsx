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
  <div className="flex gap-1 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none w-fit animate-message-pop shadow-sm border border-slate-100 dark:border-slate-700/50">
    <div className="w-1.5 h-1.5 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0s' }} />
    <div className="w-1.5 h-1.5 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.2s' }} />
    <div className="w-1.5 h-1.5 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.4s' }} />
  </div>
);

const Connect4 = ({ game, onMove, isMyTurn, myId }: { game: GameState, onMove: (col: number) => void, isMyTurn: boolean, myId: string }) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  return (
    <Card className="!p-5 animate-slide-up mb-6 border border-white/60 dark:border-white/5">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Zap size={14} className="text-amber-500 animate-pulse" /> Duel Arena
        </h4>
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm ${isMyTurn ? 'bg-vibe text-white scale-105' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          {isMyTurn ? "Your Turn" : "Opponent Turn"}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 bg-slate-100 dark:bg-black/30 p-4 rounded-[1.5rem] relative ring-1 ring-slate-200 dark:ring-white/5">
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
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4 mb-8 animate-slide-up">
        <div className="w-16 h-16 bg-vibe mx-auto rounded-2xl flex items-center justify-center text-white shadow-vibe animate-bounce">
            <Heart size={32} fill="currentColor" />
        </div>
        <div className="space-y-1">
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-vibe tracking-tighter">DuoSpace</h1>
            <p className="text-slate-600 dark:text-slate-400 font-bold text-[10px] tracking-[0.2em] uppercase">Private Dimension</p>
        </div>
      </div>

      <Card className="w-full max-w-sm space-y-6 !p-8 shadow-4xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <Input label="Your Identity Name" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. Sarah" autoFocus />
        {error && <p className="text-xs font-bold text-rose-500 text-center">{error}</p>}
        <Button onClick={handleRegister} className="w-full py-4 text-[11px]">Initialize Space</Button>
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-center text-slate-500 dark:text-slate-500 font-medium leading-relaxed">Purely Peer-to-Peer. No tracking.</p>
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
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-4 md:p-8 max-w-xl mx-auto overflow-hidden">
      <header className="flex justify-between items-start mb-6 shrink-0 animate-slide-up">
        <div className="space-y-0.5">
            <h2 className="text-3xl font-black dark:text-white tracking-tighter">Dimension</h2>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-emerald"></div>
                <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-[0.2em]">{status} • {user.id}</span>
            </div>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-3 bg-white dark:bg-slate-900 text-slate-500 rounded-xl shadow-sm hover:text-rose-500 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
            <LogOut size={20}/>
        </button>
      </header>

      <nav className="flex gap-2 p-1 bg-slate-200/40 dark:bg-slate-900/50 rounded-[1.25rem] mb-6 shrink-0 border border-slate-100 dark:border-white/5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <button onClick={() => setActiveTab('make')} className={`flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === 'make' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-lg' : 'text-slate-500'}`}>
            <Plus size={16} className="mb-0.5"/> Make DuoSpace
        </button>
        <button onClick={() => setActiveTab('join')} className={`flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all duration-300 ${activeTab === 'join' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-lg' : 'text-slate-500'}`}>
            <UserPlus size={16} className="mb-0.5"/> Join Room
        </button>
        <button onClick={() => setActiveTab('inbox')} className={`flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all duration-300 relative ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-lg' : 'text-slate-500'}`}>
            <Bell size={16} className="mb-0.5"/> Inbox
            {inbox.length > 0 && <span className="absolute top-1.5 right-3 w-4 h-4 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-bounce">{inbox.length}</span>}
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {activeTab === 'make' && (
            <Card className="!p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-vibe-soft mx-auto rounded-2xl flex items-center justify-center text-vibe-primary shadow-inner ring-2 ring-white dark:ring-slate-800">
                    <Rocket size={40} className="animate-pulse" />
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-xl font-black dark:text-white">Hosting Space</h3>
                    <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">Identity is active and waiting.</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-[9px] font-black uppercase text-slate-600 mb-1">Share this name</p>
                    <div className="text-2xl font-black text-vibe-primary tracking-tighter select-all">{user.username}</div>
                </div>
            </Card>
        )}

        {activeTab === 'join' && (
            <Card className="!p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 mx-auto rounded-xl flex items-center justify-center mb-2">
                        <Waves size={24} />
                    </div>
                    <h3 className="text-xl font-black dark:text-white">Join by Name</h3>
                    <p className="text-xs text-slate-700 dark:text-slate-400 font-medium leading-relaxed">Enter a name to send a handshake.</p>
                </div>
                <Input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="Friend's P2P Name..." icon={<Search size={18}/>} onIconClick={handleSendRequest} onKeyDown={e => e.key === 'Enter' && handleSendRequest()} />
                <Button onClick={handleSendRequest} className="w-full">Initiate Handshake</Button>
                {status === 'request_sent' && <Badge color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 w-full justify-center py-2">✓ Handshake Sent</Badge>}
            </Card>
        )}

        {activeTab === 'inbox' && (
            <div className="space-y-3">
                {inbox.length === 0 ? (
                    <div className="text-center py-20 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-800">
                        <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Waiting for handshakes...</p>
                    </div>
                ) : (
                    inbox.map((req, i) => (
                        <Card key={i} className="flex items-center justify-between !p-5 hover:scale-[1.01] transition-all border border-emerald-100 dark:border-emerald-900/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-vibe text-white rounded-xl flex items-center justify-center shadow-md">
                                    <UserIcon size={24}/>
                                </div>
                                <div>
                                    <h4 className="text-lg font-black dark:text-white">{req.user.username}</h4>
                                    <p className="text-[9px] font-black text-vibe-primary uppercase tracking-widest">Handshake Request</p>
                                </div>
                            </div>
                            <Button onClick={() => handleAccept(req)} className="!w-10 !h-10 !p-0 !rounded-lg !bg-emerald-500"><CheckCircle2 size={20}/></Button>
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
        <header className="p-4 md:p-6 flex items-center justify-between border-b dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shrink-0 z-20">
            <button onClick={onBack} className="p-2 text-slate-600 hover:text-vibe-primary transition-all active:scale-90"><ArrowLeft size={24}/></button>
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-black dark:text-white tracking-tight">Linked Space</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-emerald"></span>
                <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-400 tracking-[0.2em]">P2P Active</span>
              </div>
            </div>
            <button onClick={() => setShowGame(!showGame)} className={`p-2 rounded-lg transition-all duration-500 ${showGame ? 'bg-vibe text-white shadow-vibe rotate-12' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                <Gamepad2 size={24}/>
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 pb-32 no-scrollbar text-slate-900 dark:text-slate-100">
            {showGame && <Connect4 game={game} onMove={handleMove} isMyTurn={true} myId={user.id} />}
            
            <div className="flex flex-col gap-1.5">
                {messages.map((m, i) => {
                    const isMine = m.sender_id === user.id;
                    const isAi = m.sender_id === 'ai';
                    const prevMsg = messages[i - 1];
                    const nextMsg = messages[i + 1];
                    const isGroupedTop = prevMsg?.sender_id === m.sender_id;
                    const isGroupedBottom = nextMsg?.sender_id === m.sender_id;

                    return (
                        <div key={m.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-message-pop`} style={{ animationDelay: `${i * 0.03}s` }}>
                            <div className={`
                                px-4 py-2.5 font-bold shadow-sm max-w-[85%] transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5
                                ${isMine ? 'bg-vibe text-white shadow-vibe/10' : 'bg-white dark:bg-slate-800 dark:text-slate-100'}
                                ${isAi ? 'bg-emerald-600 text-white shadow-emerald-500/10' : ''}
                                ${isMine ? (isGroupedTop ? 'rounded-tr-md' : 'rounded-tr-none') : (isGroupedTop ? 'rounded-tl-md' : 'rounded-tl-none')}
                                ${isGroupedBottom ? (isMine ? 'rounded-br-md mb-0.5' : 'rounded-bl-md mb-0.5') : 'rounded-[1.25rem]'}
                                ${!isGroupedTop && !isGroupedBottom ? 'rounded-[1.25rem]' : ''}
                            `}>
                                <p className="leading-snug whitespace-pre-wrap text-[13px] md:text-sm">{m.content}</p>
                            </div>
                            {!isGroupedBottom && (
                                <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-500 mt-1.5 px-3 tracking-[0.1em]">
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

        <div className="absolute bottom-6 left-0 right-0 px-4 md:px-6 z-30">
            <Card className="flex items-center gap-3 !p-2 shadow-4xl border-white dark:border-white/5 group focus-within:ring-4 focus-within:ring-vibe/10 transition-all duration-500 !rounded-[1.5rem]">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-transparent outline-none font-bold text-slate-900 dark:text-white px-3 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm" placeholder="Message or @ai..." />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="w-12 h-12 bg-vibe text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-20 transition-all group-focus-within:scale-105"><Send size={20}/></button>
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