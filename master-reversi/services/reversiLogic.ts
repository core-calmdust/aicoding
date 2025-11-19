import { BoardState, Player, Move } from '../types';

export const BOARD_SIZE = 8;

// Directions: [row, col] offsets
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

export const initializeBoard = (): BoardState => {
  const board = Array(64).fill(null);
  board[27] = 'white';
  board[28] = 'black';
  board[35] = 'black';
  board[36] = 'white';
  return board;
};

export const isValidMove = (board: BoardState, index: number, player: Player): boolean => {
  if (board[index] !== null || !player) return false;

  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const opponent = player === 'black' ? 'white' : 'black';

  for (const [dRow, dCol] of DIRECTIONS) {
    let r = row + dRow;
    let c = col + dCol;
    let hasOpponent = false;

    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      const currentIdx = r * BOARD_SIZE + c;
      const cell = board[currentIdx];

      if (cell === opponent) {
        hasOpponent = true;
      } else if (cell === player) {
        if (hasOpponent) return true; // Found a valid sandwich
        break;
      } else {
        break; // Empty cell
      }
      r += dRow;
      c += dCol;
    }
  }
  return false;
};

export const getValidMoves = (board: BoardState, player: Player): number[] => {
  const moves: number[] = [];
  if (!player) return moves;
  for (let i = 0; i < 64; i++) {
    if (isValidMove(board, i, player)) {
      moves.push(i);
    }
  }
  return moves;
};

export const makeMove = (board: BoardState, index: number, player: Player): BoardState => {
  if (!player) return [...board];
  
  const newBoard = [...board];
  newBoard[index] = player;
  
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const opponent = player === 'black' ? 'white' : 'black';

  for (const [dRow, dCol] of DIRECTIONS) {
    let r = row + dRow;
    let c = col + dCol;
    const flippable: number[] = [];

    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      const currentIdx = r * BOARD_SIZE + c;
      const cell = newBoard[currentIdx];

      if (cell === opponent) {
        flippable.push(currentIdx);
      } else if (cell === player) {
        if (flippable.length > 0) {
          // Flip captured stones
          for (const flipIdx of flippable) {
            newBoard[flipIdx] = player;
          }
        }
        break;
      } else {
        break;
      }
      r += dRow;
      c += dCol;
    }
  }
  return newBoard;
};

export const countDiscs = (board: BoardState) => {
  let black = 0;
  let white = 0;
  for (const cell of board) {
    if (cell === 'black') black++;
    if (cell === 'white') white++;
  }
  return { black, white };
};

export const isGameEnd = (board: BoardState): boolean => {
    // Game ends if neither player can move, or board is full
    // Since we usually switch turns only if move is possible, if we are checking game end generically:
    // It's end if black has no moves AND white has no moves.
    const blackMoves = getValidMoves(board, 'black');
    const whiteMoves = getValidMoves(board, 'white');
    return blackMoves.length === 0 && whiteMoves.length === 0;
};
