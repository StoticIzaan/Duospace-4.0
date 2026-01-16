import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Send, Gamepad2, LogOut, Plus, ArrowLeft, 
  Search, User as UserIcon, Zap, MessageCircle, Bell, UserPlus, 
  CheckCircle2, Rocket, Waves
} from 'lucide-react';
import { p2p } from './peerService'; 
import { User, Message, GameState } from './types';
import { Button, Input, Card, Badge } from './components/Common';
import * as AI from './geminiService';

const TypingIndicator = () => (
  <div className="flex gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl rounded-tl-none w-fit animate-message-pop shadow-sm border border-slate-100 dark:border-slate-700/50">
    <div className="w-1 h-1 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0s' }} />
    <div className="w-1 h-1 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.2s' }} />
    <div className="w-1 h-1 bg-vibe rounded-full dot-jump" style={{ animationDelay: '0.4s' }} />
  </div>
);

const Connect4 = ({ game, onMove, isMyTurn, myId }: { game: GameState, onMove: (col: number) => void, isMyTurn: boolean, myId: string }) => {
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  return (
    <Card className="!p-3 animate-slide-up mb-4 border border-white/60 dark:border-white/5">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Zap size={10} className="text-amber-500 animate-pulse" /> Arena
        </h4>
        <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm ${isMyTurn ? 'bg-vibe text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
          {isMyTurn ? "Your Turn" : "Opponent"}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 bg-slate-100 dark:bg-black/20 p-2 rounded-lg relative">
        {game.board.map((ownerId, i) => {
          const col = i % 7;
          return (
            <div 
              key={i} 
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => onMove(col)} 
              className={`w-full aspect-square bg-white dark:bg-slate-800 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${hoverCol === col ? 'ring-1 ring-vibe-soft' : ''}`}
            >
              {ownerId && (
                <div className={`w-[70%] h-[70%] rounded-full shadow-md animate-gravity-drop ${ownerId === myId ? 'bg-vibe' : 'bg-rose-500'}`} />
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
    } catch (err: any) { setError(err.message || "Connection failed"); }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-3 mb-6 animate-slide-up">
        <div className="w-12 h-12 bg-vibe mx-auto rounded-xl flex items-center justify-center text-white shadow-vibe animate-bounce">
            <Heart size={24} fill="currentColor" />
        </div>
        <div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-vibe tracking-tighter">DuoSpace</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-[8px] tracking-[0.2em] uppercase">Private Dimension</p>
        </div>
      </div>

      <Card className="w-full max-w-[280px] space-y-4 !p-5 shadow-2xl animate-slide-up">
        <Input label="Identity Name" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. Sarah" autoFocus />
        {error && <p className="text-[9px] font-bold text-rose-500 text-center">{error}</p>}
        <Button onClick={handleRegister} className="w-full">Initialize</Button>
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[8px] text-slate-400 font-medium">Pure P2P • No tracking</p>
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
        onStatus: setStatus,
        onInbox: (req) => {
            setInbox(prev => [...prev, req]);
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
    setView('space');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-4 md:p-6 max-w-md mx-auto overflow-hidden">
      <header className="flex justify-between items-start mb-4 shrink-0 animate-slide-up">
        <div className="space-y-0.5">
            <h2 className="text-xl font-black dark:text-white tracking-tighter">Dimension</h2>
            <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse-emerald"></div>
                <span className="text-[7px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.15em]">{String(status)} • {String(user.id)}</span>
            </div>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="p-2 bg-white dark:bg-slate-900 text-slate-400 rounded-lg shadow-sm hover:text-rose-500 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
            <LogOut size={16}/>
        </button>
      </header>

      <nav className="flex gap-1 p-0.5 bg-slate-200/30 dark:bg-slate-900/40 rounded-lg mb-4 shrink-0 border border-slate-100 dark:border-white/5 animate-slide-up">
        <button onClick={() => setActiveTab('make')} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md font-black text-[7px] uppercase tracking-[0.1em] transition-all ${activeTab === 'make' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-sm' : 'text-slate-500'}`}>
            <Plus size={12}/> Make
        </button>
        <button onClick={() => setActiveTab('join')} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md font-black text-[7px] uppercase tracking-[0.1em] transition-all ${activeTab === 'join' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-sm' : 'text-slate-500'}`}>
            <UserPlus size={12}/> Join
        </button>
        <button onClick={() => setActiveTab('inbox')} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md font-black text-[7px] uppercase tracking-[0.1em] transition-all relative ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-800 text-vibe-primary shadow-sm' : 'text-slate-500'}`}>
            <Bell size={12}/> Inbox
            {inbox.length > 0 && <span className="absolute top-0.5 right-1.5 w-3 h-3 bg-rose-500 text-white text-[6px] flex items-center justify-center rounded-full border border-white dark:border-slate-800 animate-bounce">{inbox.length}</span>}
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-12 animate-slide-up">
        {activeTab === 'make' && (
            <Card className="!p-5 text-center space-y-3">
                <div className="w-12 h-12 bg-vibe-soft mx-auto rounded-xl flex items-center justify-center text-vibe-primary ring-1 ring-white dark:ring-slate-800">
                    <Rocket size={24} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-base font-black dark:text-white">Hosting Now</h3>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">Waiting for connections.</p>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-[7px] font-black uppercase text-slate-400 mb-0.5 tracking-wider">Your P2P Name</p>
                    <div className="text-lg font-black text-vibe-primary tracking-tighter select-all">{String(user.username)}</div>
                </div>
            </Card>
        )}

        {activeTab === 'join' && (
            <Card className="!p-5 space-y-4">
                <div className="text-center space-y-0.5">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 mx-auto rounded-lg flex items-center justify-center mb-1">
                        <Waves size={18} />
                    </div>
                    <h3 className="text-base font-black dark:text-white">Join Space</h3>
                    <p className="text-[9px] text-slate-500">Enter a friend's peer name.</p>
                </div>
                <Input value={targetName} onChange={e => setTargetName(e.target.value)} placeholder="Friend's Name..." icon={<Search size={12}/>} onIconClick={handleSendRequest} onKeyDown={e => e.key === 'Enter' && handleSendRequest()} />
                <Button onClick={handleSendRequest} className="w-full">Initiate</Button>
                {status === 'request_sent' && <Badge color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 w-full justify-center py-1.5">Handshake Sent</Badge>}
            </Card>
        )}

        {activeTab === 'inbox' && (
            <div className="space-y-2">
                {inbox.length === 0 ? (
                    <div className="text-center py-10 bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <MessageCircle size={20} className="mx-auto text-slate-300 mb-1" />
                        <p className="text-[10px] text-slate-400 font-bold">No requests yet.</p>
                    </div>
                ) : (
                    inbox.map((req, i) => (
                        <Card key={i} className="flex items-center justify-between !p-3 border border-emerald-50 dark:border-emerald-900/10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-vibe text-white rounded-lg flex items-center justify-center">
                                    <UserIcon size={18}/>
                                </div>
                                <div>
                                    <h4 className="text-sm font-black dark:text-white">{String(req.user?.username || "Peer")}</h4>
                                    <p className="text-[7px] font-black text-vibe-primary uppercase tracking-wider">Connect Request</p>
                                </div>
                            </div>
                            <Button onClick={() => handleAccept(req)} className="!w-7 !h-7 !p-0 !rounded-md !bg-emerald-500 shadow-none"><CheckCircle2 size={14}/></Button>
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
        onStatus: () => {}
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
        <header className="p-3 flex items-center justify-between border-b dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shrink-0 z-20">
            <button onClick={onBack} className="p-1.5 text-slate-500 hover:text-vibe-primary transition-all"><ArrowLeft size={18}/></button>
            <div className="flex flex-col items-center">
              <h2 className="text-sm font-black dark:text-white tracking-tight">Connected Space</h2>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse-emerald"></span>
                <span className="text-[7px] font-black uppercase text-slate-500 tracking-[0.1em]">P2P Link Active</span>
              </div>
            </div>
            <button onClick={() => setShowGame(!showGame)} className={`p-1.5 rounded-md transition-all ${showGame ? 'bg-vibe text-white rotate-12' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                <Gamepad2 size={18}/>
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24 no-scrollbar text-slate-900 dark:text-slate-100">
            {showGame && <Connect4 game={game} onMove={handleMove} isMyTurn={true} myId={user.id} />}
            
            <div className="flex flex-col gap-0.5">
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
                                px-3 py-1.5 font-bold shadow-sm max-w-[85%] ring-1 ring-black/5 dark:ring-white/5
                                ${isMine ? 'bg-vibe text-white shadow-vibe/5' : 'bg-white dark:bg-slate-800 dark:text-slate-100'}
                                ${isAi ? 'bg-emerald-600 text-white' : ''}
                                ${isMine ? (isGroupedTop ? 'rounded-tr-sm' : 'rounded-tr-none') : (isGroupedTop ? 'rounded-tl-sm' : 'rounded-tl-none')}
                                ${isGroupedBottom ? (isMine ? 'rounded-br-sm' : 'rounded-bl-sm') : 'rounded-xl'}
                                ${!isGroupedTop && !isGroupedBottom ? 'rounded-xl' : ''}
                            `}>
                                <p className="leading-tight whitespace-pre-wrap text-[11px] md:text-[12px]">{String(m.content)}</p>
                            </div>
                            {!isGroupedBottom && (
                                <span className="text-[6px] font-black uppercase text-slate-400 mt-0.5 px-2 tracking-[0.05em]">
                                    {isAi ? '✨ Duo AI' : String(m.sender_name)}
                                </span>
                            )}
                        </div>
                    );
                })}
                {aiLoading && <TypingIndicator />}
            </div>
            <div ref={scrollRef} className="h-1" />
        </div>

        <div className="absolute bottom-3 left-0 right-0 px-3 z-30">
            <Card className="flex items-center gap-2 !p-1 shadow-2xl border-white dark:border-white/5 group focus-within:ring-2 focus-within:ring-vibe/10 transition-all !rounded-xl">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-transparent outline-none font-bold text-slate-900 dark:text-white px-2 placeholder:text-slate-400 text-[11px]" placeholder="Type a message..." />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="w-8 h-8 bg-vibe text-white rounded-lg flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-20 transition-all"><Send size={14}/></button>
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