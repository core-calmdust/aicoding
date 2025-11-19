
import React from 'react';
import { Player, GameStatus } from '../types';
import { EvaluationGraph } from './EvaluationGraph';

// Icons
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const DoubleChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>;
const DoubleChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>;

interface SidebarProps {
  opponentLevel: number;
  setOpponentLevel: (l: number) => void;
  playerColor: Player;
  setPlayerColor: (p: Player) => void;
  gameStatus: GameStatus;
  onPlayPause: () => void;
  turnCount: number;
  blackCount: number;
  whiteCount: number;
  onUndo: () => void;
  toggleResearch: () => void;
  isResearchMode: boolean;
  graphData: any[];
  currentHistoryIndex: number;
  playback: (action: 'first' | 'prev' | 'next' | 'last') => void;
  evalValue: number | 'N/A';
  onPlaybackClick: (index: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  opponentLevel,
  setOpponentLevel,
  playerColor,
  setPlayerColor,
  gameStatus,
  onPlayPause,
  turnCount,
  blackCount,
  whiteCount,
  onUndo,
  toggleResearch,
  isResearchMode,
  graphData,
  currentHistoryIndex,
  playback,
  evalValue,
  onPlaybackClick
}) => {

  const isPlaying = gameStatus === GameStatus.PLAYING;
  const isPaused = gameStatus === GameStatus.PAUSED;
  const isEnded = gameStatus === GameStatus.ENDED;

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      {/* Top Panel: Settings */}
      <div className="bg-panel-bg rounded-lg p-3 shadow-md border border-slate-700 flex-shrink-0">
        <label className="block text-xs font-bold text-gray-300 mb-1">
          Opponent:
        </label>
        <select 
          disabled={isPlaying || isPaused}
          value={opponentLevel}
          onChange={(e) => setOpponentLevel(Number(e.target.value))}
          className="w-full bg-slate-800 text-white border border-slate-600 rounded p-1.5 mb-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              Level {i + 1} {i === 9 ? '(Max)' : i === 4 ? '(Normal)' : ''}
            </option>
          ))}
        </select>

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
             <button
                disabled={isPlaying || isPaused}
                onClick={() => setPlayerColor('black')}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-inner transition-all ${playerColor === 'black' ? 'border-blue-500 ring-2 ring-blue-500/50 scale-110' : 'border-gray-600 hover:border-gray-400'}`}
             >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black"></div>
             </button>
             <button
                disabled={isPlaying || isPaused}
                onClick={() => setPlayerColor('white')}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-inner transition-all ${playerColor === 'white' ? 'border-blue-500 ring-2 ring-blue-500/50 scale-110' : 'border-gray-600 hover:border-gray-400'}`}
             >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-gray-300"></div>
             </button>
          </div>

          <button 
            onClick={onPlayPause}
            className={`w-12 h-10 rounded-md flex items-center justify-center transition-all shadow-md ${isPlaying ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </div>

      {/* Middle Panel: Status */}
      <div className="bg-panel-bg rounded-lg p-3 shadow-md border border-slate-700 flex flex-col items-center flex-shrink-0">
         <div className="text-xl font-bold text-white mb-1">
            TURN <span className="font-mono text-blue-400">{turnCount}</span>
         </div>
         <div className="flex items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-800 to-black border border-gray-600"></div>
                <span className="text-xl font-bold">{blackCount}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white to-gray-300 border border-gray-400"></div>
                <span className="text-xl font-bold">{whiteCount}</span>
            </div>
         </div>
         <div className="flex gap-2 w-full">
             <button 
                onClick={onUndo}
                disabled={!isPlaying && !isPaused}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs font-bold py-2 px-2 rounded border border-slate-600 disabled:opacity-50 transition-colors"
             >
                UNDO
             </button>
             <button 
                onClick={toggleResearch}
                className={`flex-1 text-xs font-bold py-2 px-2 rounded border border-slate-600 transition-all ${isResearchMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 hover:bg-slate-600'}`}
             >
                RESEARCH
             </button>
         </div>
      </div>

      {/* Bottom Panel: Graph & Playback - Grows to fill space */}
      <div className="bg-panel-bg rounded-lg p-3 shadow-md border border-slate-700 flex-grow flex flex-col min-h-[150px]">
         <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <span className="text-xs font-bold text-gray-300">Evaluation:</span>
            <span className={`text-xs font-mono font-bold ${typeof evalValue === 'number' && evalValue > 0 ? 'text-blue-400' : typeof evalValue === 'number' && evalValue < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {typeof evalValue === 'number' ? (evalValue > 0 ? `+${evalValue}` : evalValue) : 'N/A'}
            </span>
         </div>
         
         <div className="flex-grow bg-slate-800/50 rounded border border-slate-600 mb-2 relative overflow-hidden min-h-0">
             <EvaluationGraph 
                data={graphData} 
                currentTurnIndex={currentHistoryIndex}
                onPointClick={onPlaybackClick}
                gameEnded={isEnded}
             />
         </div>

         <div className="flex gap-1 justify-between flex-shrink-0">
             <button onClick={() => playback('first')} disabled={!isEnded} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-600 flex-1 flex justify-center"><DoubleChevronLeft/></button>
             <button onClick={() => playback('prev')} disabled={!isEnded} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-600 flex-1 flex justify-center"><ChevronLeftIcon/></button>
             <button onClick={() => playback('next')} disabled={!isEnded} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-600 flex-1 flex justify-center"><ChevronRightIcon/></button>
             <button onClick={() => playback('last')} disabled={!isEnded} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-600 flex-1 flex justify-center"><DoubleChevronRight/></button>
         </div>
      </div>
    </div>
  );
};
