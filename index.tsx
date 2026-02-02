import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

// --- COSTANTI E CONFIGURAZIONE ---
const BOARD_SIZE = 48;
const PLAYER_COLORS = ['#1E3A8A', '#FBBF24', '#F97316', '#15803D', '#7E22CE'];
const PLAYER_ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐸'];
const TILE_COLORS = ['#1E3A8A', '#F97316', '#FBBF24', '#7E22CE', '#15803D'];

const TileType = {
  START: 'START', END: 'END', QUESTION: 'QUESTION', 
  GOOSE: 'GOOSE', BRIDGE: 'BRIDGE', INN: 'INN', 
  WELL: 'WELL', LABYRINTH: 'LABYRINTH', DEATH: 'DEATH'
};

const SPECIAL_TILES: Record<number, any> = {
  0: { type: TileType.START, icon: "🚀", label: "Partenza" },
  5: { type: TileType.GOOSE, icon: "🪿", label: "Oca" },
  6: { type: TileType.BRIDGE, icon: "🚰", label: "Rubinetto" },
  9: { type: TileType.GOOSE, icon: "🪿", label: "Oca" },
  14: { type: TileType.GOOSE, icon: "🪿", label: "Oca" },
  18: { type: TileType.INN, icon: "🚗", label: "Auto" },
  23: { type: TileType.GOOSE, icon: "🪿", label: "Oca" },
  30: { type: TileType.WELL, icon: "💡", label: "Energia" },
  35: { type: TileType.LABYRINTH, icon: "🐦‍⬛", label: "Corvo" },
  41: { type: TileType.DEATH, icon: "🍎", label: "Rifiuti" },
  47: { type: TileType.END, icon: "🏁", label: "Arrivo" },
};

// --- COMPONENTI UI ---

const Dice = ({ value, rolling, onRoll, disabled }: any) => {
  const dots: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  };
  const currentDots = value ? dots[value] : [];

  return (
    <button 
      onClick={onRoll}
      disabled={rolling || disabled}
      className={`relative w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-5 transition-all
        ${rolling ? 'animate-bounce scale-110' : 'hover:scale-105 active:scale-95'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} border-b-8 border-slate-200`}
    >
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {currentDots.includes(i) && <div className="w-4 h-4 bg-slate-800 rounded-full shadow-inner" />}
          </div>
        ))}
      </div>
    </button>
  );
};

const Board = ({ players }: any) => {
  const cols = 12; const rows = 8;
  const getTilePosition = (index: number) => {
    if (index <= 11) return { r: 7, c: index };
    if (index <= 18) return { r: 7 - (index - 11), c: 11 };
    if (index <= 29) return { r: 0, c: 11 - (index - 19) };
    if (index <= 34) return { r: index - 29, c: 0 };
    if (index <= 43) return { r: 5, c: index - 34 };
    if (index <= 46) return { r: 5 - (index - 43), c: 9 };
    return { r: 3, c: 9 };
  };

  const boardGrid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = getTilePosition(i);
    boardGrid[pos.r][pos.c] = { index: i, special: SPECIAL_TILES[i], color: TILE_COLORS[i % TILE_COLORS.length] };
  }

  return (
    <div className="relative bg-white p-4 rounded-[2.5rem] shadow-2xl border-[10px] border-[#D97706] w-full max-w-5xl overflow-hidden">
      <div className="grid grid-cols-12 grid-rows-8 gap-1 relative z-10">
        {boardGrid.map((row, rIdx) => row.map((tile, cIdx) => {
          if (!tile) return <div key={`e-${rIdx}-${cIdx}`} className="aspect-square" />;
          const playersHere = players.filter((p: any) => p.position === tile.index);
          return (
            <div key={`t-${tile.index}`} style={{ backgroundColor: tile.color }} className="relative aspect-square border border-white/20 flex flex-col items-center justify-center shadow-sm rounded-xl">
              <span className={`absolute top-0.5 left-1 text-[8px] font-black opacity-40 ${tile.color === '#FBBF24' ? 'text-slate-800' : 'text-white'}`}>{tile.index + 1}</span>
              {tile.special ? <span className="text-sm md:text-2xl">{tile.special.icon}</span> : <span className={`text-xs md:text-xl font-bold ${tile.color === '#FBBF24' ? 'text-slate-800' : 'text-white'}`}>{tile.index + 1}</span>}
              <div className="absolute inset-0 flex items-center justify-center gap-0.5 flex-wrap content-center">
                {playersHere.map((p: any) => (
                  <div key={p.id} style={{ backgroundColor: p.color }} className="w-6 h-6 md:w-9 md:h-9 rounded-full border-2 border-white shadow-lg animate-pawn flex items-center justify-center text-xs md:text-lg z-50">
                    {p.icon}
                  </div>
                ))}
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
};

// --- APP PRINCIPALE ---

const App = () => {
  const [gs, setGs] = useState<any>({ 
    players: [], curIdx: 0, status: 'SETUP', lastRoll: null, 
    history: ['Benvenuti!'], curQ: null, questions: [], topic: '', age: '' 
  });
  const [rolling, setRolling] = useState(false);

  const addH = (msg: string) => setGs((prev: any) => ({ ...prev, history: [msg, ...prev.history].slice(0, 10) }));

  const start = async (topic: string, age: string, count: number) => {
    setGs((p: any) => ({ ...p, status: 'LOADING', topic, age }));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Genera 15 domande a scelta multipla su "${topic}" per ragazzi di "${age}". Ritorna un array JSON: [{text, options[], correctIndex}].`;
      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER }
              },
              required: ["text", "options", "correctIndex"]
            }
          }
        }
      });
      const qs = JSON.parse(res.text);
      const ps = Array.from({ length: count }, (_, i) => ({
        id: i, name: `G-${i+1}`, color: PLAYER_COLORS[i % 5], icon: PLAYER_ANIMALS[i % 5], position: 0, skip: 0
      }));
      setGs((p: any) => ({ ...p, players: ps, questions: qs, status: 'PLAYING' }));
    } catch (e) {
      console.error(e);
      alert("Errore nell'inizializzazione AI. Assicurati che l'API Key sia valida.");
      setGs((p: any) => ({ ...p, status: 'SETUP' }));
    }
  };

  const nextTurn = () => setGs((p: any) => ({ ...p, curIdx: (p.curIdx + 1) % p.players.length }));

  const movePlayer = (id: number, steps: number) => {
    setGs((p: any) => {
      const ps = [...p.players];
      let pos = ps[id].position + steps;
      if (pos >= BOARD_SIZE) pos = (BOARD_SIZE - 1) - (pos - (BOARD_SIZE - 1));
      if (pos < 0) pos = 0;
      ps[id].position = pos;
      return { ...p, players: ps };
    });
  };

  const checkTile = (id: number) => {
    setGs((p: any) => {
      const plr = p.players[id];
      const tile = SPECIAL_TILES[plr.position];
      if (tile) {
        if (tile.type === TileType.GOOSE) {
          const r = p.lastRoll || 1; addH(`${plr.icon} Oca! +${r}`);
          setTimeout(() => { movePlayer(id, r); setTimeout(() => checkTile(id), 600); }, 600);
        } else if (tile.type === TileType.BRIDGE) {
          addH(`${plr.icon} Bonus! +4`);
          setTimeout(() => { movePlayer(id, 4); setTimeout(() => checkTile(id), 600); }, 600);
        } else if (tile.type === TileType.INN) {
          addH(`${plr.icon} Salta un turno! 🚗`);
          setGs((s: any) => { const nps = [...s.players]; nps[id].skip = 1; return { ...s, players: nps }; });
          nextTurn();
        } else if (tile.type === TileType.WELL) {
          addH(`${plr.icon} Errore! Torna indietro 💡`);
          setTimeout(() => { movePlayer(id, -5); nextTurn(); }, 600);
        } else if (tile.type === TileType.LABYRINTH) {
          addH(`${plr.icon} Perso! Torna a 12`);
          setGs((s: any) => { const nps = [...s.players]; nps[id].position = 11; return { ...s, players: nps }; });
          nextTurn();
        } else if (tile.type === TileType.DEATH) {
          addH(`${plr.icon} Reset! Torna all'inizio 🍎`);
          setGs((s: any) => { const nps = [...s.players]; nps[id].position = 0; return { ...s, players: nps }; });
          nextTurn();
        } else if (tile.type === TileType.END) {
          setGs((s: any) => ({ ...s, status: 'FINISHED' }));
        }
      } else {
        const q = p.questions[Math.floor(Math.random() * p.questions.length)];
        setGs((s: any) => ({ ...s, curQ: q }));
      }
      return p;
    });
  };

  const rollDice = () => {
    const cp = gs.players[gs.curIdx];
    if (cp.skip > 0) {
      addH(`${cp.icon} Salta il turno`);
      setGs((p: any) => { const nps = [...p.players]; nps[p.curIdx].skip--; return { ...p, players: nps }; });
      nextTurn(); return;
    }
    setRolling(true);
    const r = Math.floor(Math.random() * 6) + 1;
    setGs((p: any) => ({ ...p, lastRoll: r }));
    setTimeout(() => {
      setRolling(false);
      addH(`${cp.icon} Dado: ${r}`);
      movePlayer(gs.curIdx, r);
      setTimeout(() => checkTile(gs.curIdx), 800);
    }, 1000);
  };

  const answer = (idx: number) => {
    const isCorrect = idx === gs.curQ.correctIndex;
    if (isCorrect) {
      addH(`Corretto! ✅`);
    } else {
      const r = gs.lastRoll || 0;
      addH(`Sbagliato! ❌ Torna indietro di ${r}`);
      movePlayer(gs.curIdx, -r);
    }
    setGs((p: any) => ({ ...p, curQ: null }));
    nextTurn();
  };

  if (gs.status === 'SETUP') return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 text-slate-800">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10">
        <div className="text-center mb-8">
          <span className="text-7xl">🪿</span>
          <h1 className="text-3xl font-black text-indigo-900 mt-4 font-fredoka uppercase tracking-tighter">Oca AI Didattica</h1>
        </div>
        <form onSubmit={(e: any) => { e.preventDefault(); start(e.target.topic.value, e.target.age.value, parseInt(e.target.count.value)); }} className="space-y-5">
          <div>
            <label className="text-xs font-black uppercase text-slate-400">Argomento</label>
            <input name="topic" defaultValue="Storia Romana" className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none" required />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-400">Età</label>
            <select name="age" className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white">
              {["6-7 anni", "8-10 anni", "11-13 anni", "14+ anni"].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-400">Giocatori</label>
            <select name="count" className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white">
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Giocatori</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black text-2xl shadow-xl hover:bg-emerald-600 transition-all">GIOCA</button>
        </form>
      </div>
    </div>
  );

  if (gs.status === 'LOADING') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-12">
      <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-indigo-600 mb-6" />
      <h2 className="text-2xl font-black text-indigo-900 font-fredoka animate-pulse uppercase">Generando domande con l'AI...</h2>
    </div>
  );

  if (gs.status === 'FINISHED') {
    const winner = gs.players.find((p: any) => p.position === BOARD_SIZE - 1);
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-8 text-center text-slate-800">
        <div className="text-9xl mb-6 animate-bounce">{winner?.icon}</div>
        <h1 className="text-6xl font-black font-fredoka text-emerald-600 mb-8 uppercase">{winner?.name} VINCE!</h1>
        <button onClick={() => window.location.reload()} className="px-12 py-5 bg-indigo-600 text-white rounded-full font-black text-2xl shadow-2xl">RIPROVA</button>
      </div>
    );
  }

  const cp = gs.players[gs.curIdx];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 gap-8 text-slate-800">
      <header className="w-full max-w-6xl bg-white p-6 rounded-[2rem] shadow-xl flex flex-col md:flex-row justify-between items-center border-b-4 border-indigo-100">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🪿</div>
          <div>
            <h1 className="text-2xl font-black font-fredoka text-indigo-900 uppercase">{gs.topic}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{gs.age}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {gs.players.map((p: any) => (
            <div key={p.id} className={`px-4 py-2 rounded-xl flex items-center gap-2 border-2 transition-all ${p.id === gs.curIdx ? 'bg-indigo-50 border-indigo-600' : 'opacity-40 border-transparent'}`}>
              <span className="text-xl">{p.icon}</span>
              <span className="text-[10px] font-black uppercase">{p.name}</span>
            </div>
          ))}
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col xl:flex-row gap-8 items-center xl:items-start">
        <Board players={gs.players} />
        <aside className="w-full xl:w-80 flex flex-col gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-3xl" style={{ backgroundColor: cp.color }}>{cp.icon}</div>
              <span className="text-xl font-black font-fredoka">{cp.name}</span>
            </div>
            <Dice value={gs.lastRoll} rolling={rolling} onRoll={rollDice} disabled={!!gs.curQ} />
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-lg flex-1 overflow-hidden">
            <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-2 mb-4">Cronologia</h3>
            <div className="text-[11px] space-y-2 overflow-y-auto max-h-48 custom-scrollbar pr-2">
              {gs.history.map((h: string, i: number) => <div key={i} className={`p-3 rounded-xl ${i === 0 ? 'bg-indigo-50 font-bold' : 'bg-slate-50 text-slate-500'}`}>{h}</div>)}
            </div>
          </div>
        </aside>
      </main>

      {gs.curQ && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white animate-in zoom-in duration-300">
            <div className="p-8 text-white text-center flex flex-col items-center" style={{ backgroundColor: cp.color }}>
              <div className="text-6xl mb-4">{cp.icon}</div>
              <h2 className="text-xl font-black uppercase font-fredoka tracking-widest">Sfida per {cp.name}</h2>
            </div>
            <div className="p-10">
              <p className="text-xl font-bold text-slate-800 mb-8 text-center">{gs.curQ.text}</p>
              <div className="grid gap-3">
                {gs.curQ.options.map((opt: string, idx: number) => (
                  <button key={idx} onClick={() => answer(idx)} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 text-left font-bold text-lg transition-all active:scale-95">
                    {String.fromCharCode(65 + idx)}) {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);