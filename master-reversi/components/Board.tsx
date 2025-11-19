
import React from 'react';
import { BoardState, Move, Player } from '../types';

interface BoardProps {
  board: BoardState;
  validMoves: number[];
  onSquareClick: (index: number) => void;
  lastMoveIndex: number | null;
  isResearchMode: boolean;
  researchData: Move[];
  turn: Player;
}

export const Board: React.FC<BoardProps> = ({
  board,
  validMoves,
  onSquareClick,
  lastMoveIndex,
  isResearchMode,
  researchData,
}) => {
  
  const renderSquare = (i: number) => {
    const hasStone = board[i] !== null;
    const isBlack = board[i] === 'black';
    const isValid = validMoves.includes(i);
    const isLastMove = lastMoveIndex === i;

    // Research info
    const researchMove = isResearchMode ? researchData.find(m => m.index === i) : null;
    
    return (
      <div
        key={i}
        onClick={() => isValid ? onSquareClick(i) : null}
        className={`
          relative w-full h-full border border-[#006666] flex items-center justify-center
          ${isValid && !isResearchMode ? 'cursor-pointer hover:bg-[#009999] transition-colors' : ''}
          ${isValid && isResearchMode ? 'cursor-pointer' : ''}
        `}
      >
        {/* Valid Move Hint (Dot) */}
        {isValid && !hasStone && !isResearchMode && (
          <div className="w-[25%] h-[25%] rounded-full bg-black opacity-20" />
        )}

        {/* Research Data Overlay */}
        {isResearchMode && researchMove && (
          <div className={`absolute inset-0 flex items-center justify-center text-xs sm:text-sm md:text-base font-bold z-10 ${researchMove.score! >= 0 ? 'text-blue-100 bg-blue-900/40' : 'text-red-100 bg-red-900/40'}`}>
            {researchMove.score! > 0 ? '+' : ''}{Math.round(researchMove.score!)}
          </div>
        )}

        {/* Stone - Matte Design */}
        {hasStone && (
          <div
            className={`
              w-[85%] h-[85%] rounded-full transform transition-all duration-300 ease-out
              shadow-[0_2px_4px_rgba(0,0,0,0.4)]
              ${isBlack 
                ? 'bg-slate-900' 
                : 'bg-slate-100'
              }
              ${isLastMove ? 'ring-2 ring-red-500' : ''}
            `}
          >
             {/* Subtle 3D edge for matte look without gloss */}
             <div className={`w-full h-full rounded-full border-[3px] opacity-10 ${isBlack ? 'border-white' : 'border-slate-400'}`}></div>
          </div>
        )}
      </div>
    );
  };

  // Using max-h-full/max-w-full with aspect-square ensures it fits perfectly in the parent flex container
  return (
    <div className="aspect-square w-full max-w-full max-h-full bg-board-green p-1 rounded shadow-2xl border-4 border-[#1e293b]">
      <div className="w-full h-full grid grid-cols-8 grid-rows-8 bg-board-green gap-[1px] border-2 border-black">
        {Array.from({ length: 64 }).map((_, i) => renderSquare(i))}
      </div>
    </div>
  );
};
