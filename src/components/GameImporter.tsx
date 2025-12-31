"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { Chess } from "chess.js";

export function GameImporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { loadPgn, reset } = useGameStore();

  const handleImport = () => {
    setError(null);
    const trimmed = input.trim();

    if (!trimmed) {
      setError("Please enter a PGN or FEN");
      return;
    }

    // Try to detect if it's a FEN or PGN
    const isFen = !trimmed.includes("[") && !trimmed.includes("1.") && trimmed.split(" ").length >= 4;

    if (isFen) {
      // Validate FEN
      try {
        const chess = new Chess(trimmed);
        // Create a minimal PGN with the FEN as starting position
        const pgn = `[SetUp "1"]\n[FEN "${chess.fen()}"]\n\n*`;
        loadPgn(pgn);
        setInput("");
        setIsOpen(false);
      } catch {
        setError("Invalid FEN string");
      }
    } else {
      // Try to load as PGN
      try {
        const chess = new Chess();
        chess.loadPgn(trimmed);
        loadPgn(trimmed);
        setInput("");
        setIsOpen(false);
      } catch {
        setError("Invalid PGN format");
      }
    }
  };

  const handleNewGame = () => {
    reset();
    setInput("");
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Import game"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-200">Import Game</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Paste PGN or FEN
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`[Event "My Game"]\n[White "Player 1"]\n[Black "Player 2"]\n\n1. e4 e5 2. Nf3 Nc6...\n\nOr paste a FEN:\nrnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`}
                  className="w-full h-48 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-500 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50"
                />
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors text-sm font-medium"
                >
                  Import
                </button>
                <button
                  onClick={handleNewGame}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm"
                >
                  New Game
                </button>
              </div>

              <div className="text-xs text-zinc-500 space-y-1">
                <p>Supported formats:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>PGN (Portable Game Notation) - from lichess, chess.com, etc.</li>
                  <li>FEN (Forsyth-Edwards Notation) - for specific positions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
