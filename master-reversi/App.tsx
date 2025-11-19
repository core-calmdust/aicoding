
import React, { useState, useEffect, useRef } from 'react';
import { Board } from './components/Board';
import { CpuPanel } from './components/CpuPanel';
import { EvaluationGraph } from './components/EvaluationGraph';
import { 
  BoardState, 
  Player, 
  GameStatus, 
  AIMode, 
  HistoryState,
  Move 
} from './types';
import { 
  initializeBoard, 
  getValidMoves, 
  makeMove, 
  countDiscs, 
  isGameEnd 
} from './services/reversiLogic';
import { getBestMove, getResearchData } from './services/aiService';

// --- Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>;
const ResearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const DoubleChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>;
const DoubleChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>;

const App: React.FC = () => {
  // --- State ---
  const [board, setBoard] = useState<BoardState>(initializeBoard());
  const [turn, setTurn] = useState<Player>('black');
  
  // Settings
  const [playerColor, setPlayerColor] = useState<Player>('black');
  const [opponentLevel, setOpponentLevel] = useState<number>(5);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [mode, setMode] = useState<AIMode>(AIMode.PvCPU);
  const [cpuVsCpuLevels, setCpuVsCpuLevels] = useState<{black: number, white: number}>({ black: 9, white: 9 });

  // History & Analysis
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1); // -1 means "Live" (latest)
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);
  const [isResearchMode, setIsResearchMode] = useState<boolean>(false);
  const [researchData, setResearchData] = useState<Move[]>([]);
  
  const [showResumeModal, setShowResumeModal] = useState(false);

  const gameStatusRef = useRef(gameStatus);
  gameStatusRef.current = gameStatus;

  // Derived State
  const isViewingHistory = historyIndex !== -1;
  const currentHistoryState = isViewingHistory ? history[historyIndex] : null;
  const currentBoard = currentHistoryState ? currentHistoryState.board : board;
  const currentTurn = currentHistoryState ? currentHistoryState.turn : turn;
  
  // Correct Turn Counting: Turns = (Total Stones) - 4. 
  // This handles passes correctly because turn count only increases when a stone is placed.
  const currentDiscs = countDiscs(currentBoard);
  const calculatedTurnCount = (currentDiscs.black + currentDiscs.white) - 4;
  
  const validMoves = !isViewingHistory ? getValidMoves(currentBoard, currentTurn) : [];
  
  const counts = currentHistoryState 
    ? { black: currentHistoryState.blackCount, white: currentHistoryState.whiteCount } 
    : currentDiscs;

  const isHumanTurn = mode === AIMode.PvCPU && currentTurn === playerColor;
  const isGameReallyEnded = gameStatus === GameStatus.ENDED;

  // --- Effects ---

  useEffect(() => {
    if (history.length === 0 && gameStatus === GameStatus.IDLE) {
      setHistory([{
        board: initializeBoard(),
        turn: 'black',
        blackCount: 2,
        whiteCount: 2,
        evaluation: 0
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const runAITurn = async () => {
      if (gameStatus !== GameStatus.PLAYING) return;
      if (isViewingHistory) return; // Don't run AI if looking at history
      if (isGameEnd(currentBoard)) {
        handleGameEnd();
        return;
      }

      if (validMoves.length === 0) {
        // Pass turn
        const nextPlayer = currentTurn === 'black' ? 'white' : 'black';
        const nextMoves = getValidMoves(currentBoard, nextPlayer);
        if (nextMoves.length === 0) {
           handleGameEnd();
           return;
        }
        setTurn(nextPlayer);
        // Note: We don't add to history on pass to keep graph consistent with stones?
        // Actually, Reversi games usually record passes. But user requested:
        // "don't add to turn count". Our `calculatedTurnCount` handles the number.
        // We should still record state transition for "whose turn it is".
        // However, to avoid "Turn 61/62", we just rely on stone count for display.
        
        // We add a history entry for the pass so we can review it, but the "Turn Count" display won't increment.
        addToHistory(currentBoard, nextPlayer, counts.black, counts.white);
        return;
      }

      const isAiTurn = 
        (mode === AIMode.PvCPU && currentTurn !== playerColor) || 
        (mode === AIMode.CPUvCPU);

      if (isAiTurn) {
        let level = opponentLevel;
        if (mode === AIMode.CPUvCPU) {
          level = currentTurn === 'black' ? cpuVsCpuLevels.black : cpuVsCpuLevels.white;
        }

        // Small delay for UI update
        await new Promise(r => setTimeout(r, 100));
        if (gameStatusRef.current !== GameStatus.PLAYING) return;

        const bestMove = await getBestMove(currentBoard, currentTurn, level);
        if (bestMove) executeMove(bestMove.index);
      }
    };

    timeoutId = setTimeout(runAITurn, 50);
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameStatus, board, mode, historyIndex, opponentLevel, playerColor]);

  useEffect(() => {
    if (isResearchMode && !isViewingHistory && gameStatus !== GameStatus.ENDED) {
      const data = getResearchData(currentBoard, currentTurn);
      setResearchData(data);
    } else {
      setResearchData([]);
    }
  }, [isResearchMode, currentBoard, currentTurn, gameStatus, historyIndex]);

  // --- Handlers ---

  const addToHistory = (newBoard: BoardState, nextTurn: Player, b: number, w: number) => {
    // Use AI eval for graph if possible, or simplified.
    // For better graph, we could fetch a quick eval here, but for speed let's use disc diff
    // unless we store the AI score from executeMove (not passed here currently).
    const evalScore = (b - w) * 10; 
    setHistory(prev => [...prev, {
      board: newBoard,
      turn: nextTurn,
      blackCount: b,
      whiteCount: w,
      evaluation: evalScore 
    }]);
  };

  const executeMove = (index: number) => {
    const nextBoard = makeMove(currentBoard, index, currentTurn);
    const nextPlayer = currentTurn === 'black' ? 'white' : 'black';
    
    setBoard(nextBoard);
    setTurn(nextPlayer);
    setLastMoveIndex(index);
    
    const newCounts = countDiscs(nextBoard);
    addToHistory(nextBoard, nextPlayer, newCounts.black, newCounts.white);
  };

  const handleSquareClick = (index: number) => {
    if (gameStatus !== GameStatus.PLAYING) return;
    if (isViewingHistory) return;
    if (!isHumanTurn && mode === AIMode.PvCPU) return;
    executeMove(index);
  };

  const handleGameEnd = () => {
    setGameStatus(GameStatus.ENDED);
  };

  const startGame = (reset: boolean = true) => {
    if (reset) {
      const initialB = initializeBoard();
      setBoard(initialB);
      setTurn('black');
      setHistory([{
        board: initialB,
        turn: 'black',
        blackCount: 2,
        whiteCount: 2,
        evaluation: 0
      }]);
      setLastMoveIndex(null);
      setHistoryIndex(-1);
    }
    setGameStatus(GameStatus.PLAYING);
    setShowResumeModal(false);
  };

  const handlePlayPause = () => {
    if (gameStatus === GameStatus.IDLE || gameStatus === GameStatus.ENDED) {
      setMode(AIMode.PvCPU);
      startGame(true);
    } else if (gameStatus === GameStatus.PLAYING) {
      setGameStatus(GameStatus.PAUSED);
    } else if (gameStatus === GameStatus.PAUSED) {
      setShowResumeModal(true);
    }
  };

  const handleUndo = () => {
    if (gameStatus === GameStatus.PLAYING && !isHumanTurn) return; 
    if (history.length <= 1) return;

    // Undo 2 steps if PvCPU (to get back to player turn), 1 otherwise
    let steps = 1;
    if (mode === AIMode.PvCPU) {
       // Check if the previous turn was AI (it usually is). 
       // If it is human turn now, we go back 2 (AI turn, then Human turn).
       if (isHumanTurn && history.length > 2) {
           steps = 2;
       }
    }
    
    const targetLen = Math.max(1, history.length - steps);
    const newHistory = history.slice(0, targetLen);
    const lastState = newHistory[newHistory.length - 1];
    
    setHistory(newHistory);
    setBoard(lastState.board);
    setTurn(lastState.turn);
    setHistoryIndex(-1); // Snap back to live
    
    // If game ended, un-end it
    if (gameStatus === GameStatus.ENDED) setGameStatus(GameStatus.PAUSED);
  };

  const startCpuGame = (l1: number, l2: number) => {
    setCpuVsCpuLevels({ black: l1, white: l2 });
    setMode(AIMode.CPUvCPU);
    startGame(true);
  };

  const handlePlayback = (action: 'first' | 'prev' | 'next' | 'last') => {
    const maxIndex = history.length - 1;
    let current = historyIndex === -1 ? maxIndex : historyIndex;

    switch(action) {
      case 'first': current = 0; break;
      case 'prev': current = Math.max(0, current - 1); break;
      case 'next': current = Math.min(maxIndex, current + 1); break;
      case 'last': current = maxIndex; break;
    }

    setHistoryIndex(current);
  };

  const handleContinuePlaying = () => {
      setShowResumeModal(false); 
      setHistoryIndex(-1);
      setGameStatus(GameStatus.PLAYING); 
  };

  const graphData = history.map((h, i) => ({ turn: i, evaluation: h.evaluation }));
  
  const evalValue = isViewingHistory 
    ? history[historyIndex].evaluation 
    : (history.length > 0 ? history[history.length - 1].evaluation : 0);

  const isPlaying = gameStatus === GameStatus.PLAYING;
  const isPaused = gameStatus === GameStatus.PAUSED;
  const showGameOverOverlay = isGameReallyEnded && !isViewingHistory;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans select-none">
      
      {/* --- TOP CONTROL BAR (Universal) --- */}
      <header className="flex-none flex flex-col md:flex-row md:items-center justify-between bg-slate-800 border-b border-slate-700 p-3 gap-3 z-30 shadow-md">
          
          {/* Left Group: Settings & Score */}
          <div className="flex items-center justify-between md:justify-start gap-4 md:gap-8 w-full md:w-auto">
              {/* Level Select */}
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <label className="text-xs text-gray-400 uppercase font-bold md:hidden">Opponent</label>
                  <select 
                    disabled={isPlaying}
                    value={opponentLevel}
                    onChange={(e) => setOpponentLevel(Number(e.target.value))}
                    className="bg-slate-700 text-sm sm:text-base text-white border border-slate-600 rounded p-1.5 sm:py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                      {Array.from({ length: 10 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>Lv.{i + 1}{i === 9 ? ' (Master)' : ''}</option>
                      ))}
                      <option value={11}>Lv.11 (God Mode)</option>
                  </select>
              </div>

              {/* Player Color */}
              <div className="flex items-center gap-2">
                <button 
                    onClick={() => setPlayerColor('black')}
                    disabled={isPlaying}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-transform ${playerColor === 'black' ? 'border-blue-400 ring-1 ring-blue-400 scale-110' : 'border-gray-600 hover:border-gray-400'} bg-gradient-to-br from-gray-800 to-black`}
                />
                <button 
                    onClick={() => setPlayerColor('white')}
                    disabled={isPlaying}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-transform ${playerColor === 'white' ? 'border-blue-400 ring-1 ring-blue-400 scale-110' : 'border-gray-600 hover:border-gray-400'} bg-gradient-to-br from-white to-gray-300`}
                />
              </div>

              {/* Score Display */}
              <div className="flex items-center gap-3 sm:gap-5 bg-slate-900/50 px-3 py-1.5 rounded border border-slate-700">
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black border border-gray-500"></div>
                    <span className="text-base sm:text-lg font-bold font-mono">{counts.black}</span>
                 </div>
                 <div className="w-px h-5 bg-slate-600"></div>
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white"></div>
                    <span className="text-base sm:text-lg font-bold font-mono">{counts.white}</span>
                 </div>
              </div>
          </div>

          {/* Right Group: Actions */}
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto mt-2 md:mt-0">
              <div className="flex gap-3">
                 <button 
                    onClick={handleUndo}
                    disabled={(!isPlaying && !isPaused) || (isPlaying && !isHumanTurn)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm sm:text-base font-semibold border border-slate-600 disabled:opacity-40 transition-colors"
                 >
                    <UndoIcon /> <span className="hidden sm:inline">Undo</span>
                 </button>
                 <button 
                    onClick={() => setIsResearchMode(!isResearchMode)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm sm:text-base font-semibold border transition-colors ${isResearchMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'}`}
                 >
                    <ResearchIcon /> <span className="hidden sm:inline">Research</span>
                 </button>
              </div>

              <div className="flex items-center gap-4">
                  <span className="text-sm sm:text-base text-gray-400 font-bold">
                      Turn: <span className="text-blue-400 font-mono">{calculatedTurnCount}</span>
                  </span>
                  <button 
                    onClick={handlePlayPause}
                    className={`w-12 h-10 sm:w-14 sm:h-11 rounded-md flex items-center justify-center shadow-lg transition-all active:scale-95 ${isPlaying ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
              </div>
          </div>
      </header>

      {/* --- MAIN BOARD AREA --- */}
      <main className="flex-1 relative flex items-center justify-center bg-slate-950 p-2 sm:p-4 min-h-0 min-w-0">
          
          {/* Turn Status Overlay */}
          {isPlaying && mode === AIMode.PvCPU && !isViewingHistory && (
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-1.5 rounded-full text-sm sm:text-base font-bold text-white z-10 shadow-xl transition-colors duration-300 border border-white/10 ${currentTurn === playerColor ? 'bg-green-600' : 'bg-gray-600'}`}>
                {currentTurn === playerColor ? "YOUR TURN" : "AI THINKING..."}
            </div>
          )}
          
          {/* Game Over Overlay */}
          {showGameOverOverlay && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <div className="bg-slate-800/95 border-2 border-yellow-500 p-8 rounded-2xl shadow-2xl text-center transform scale-110 animate-pulse-slow">
                    <div className="text-4xl font-black text-yellow-400 mb-3 tracking-wider">GAME OVER</div>
                    <div className="text-2xl font-bold text-white mb-6">
                        {counts.black > counts.white ? "BLACK WINS!" : counts.white > counts.black ? "WHITE WINS!" : "DRAW"}
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button 
                            onClick={() => startGame(true)} 
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-lg text-white shadow-lg transition-colors"
                        >
                            New Game
                        </button>
                    </div>
                    <div className="mt-4 text-xs text-gray-400">
                        Tip: Scrub the graph below to review the game.
                    </div>
                </div>
            </div>
          )}

          <Board 
            board={currentBoard}
            validMoves={gameStatus === GameStatus.PLAYING && !isViewingHistory ? validMoves : []}
            onSquareClick={handleSquareClick}
            lastMoveIndex={lastMoveIndex}
            isResearchMode={isResearchMode}
            researchData={researchData}
            turn={currentTurn}
          />
      </main>

      {/* --- BOTTOM SECTION: GRAPH & AI --- */}
      <div className="flex-none flex flex-col bg-slate-900 border-t border-slate-700 z-20">
          
          {/* Graph Area + Playback Controls */}
          <div className="flex flex-col sm:flex-row h-32 sm:h-44 border-b border-slate-800">
              {/* Graph */}
              <div className="flex-1 relative bg-slate-900/50">
                  <EvaluationGraph 
                      data={graphData} 
                      currentTurnIndex={historyIndex === -1 ? history.length - 1 : historyIndex}
                      onPointClick={(idx) => setHistoryIndex(idx)}
                      gameEnded={true}
                  />
                  <div className="absolute top-1 right-2 pointer-events-none bg-slate-900/60 px-2 py-0.5 rounded text-xs sm:text-sm">
                      <span className={`font-mono font-bold ${evalValue > 0 ? 'text-blue-400' : evalValue < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {evalValue > 0 ? '+' : ''}{evalValue}
                      </span>
                  </div>
              </div>

              {/* Playback Controls Strip */}
              <div className="flex sm:flex-col items-center justify-center gap-2 p-2 bg-slate-800 sm:border-l border-slate-700 sm:w-20">
                  <button onClick={() => handlePlayback('first')} className="p-2 rounded hover:bg-slate-700 text-gray-300 active:bg-slate-600"><DoubleChevronLeft /></button>
                  <button onClick={() => handlePlayback('prev')} className="p-2 rounded hover:bg-slate-700 text-gray-300 active:bg-slate-600"><ChevronLeftIcon /></button>
                  <button onClick={() => handlePlayback('next')} className="p-2 rounded hover:bg-slate-700 text-gray-300 active:bg-slate-600"><ChevronRightIcon /></button>
                  <button onClick={() => handlePlayback('last')} className="p-2 rounded hover:bg-slate-700 text-gray-300 active:bg-slate-600"><DoubleChevronRight /></button>
              </div>
          </div>

          {/* AI Panel */}
          <div className="p-3 bg-slate-900">
              <CpuPanel startCpuGame={startCpuGame} gameStatus={gameStatus} />
          </div>
      </div>

      {/* Resume Modal */}
      {showResumeModal && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-600 text-center max-w-xs sm:max-w-sm w-full transform scale-100">
            <h3 className="text-xl font-bold mb-6 text-white">Game Paused</h3>
            <div className="flex flex-col gap-4">
               <button onClick={handleContinuePlaying} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white text-lg transition-colors">Continue Playing</button>
               <button onClick={() => startGame(true)} className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-white text-lg transition-colors">Restart Game</button>
               <button onClick={() => setShowResumeModal(false)} className="w-full py-3 text-base text-gray-400 hover:text-white underline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
