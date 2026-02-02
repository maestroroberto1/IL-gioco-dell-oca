import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

// --- TIPI E INTERFACCE ---
export enum TileType {
  START = 'START', END = 'END', QUESTION = 'QUESTION',
  GOOSE = 'GOOSE', BRIDGE = 'BRIDGE', INN = 'INN',
  WELL = 'WELL', LABYRINTH = 'LABYRINTH', DEATH = 'DEATH'
}

interface Question {
  text: string;
  options: string[];
  correctIndex: number;
}

interface Player {
  id: number;
  name: string;
  color: string;
  icon: string;
  position: number;
  skipTurns: number;
}

// --- COSTANTI ---
const BOARD_SIZE = 48;
const PLAYER_COLORS = ['#1E3A8A', '#FBBF24', '#F97316', '#15803D', '#7E22CE'];
const PLAYER_ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐸'];
const TILE_COLORS = ['#1E3A8A', '#F97316', '#FBBF24', '#7E22CE', '#15803D'];

const SPECIAL_TILES: Record<number, { type: TileType; label: string; icon: string; desc: string }> = {
  0: { type: TileType.START, label: "Partenza", icon: "🚀", desc: "Inizia il viaggio!" },
  5: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  6: { type: TileType.BRIDGE, label: "Rubinetto", icon: "🚰", desc: "Risparmia acqua! Salta avanti." },
  9: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  14: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  18: { type: TileType.INN, label: "Auto", icon: "🚗", desc: "Traffico in città... Salta un turno." },
  23: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  30: { type: TileType.WELL, label: "Pozzo", icon: "💡", desc: "Spreco di luce! Torna indietro di 5." },
  35: { type: TileType.LABYRINTH, label: "Labirinto", icon: "🐦‍⬛", desc: "Ti sei perso! Torna alla casella 12." },
  41: { type: TileType.DEATH, label: "Rifiuti", icon: "🍎", desc: "Non hai riciclato! Ricomincia." },
  47: { type: TileType.END, label: "Arrivo", icon: "🏁", desc: "Hai vinto!" },
};

// --- SERVIZI AI ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fetchQuestions = async (topic: string, age: string): Promise<Question[]> => {
  const prompt = `Genera 15 domande a scelta multipla su "${topic}" per ragazzi di "${age}". 
  Formato JSON: array di oggetti {text, options[], correctIndex}.`;
  
  const response = await ai.models.generateContent({
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
  return JSON.parse(response.text);
};

// --- COMPONENTI UI ---

const Dice = ({ value, rolling, onRoll, disabled }: any) => {
  const dots: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  };
  const currentDots = value ? dots[value as keyof typeof dots] : [];
  return (
    <button onClick={onRoll} disabled={rolling || disabled} className={`w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-5 transition-all ${rolling ? 'animate-bounce' : 'hover:scale-105 active:scale-95'} ${disabled ? 'opacity-50' : ''} border-b-8 border-slate-200`}>
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {currentDots.includes(i) && <div className="w-4 h-4 bg-slate-800 rounded-full" />}
          </div>
        ))}
      </div>
    </button>
  );
};

const Board = ({ players }: { players: Player[] }) => {
  const cols = 12;
  const getTilePosition = (index: number) => {
    if (index <= 11) return { r: 7, c: index };
    if (index <= 18) return { r: 7 - (index - 11), c: 11 };
    if (index <= 29) return { r: 0, c: 11 - (index - 19) };
    if (index <= 34) return { r: index - 29, c: 0 };
    if (index <= 43) return { r: 5, c: index - 34 };
    if (index <= 46) return { r: 5 - (index - 43), c: 9 };
    return { r: 3, c: 8 };
  };

  const tiles = Array.from({ length: 8 }, () => Array(12).fill(null));
  for (let i = 0; i < BOARD_SIZE; i++) {
    const { r, c } = getTilePosition(i);
    tiles[r][c] = { index: i, special: SPECIAL_TILES[i], color: TILE_COLORS[i % TILE_COLORS.length] };
  }

  return (
    <div className="bg-white p-4 rounded-[2rem] shadow-2xl border-[10px] border-amber-600 w-full max-w-5xl">
      <div className="grid grid-cols-12 grid-rows-8 gap-1">
        {tiles.map((row, rIdx) => row.map((tile, cIdx) => {
          if (!tile) return <div key={`e-${rIdx}-${cIdx}`} className="aspect-square" />;
          const pHere = players.filter(p => p.position === tile.index);
          return (
            <div key={`t-${tile.index}`} style={{ backgroundColor: tile.color }} className="relative aspect-square flex flex-col items-center justify-center rounded-lg border border-white/20">
              <span className={`absolute top-0.5 left-1 text-[8px] font-bold opacity-30 ${tile.color === '#FBBF24' ? 'text-black' : 'text-white'}`}>{tile.index + 1}</span>
              {tile.special ? <span className="text-sm md:text-2xl">{tile.special.icon}</span> : <span className={`text-[10px] md:text-lg font-bold ${tile.color === '#FBBF24' ? 'text-black' : 'text-white'}`}>{tile.index + 1}</span>}
              <div className="absolute inset-0 flex items-center justify-center gap-0.5 flex-wrap">
                {pHere.map(p => <div key={p.id} style={{ backgroundColor: p.color }} className="w-6 h-6 rounded-full border-2 border-white shadow-lg animate-pawn flex items-center justify-center text-xs">{p.icon}</div>)}
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
};

// --- APP ---
const App = () => {
  const [gs, setGs] = useState<any>({ players: [], curIdx: 0, status: 'SETUP', history: [], curQ: null, questions: [], topic: '', age: '' });
  const [rolling, setRolling] = useState(false);

  const log = (msg: string) => setGs((p: any) => ({ ...p, history: [msg, ...p.history].slice(0, 10) }));

  const start = async (topic: string, age: string, count: number) => {
    setGs((p: any) => ({ ...p, status: 'LOADING', topic, age }));
    try {
      const qs = await fetchQuestions(topic, age);
      const ps = Array.from({ length: count }, (_, i) => ({ id: i, name: `Giocatore ${i+1}`, color: PLAYER_COLORS[i % 5], icon: PLAYER_ANIMALS[i % 5], position: 0, skipTurns: 0 }));
      setGs((p: any) => ({ ...p, players: ps, questions: qs, status: 'PLAYING', history: ["Partenza!"] }));
    } catch (e) {
      alert("Errore AI. Controlla la chiave API o la connessione.");
      setGs((p: any) => ({ ...p, status: 'SETUP' }));
    }
  };

  const move = (id: number, steps: number) => {
    setGs((p: any) => {
      const nps = [...p.players];
      let pos = nps[id].position + steps;
      if (pos >= BOARD_SIZE) pos = (BOARD_SIZE - 1) - (pos - (BOARD_SIZE - 1));
      if (pos < 0) pos = 0;
      nps[id].position = pos;
      return { ...p, players: nps };
    });
  };

  const handleTile = (id: number) => {
    setGs((p: any) => {
      const plr = p.players[id];
      const special = SPECIAL_TILES[plr.position];
      if (special) {
        if (special.type === TileType.GOOSE) {
          log(`${plr.icon} Oca! Salta ancora.`);
          setTimeout(() => { move(id, p.lastRoll || 1); setTimeout(() => handleTile(id), 600); }, 600);
        } else if (special.type === TileType.INN) {
          log(`${plr.icon} Traffico! Salta un turno.`);
          const nps = [...p.players]; nps[id].skipTurns = 1;
          setGs((s: any) => ({ ...s, players: nps, curIdx: (s.curIdx + 1) % s.players.length }));
        } else if (special.type === TileType.WELL) {
          log(`${plr.icon} Spreco! Indietro di 5.`);
          setTimeout(() => { move(id, -5); setGs((s: any) => ({ ...s, curIdx: (s.curIdx + 1) % s.players.length })); }, 600);
        } else if (special.type === TileType.LABYRINTH) {
          log(`${plr.icon} Perso! Torna alla casella 12.`);
          const nps = [...p.players]; nps[id].position = 11;
          setGs((s: any) => ({ ...s, players: nps, curIdx: (s.curIdx + 1) % s.players.length }));
        } else if (special.type === TileType.DEATH) {
          log(`${plr.icon} Reset! Torna all'inizio.`);
          const nps = [...p.players]; nps[id].position = 0;
          setGs((s: any) => ({ ...s, players: nps, curIdx: (s.curIdx + 1) % s.players.length }));
        } else if (special.type === TileType.END) {
          setGs((s: any) => ({ ...s, status: 'FINISHED' }));
        } else {
          setGs((s: any) => ({ ...s, curIdx: (s.curIdx + 1) % s.players.length }));
        }
      } else {
        const q = p.questions[Math.floor(Math.random() * p.questions.length)];
        setGs((s: any) => ({ ...s, curQ: q }));
      }
      return p;
    });
  };

  const roll = () => {
    const cp = gs.players[gs.curIdx];
    if (cp.skipTurns > 0) {
      log(`${cp.icon} Salta turno.`);
      setGs((p: any) => { const nps = [...p.players]; nps[p.curIdx].skipTurns--; return { ...p, players: nps, curIdx: (p.curIdx + 1) % p.players.length }; });
      return;
    }
    setRolling(true);
    const r = Math.floor(Math.random() * 6) + 1;
    setGs((p: any) => ({ ...p, lastRoll: r }));
    setTimeout(() => {
      setRolling(false);
      log(`${cp.icon} Dado: ${r}`);
      move(gs.curIdx, r);
      setTimeout(() => handleTile(gs.curIdx), 800);
    }, 1000);
  };

  const answer = (idx: number) => {
    const ok = idx === gs.curQ.correctIndex;
    log(ok ? "Giusto! ✅" : `Sbagliato! ❌ Indietro di ${gs.lastRoll}`);
    if (!ok) move(gs.curIdx, -(gs.lastRoll || 0));
    setGs((p: any) => ({ ...p, curQ: null, curIdx: (p.curIdx + 1) % p.players.length }));
  };

  if (gs.status === 'SETUP') return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-slate-800">
        <h1 className="text-3xl font-black font-fredoka text-indigo-900 text-center mb-8 uppercase">Gioco dell'Oca AI</h1>
        <form onSubmit={(e: any) => { e.preventDefault(); start(e.target.topic.value, e.target.age.value, parseInt(e.target.count.value)); }} className="space-y-6">
          <input name="topic" defaultValue="Storia Romana" className="w-full p-4 border-2 border-slate-100 rounded-2xl" placeholder="Argomento..." required />
          <select name="age" className="w-full p-4 border-2 border-slate-100 rounded-2xl">
            {["6-7 anni", "8-10 anni", "11-13 anni", "14+ anni"].map(a => <option key={a}>{a}</option>)}
          </select>
          <select name="count" className="w-full p-4 border-2 border-slate-100 rounded-2xl">
            {[2, 3, 4].map(n => <option key={n} value={n}>{n} Giocatori</option>)}
          </select>
          <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black text-2xl shadow-xl hover:bg-emerald-600">INIZIA SFIDA</button>
        </form>
      </div>
    </div>
  );

  if (gs.status === 'LOADING') return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
      <h2 className="text-2xl font-black text-indigo-900 font-fredoka uppercase">Generando domande...</h2>
    </div>
  );

  if (gs.status === 'FINISHED') return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-black text-emerald-600 mb-8 uppercase">VITTORIA!</h1>
      <button onClick={() => window.location.reload()} className="px-12 py-5 bg-indigo-600 text-white rounded-full font-black text-2xl shadow-2xl">RIPROVA</button>
    </div>
  );

  const cp = gs.players[gs.curIdx];

  return (
    <div className="min-h-screen p-4 flex flex-col items-center gap-6">
      <header className="w-full max-w-6xl bg-white p-6 rounded-[2rem] shadow-xl flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🪿</div>
          <div><h1 className="text-2xl font-black text-indigo-900 font-fredoka uppercase leading-none">{gs.topic}</h1><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{gs.age}</p></div>
        </div>
        <div className="flex gap-2">
          {gs.players.map((p: any) => (
            <div key={p.id} className={`px-4 py-2 rounded-xl flex items-center gap-2 border-2 ${p.id === gs.curIdx ? 'bg-indigo-50 border-indigo-500' : 'opacity-40 border-transparent'}`}>
              <span className="text-xl">{p.icon}</span>
              <span className="text-[10px] font-black uppercase">{p.name}</span>
            </div>
          ))}
        </div>
      </header>
      <main className="w-full max-w-6xl flex flex-col xl:flex-row gap-8 items-start">
        <Board players={gs.players} />
        <aside className="w-full xl:w-80 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-3xl shadow-lg" style={{ backgroundColor: cp.color }}>{cp.icon}</div>
              <span className="text-xl font-black font-fredoka">{cp.name}</span>
            </div>
            <Dice value={gs.lastRoll} rolling={rolling} onRoll={roll} disabled={!!gs.curQ} />
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-lg flex-1 overflow-hidden">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest border-b pb-2">Cronologia</h3>
            <div className="space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
              {gs.history.map((h: any, i: number) => <div key={i} className={`p-3 rounded-xl text-xs ${i === 0 ? 'bg-indigo-50 font-bold' : 'bg-slate-50 text-slate-500'}`}>{h}</div>)}
            </div>
          </div>
        </aside>
      </main>
      {gs.curQ && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
            <div className="p-8 text-white text-center flex flex-col items-center" style={{ backgroundColor: cp.color }}>
              <div className="text-6xl mb-4">{cp.icon}</div>
              <h2 className="text-xl font-black uppercase font-fredoka">Sfida per {cp.name}</h2>
            </div>
            <div className="p-10">
              <p className="text-2xl font-bold text-slate-800 mb-8 text-center">{gs.curQ.text}</p>
              <div className="grid gap-3">
                {gs.curQ.options.map((opt: string, idx: number) => (
                  <button key={idx} onClick={() => answer(idx)} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 text-left font-bold text-lg">
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