"use client";

import type { ScratchpadEntry } from "@/stores/scratchpadStore";

interface ThoughtsPanelProps {
  entries: ScratchpadEntry[];
}

export function ThoughtsPanel({ entries }: ThoughtsPanelProps) {
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-zinc-500 text-sm text-center">
        <div>
          <div className="mb-2">No thoughts recorded yet.</div>
          <div className="text-xs text-zinc-600">
            The coach&apos;s private analysis will appear here as they work through the position.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50"
        >
          <div className="text-xs text-zinc-500 mb-2">
            {entry.timestamp.toLocaleTimeString()}
          </div>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap">
            {entry.thought}
          </div>
          {entry.analyzeMoves && entry.analyzeMoves.length > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-700/50">
              <span className="text-xs text-zinc-500">Considering: </span>
              <span className="text-xs text-amber-400 font-mono">
                {entry.analyzeMoves.join(" ")}
              </span>
            </div>
          )}
          {entry.analysisResult && (
            <div className="mt-2 pt-2 border-t border-zinc-700/50 text-xs">
              <span className="text-zinc-500">Analysis: </span>
              <span className="text-zinc-400">
                {entry.analysisResult.mate !== null
                  ? `Mate in ${entry.analysisResult.mate}`
                  : `${((entry.analysisResult.score || 0) / 100).toFixed(1)} pawns`}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
