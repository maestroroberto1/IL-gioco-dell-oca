
import { TileType } from './types';

export const BOARD_SIZE = 48;

export const PLAYER_COLORS = [
  '#1E3A8A', // Blu Notte
  '#FBBF24', // Giallo
  '#F97316', // Arancio
  '#15803D', // Verde
  '#7E22CE', // Viola
];

export const PLAYER_ANIMALS = ['🐶', '🐱', '🐰', '🦊', '🐸'];

// Mappatura colori caselle (ciclo basato sull'immagine)
export const TILE_COLORS = [
  '#1E3A8A', '#F97316', '#FBBF24', '#7E22CE', '#15803D', '#7E22CE', '#FBBF24', '#1E3A8A', '#15803D', '#1E3A8A', '#7E22CE', '#FBBF24'
];

export const SPECIAL_TILES: Record<number, { type: TileType; label: string; icon: string; desc: string }> = {
  0: { type: TileType.START, label: "Partenza", icon: "🚀", desc: "Inizia il viaggio!" },
  5: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  6: { type: TileType.BRIDGE, label: "Rubinetto", icon: "🚰", desc: "Risparmia acqua! Salta avanti." },
  8: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  13: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  17: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  18: { type: TileType.INN, label: "Auto", icon: "🚗", desc: "Traffico in città... Ferma un turno!" },
  22: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  26: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  30: { type: TileType.WELL, label: "Energia", icon: "💡", desc: "Spreco di luce! Torna indietro." },
  31: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  35: { type: TileType.LABYRINTH, label: "Corvo", icon: "🐦‍⬛", desc: "Ti sei perso! Torna alla casella 12." },
  40: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  41: { type: TileType.DEATH, label: "Rifiuti", icon: "🍎", desc: "Raccolta errata! Ricomincia." },
  44: { type: TileType.GOOSE, label: "Oca", icon: "🪿", desc: "Vola avanti!" },
  47: { type: TileType.END, label: "Arrivo", icon: "🏁", desc: "Hai vinto!" },
};

export const GOOSE_INDICES = [5, 8, 13, 17, 22, 26, 31, 40, 44];
