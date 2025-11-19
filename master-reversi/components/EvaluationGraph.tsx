
import React, { useRef, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface DataPoint {
  turn: number;
  evaluation: number;
}

interface Props {
  data: DataPoint[];
  currentTurnIndex: number;
  onPointClick: (index: number) => void;
  gameEnded: boolean;
}

export const EvaluationGraph: React.FC<Props> = ({ data, currentTurnIndex, onPointClick, gameEnded }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Normalize data for display
  const formattedData = data.map(d => ({
    ...d,
    displayEval: Math.max(-200, Math.min(200, d.evaluation))
  }));

  const handleInteraction = (clientX: number) => {
    if (!containerRef.current || data.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;

    // Calculate percentage
    let pct = x / width;
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;

    // Map to turn index
    const totalTurns = data.length - 1;
    const targetIndex = Math.round(pct * totalTurns);
    
    if (targetIndex >= 0 && targetIndex < data.length) {
        onPointClick(targetIndex);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleInteraction(e.clientX);
    }
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
      setIsDragging(true);
      handleInteraction(e.touches[0].clientX);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
      if(isDragging) {
          handleInteraction(e.touches[0].clientX);
      }
  }
  
  const onTouchEnd = () => {
      setIsDragging(false);
  }

  useEffect(() => {
    const handleGlobalUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
        window.removeEventListener('mouseup', handleGlobalUp);
        window.removeEventListener('touchend', handleGlobalUp);
    }
  }, []);

  return (
    <div 
        ref={containerRef}
        className="w-full h-full relative cursor-crosshair select-none touch-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      {data.length === 0 ? (
         <div className="flex items-center justify-center h-full text-gray-500 text-xs sm:text-base">
             Waiting for game start...
         </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="evalColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="turn" hide />
            <YAxis domain={[-200, 200]} hide />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Area 
                type="monotone" 
                dataKey="displayEval" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#evalColor)" 
                isAnimationActive={false}
                strokeWidth={2}
            />
            {/* Current Turn Indicator */}
            {data[currentTurnIndex] && (
                 <ReferenceLine x={data[currentTurnIndex].turn} stroke="#fca5a5" strokeWidth={2} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
