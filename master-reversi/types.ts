export type Player = 'black' | 'white' | null;

export type BoardState = Player[];

export interface Move {
  index: number;
  score?: number; // For AI or Research mode
}

export interface HistoryState {
  board: BoardState;
  turn: Player;
  blackCount: number;
  whiteCount: number;
  evaluation: number; // Positive favors black, negative favors white
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

export enum AIMode {
  PvCPU = 'PvCPU',
  CPUvCPU = 'CPUvCPU',
}
