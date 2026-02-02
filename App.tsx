
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Tile, TileType, Question } from './types';
import { generateEducationalQuestions } from './services/geminiService';
import { BOARD_SIZE, PLAYER_COLORS, PLAYER_ANIMALS, SPECIAL_TILES } from './constants';
import Board from './components/Board';
import Dice from './components/Dice';
import QuestionModal from './components/QuestionModal';
import SetupScreen from './components/SetupScreen';
import HistoryLog from './components/HistoryLog';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    tiles: [],
    questions: [],
    status: 'SETUP',
    lastRoll: null,
    history: ['Benvenuti al Gioco dell\'Oca Ecologico!'],
    currentQuestion: null,
    topic: '',
    ageGroup: '',
  });

  const [isRolling, setIsRolling] = useState(false);

  const initializeGame = async (topic: string, ageGroup: string, playerCount: number) => {
    setGameState(prev => ({ ...prev, status: 'LOADING', topic, ageGroup }));
    
    try {
      const generatedQuestions = await generateEducationalQuestions(topic, ageGroup);
      
      const tiles: Tile[] = Array.from({ length: BOARD_SIZE }, (_, i) => {
        if (SPECIAL_TILES[i]) {
          return { index: i, type: SPECIAL_TILES[i].type, label: SPECIAL_TILES[i].label, description: SPECIAL_TILES[i].desc };
        }
        return { index: i, type: TileType.QUESTION, label: (i + 1).toString(), description: "Domanda didattica!" };
      });

      const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
        id: i,
        name: `Giocatore ${i + 1}`,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        icon: PLAYER_ANIMALS[i % PLAYER_ANIMALS.length],
        position: 0,
        skipTurns: 0,
        isStuckInWell: false,
      }));

      setGameState(prev => ({
        ...prev,
        players,
        tiles,
        questions: generatedQuestions,
        status: 'PLAYING',
      }));
    } catch (error) {
      console.error("Failed to start game", error);
      alert("Errore AI. Riprova.");
      setGameState(prev => ({ ...prev, status: 'SETUP' }));
    }
  };

  const addHistory = (text: string) => {
    setGameState(prev => ({
      ...prev,
      history: [text, ...prev.history].slice(0, 15)
    }));
  };

  const nextTurn = useCallback(() => {
    setGameState(prev => {
      let nextIdx = (prev.currentPlayerIndex + 1) % prev.players.length;
      return { ...prev, currentPlayerIndex: nextIdx };
    });
  }, []);

  const movePlayer = (playerId: number, steps: number) => {
    setGameState(prev => {
      const newPlayers = [...prev.players];
      const player = { ...newPlayers[playerId] };
      let newPos = player.position + steps;

      if (newPos >= BOARD_SIZE) {
        const overflow = newPos - (BOARD_SIZE - 1);
        newPos = (BOARD_SIZE - 1) - overflow;
        addHistory(`${player.icon} ${player.name} rimbalza alla casella ${newPos + 1}`);
      }
      if (newPos < 0) newPos = 0;

      player.position = newPos;
      newPlayers[playerId] = player;
      return { ...prev, players: newPlayers };
    });
  };

  const checkTileEffect = (playerId: number) => {
    setGameState(prev => {
      const player = prev.players[playerId];
      const tile = prev.tiles[player.position];
      
      switch (tile.type) {
        case TileType.GOOSE:
          const roll = prev.lastRoll || 1;
          addHistory(`${player.icon} ${player.name} è sull'Oca! Salta ancora di ${roll}.`);
          setTimeout(() => {
            movePlayer(player.id, roll);
            setTimeout(() => checkTileEffect(player.id), 600);
          }, 600);
          break;
        case TileType.BRIDGE:
          addHistory(`${player.icon} ${player.name} usa il rubinetto! Risparmio idrico: +4.`);
          setTimeout(() => {
            movePlayer(player.id, 4);
            setTimeout(() => checkTileEffect(player.id), 600);
          }, 600);
          break;
        case TileType.INN:
          addHistory(`${player.icon} ${player.name} è bloccato nel traffico (Casella Auto). Salta un turno.`);
          setGameState(s => {
            const players = [...s.players];
            players[player.id].skipTurns = 1;
            return { ...s, players };
          });
          nextTurn();
          break;
        case TileType.WELL:
          addHistory(`${player.icon} ${player.name} ha sprecato troppa luce! Torna indietro di 5.`);
          setTimeout(() => {
            movePlayer(player.id, -5);
            nextTurn();
          }, 600);
          break;
        case TileType.LABYRINTH:
          addHistory(`${player.icon} ${player.name} si è perso. Torna alla casella 12.`);
          setGameState(s => {
            const players = [...s.players];
            players[player.id].position = 11;
            return { ...s, players };
          });
          nextTurn();
          break;
        case TileType.DEATH:
          addHistory(`${player.icon} ${player.name} non ha riciclato bene! Torna all'inizio.`);
          setGameState(s => {
            const players = [...s.players];
            players[player.id].position = 0;
            return { ...s, players };
          });
          nextTurn();
          break;
        case TileType.QUESTION:
          const randomQ = prev.questions[Math.floor(Math.random() * prev.questions.length)];
          setGameState(s => ({ ...s, currentQuestion: randomQ }));
          break;
        case TileType.END:
          setGameState(s => ({ ...s, status: 'FINISHED' }));
          break;
        default:
          nextTurn();
          break;
      }
      return prev;
    });
  };

  const handleRoll = () => {
    if (isRolling || gameState.currentQuestion) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.skipTurns > 0) {
      addHistory(`${currentPlayer.icon} ${currentPlayer.name} salta il turno.`);
      setGameState(prev => {
        const players = [...prev.players];
        players[prev.currentPlayerIndex].skipTurns--;
        return { ...prev, players };
      });
      nextTurn();
      return;
    }

    setIsRolling(true);
    const roll = Math.floor(Math.random() * 6) + 1;
    setGameState(prev => ({ ...prev, lastRoll: roll }));

    setTimeout(() => {
      setIsRolling(false);
      addHistory(`${currentPlayer.icon} ${currentPlayer.name} lancia: ${roll}`);
      movePlayer(gameState.currentPlayerIndex, roll);
      setTimeout(() => checkTileEffect(gameState.currentPlayerIndex), 800);
    }, 1000);
  };

  const handleQuestionAnswer = (correct: boolean) => {
    const player = gameState.players[gameState.currentPlayerIndex];
    if (correct) {
      addHistory(`Risposta corretta per ${player.icon} ${player.name}! Resta in questa casella.`);
    } else {
      // Se sbaglia, torna alla casella di partenza del turno annullando il lancio del dado
      const roll = gameState.lastRoll || 0;
      addHistory(`Errore! ${player.icon} ${player.name} torna alla casella di partenza.`);
      movePlayer(player.id, -roll);
    }
    setGameState(prev => ({ ...prev, currentQuestion: null }));
    nextTurn();
  };

  if (gameState.status === 'SETUP') return <SetupScreen onStart={initializeGame} />;
  if (gameState.status === 'LOADING') return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-12">
        <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
        <h1 className="text-2xl font-black font-fredoka text-slate-800">Generazione Mondo Eco...</h1>
    </div>
  );

  if (gameState.status === 'FINISHED') {
    const winner = gameState.players.find(p => p.position === BOARD_SIZE - 1);
    return (
      <div className="min-h-screen bg-[#FFF9F0] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-9xl mb-4">{winner?.icon || '🌻'}</div>
        <h1 className="text-6xl font-black text-emerald-600 font-fredoka mb-2">VITTORIA ECO!</h1>
        <p className="text-2xl font-bold text-slate-700 mb-8">{winner?.icon} {winner?.name} ha salvato l'ambiente!</p>
        <button onClick={() => window.location.reload()} className="px-10 py-5 bg-indigo-600 text-white rounded-full font-black text-xl shadow-2xl hover:bg-indigo-700 transition">GIOCA ANCORA</button>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-4 lg:p-8 flex flex-col items-center gap-6">
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border-b-4 border-indigo-100">
        <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl text-3xl">🪿</div>
            <div>
                <h1 className="text-3xl font-black text-indigo-900 font-fredoka leading-tight uppercase">GIOCO DELL'OCA ECOLOGICO</h1>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{gameState.topic} | {gameState.ageGroup}</p>
            </div>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          {gameState.players.map(p => (
            <div key={p.id} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${p.id === gameState.currentPlayerIndex ? 'bg-indigo-50 border-indigo-400 scale-105' : 'bg-transparent border-transparent opacity-50'}`}>
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xl" style={{ backgroundColor: p.color }}>
                {p.icon}
              </div>
              <span className="text-[10px] font-black mt-1 uppercase">{p.name}</span>
            </div>
          ))}
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col xl:flex-row gap-8 items-start">
        <div className="flex-1 w-full flex justify-center">
          <Board tiles={gameState.tiles} players={gameState.players} />
        </div>

        <aside className="w-full xl:w-80 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-b-8 border-indigo-100 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg" style={{ backgroundColor: currentPlayer.color }}>
                  {currentPlayer.icon}
                </div>
                <h2 className="text-xl font-black text-slate-800 font-fredoka uppercase">{currentPlayer.name}</h2>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl p-8 mb-4 border-2 border-dashed border-slate-200">
                <Dice value={gameState.lastRoll} rolling={isRolling} onRoll={handleRoll} disabled={!!gameState.currentQuestion} />
                <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-tighter">
                    {isRolling ? "Lancio in corso..." : "Tocca il dado per muovere!"}
                </p>
            </div>
          </div>

          <HistoryLog history={gameState.history} />
        </aside>
      </main>

      {gameState.currentQuestion && (
        <QuestionModal 
            question={gameState.currentQuestion} 
            onAnswer={handleQuestionAnswer} 
            player={currentPlayer}
        />
      )}
    </div>
  );
};

export default App;
