"use client";

import { useMemo } from "react";

interface EvalBarProps {
  score: number | null; // In centipawns
  mate: number | null; // Mate in X
  orientation: "white" | "black";
  isAnalyzing?: boolean;
  depth?: number;
  height?: number; // Explicit height to match chess board
}

export function EvalBar({ score, mate, orientation, isAnalyzing, depth, height }: EvalBarProps) {
  // Convert score to a percentage for the bar (clamped between 0-100)
  const whitePercentage = useMemo(() => {
    if (mate !== null) {
      // Mate score - show extreme advantage
      return mate > 0 ? 100 : 0;
    }

    if (score === null) return 50;

    // Convert centipawns to percentage
    // Use a sigmoid-like function to compress extreme values
    // At +/- 400cp (4 pawns), we're at ~90% for the advantaged side
    const normalized = Math.tanh(score / 400);
    return 50 + normalized * 50;
  }, [score, mate]);

  // Format the score for display
  const displayScore = useMemo(() => {
    if (mate !== null) {
      return `M${Math.abs(mate)}`;
    }

    if (score === null) return "0.0";

    const absScore = Math.abs(score) / 100;
    const sign = score >= 0 ? "+" : "-";
    return `${sign}${absScore.toFixed(1)}`;
  }, [score, mate]);

  // Determine which side is winning for display
  const whiteWinning = (mate !== null && mate > 0) || (score !== null && score > 0);

  // Flip if viewing from black's perspective
  const displayPercentage = orientation === "white" ? whitePercentage : 100 - whitePercentage;

  return (
    <div className="relative shrink-0" style={{ height: height || '100%' }}>
      {/* Score display - positioned above the bar, can overflow */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10">
        <div
          className={`
            text-xs font-mono font-bold px-1.5 py-0.5 rounded whitespace-nowrap border
            ${whiteWinning
              ? "bg-zinc-100 text-zinc-900 border-zinc-300"
              : "bg-zinc-800 text-zinc-100 border-zinc-600"}
          `}
        >
          {displayScore}
          {depth !== undefined && depth > 0 && (
            <span className="text-[9px] opacity-50 ml-1">d{depth}</span>
          )}
        </div>
      </div>

      {/* Eval bar - full height matching the board */}
      <div className="w-7 h-full rounded-sm overflow-hidden relative border border-zinc-600 shadow-inner">
        {/* White section (bottom when white orientation) */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-[height] duration-600 ease-out"
          style={{
            height: `${displayPercentage}%`,
            background: 'linear-gradient(180deg, #e4e4e7 0%, #f4f4f5 50%, #e4e4e7 100%)',
          }}
        />

        {/* Black section (top when white orientation) */}
        <div
          className="absolute top-0 left-0 right-0 transition-[height] duration-600 ease-out"
          style={{
            height: `${100 - displayPercentage}%`,
            background: 'linear-gradient(180deg, #18181b 0%, #27272a 50%, #18181b 100%)',
          }}
        />

        {/* Analyzing shimmer effect */}
        {isAnalyzing && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(251, 191, 36, 0.1) 50%, transparent 100%)',
            }}
          />
        )}
      </div>
    </div>
  );
}
