
import React, { useState } from 'react';
import { GameStatus } from '../types';

interface Props {
  startCpuGame: (level1: number, level2: number) => void;
  gameStatus: GameStatus;
}

export const CpuPanel: React.FC<Props> = ({ startCpuGame, gameStatus }) => {
  const [cpu1Level, setCpu1Level] = useState(9);
  const [cpu2Level, setCpu2Level] = useState(9);

  const isLocked = gameStatus === GameStatus.PLAYING;

  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-3 md:gap-6">
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-gray-400 uppercase">AI 1 (Black)</label>
        <select 
            disabled={isLocked}
            value={cpu1Level} 
            onChange={(e) => setCpu1Level(Number(e.target.value))}
            className="bg-slate-800 text-white border border-slate-600 rounded px-2 py-1.5 text-sm md:text-base focus:outline-none focus:border-blue-500"
        >
             {Array.from({ length: 10 }).map((_, i) => (
                <option key={i} value={i+1}>Lv.{i+1}</option>
             ))}
        </select>
      </div>

      <div className="text-gray-600 font-bold text-sm md:text-base">VS</div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-gray-400 uppercase">AI 2 (White)</label>
        <select 
            disabled={isLocked}
            value={cpu2Level} 
            onChange={(e) => setCpu2Level(Number(e.target.value))}
            className="bg-slate-800 text-white border border-slate-600 rounded px-2 py-1.5 text-sm md:text-base focus:outline-none focus:border-blue-500"
        >
             {Array.from({ length: 10 }).map((_, i) => (
                <option key={i} value={i+1}>Lv.{i+1}</option>
             ))}
        </select>
      </div>
      
      <button
        onClick={() => startCpuGame(cpu1Level, cpu2Level)}
        disabled={isLocked}
        className="ml-2 px-6 bg-accent-blue hover:bg-blue-600 text-white text-sm md:text-base font-bold py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md whitespace-nowrap"
      >
        Start Battle
      </button>
    </div>
  );
};
