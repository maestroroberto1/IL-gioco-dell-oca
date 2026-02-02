
export enum TileType {
  START = 'START',
  END = 'END',
  QUESTION = 'QUESTION',
  GOOSE = 'GOOSE', // Double the roll
  BRIDGE = 'BRIDGE', // Jump forward
  INN = 'INN', // Skip turn
  WELL = 'WELL', // Wait for rescue or skip 2 turns
  LABYRINTH = 'LABYRINTH', // Go back
  DEATH = 'DEATH', // Reset to start
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Tile {
  index: number;
  type: TileType;
  label: string;
  description?: string;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  icon: string; // The animal emoji representing the player
  position: number;
  skipTurns: number;
  isStuckInWell: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  tiles: Tile[];
  questions: Question[];
  status: 'SETUP' | 'LOADING' | 'PLAYING' | 'FINISHED';
  lastRoll: number | null;
  history: string[];
  currentQuestion: Question | null;
  topic: string;
  ageGroup: string;
}
