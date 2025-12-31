"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface StockfishEvaluation {
  score: number | null; // In centipawns, null if mate
  mate: number | null; // Mate in X moves, null if not mate
  depth: number;
  bestMove: string | null;
  pv: string[]; // Principal variation
  isAnalyzing: boolean;
}

const initialEval: StockfishEvaluation = {
  score: 0,
  mate: null,
  depth: 0,
  bestMove: null,
  pv: [],
  isAnalyzing: false,
};

// Use a class to manage the worker more carefully
class StockfishManager {
  private worker: Worker | null = null;
  private ready = false;
  private initializing = false;
  private listeners = new Set<(msg: string) => void>();
  private currentAnalysisFen: string | null = null;
  private pendingFen: string | null = null;
  private analysisComplete = true;

  async init(): Promise<boolean> {
    if (this.ready) return true;
    if (this.initializing) {
      // Wait for existing initialization
      return new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (this.ready || !this.initializing) {
            clearInterval(checkReady);
            resolve(this.ready);
          }
        }, 100);
      });
    }

    this.initializing = true;

    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        this.initializing = false;
        resolve(false);
        return;
      }

      console.log("[Stockfish] Initializing...");

      try {
        this.worker = new Worker("/stockfish/stockfish.js");
      } catch (e) {
        console.error("[Stockfish] Failed to create worker:", e);
        this.initializing = false;
        resolve(false);
        return;
      }

      this.worker.onmessage = (e) => {
        const msg = e.data;
        if (typeof msg !== "string") return;

        // Check for ready
        if (msg === "readyok") {
          console.log("[Stockfish] Ready");
          this.ready = true;
          this.initializing = false;
          resolve(true);

          // Process any pending analysis
          if (this.pendingFen) {
            const fen = this.pendingFen;
            this.pendingFen = null;
            this.startAnalysis(fen);
          }
        }

        // Check for bestmove (analysis complete)
        if (msg.startsWith("bestmove")) {
          this.analysisComplete = true;
          // Process any pending analysis
          if (this.pendingFen) {
            const fen = this.pendingFen;
            this.pendingFen = null;
            this.startAnalysis(fen);
          }
        }

        // Broadcast to listeners
        this.listeners.forEach((fn) => {
          try {
            fn(msg);
          } catch (err) {
            // Ignore listener errors
          }
        });
      };

      this.worker.onerror = () => {
        // Ignore errors - stockfish WASM has non-fatal errors
      };

      // Initialize UCI
      this.worker.postMessage("uci");
      this.worker.postMessage("setoption name Hash value 32");
      this.worker.postMessage("isready");

      // Timeout fallback
      setTimeout(() => {
        if (!this.ready) {
          console.warn("[Stockfish] Init timeout");
          this.initializing = false;
          resolve(false);
        }
      }, 10000);
    });
  }

  addListener(fn: (msg: string) => void) {
    this.listeners.add(fn);
  }

  removeListener(fn: (msg: string) => void) {
    this.listeners.delete(fn);
  }

  analyze(fen: string) {
    if (!this.ready || !this.worker) {
      this.pendingFen = fen;
      this.init();
      return;
    }

    // If currently analyzing something else, queue this
    if (!this.analysisComplete && this.currentAnalysisFen !== fen) {
      this.pendingFen = fen;
      this.worker.postMessage("stop");
      return;
    }

    // If already analyzing this position, don't restart
    if (this.currentAnalysisFen === fen && !this.analysisComplete) {
      return;
    }

    this.startAnalysis(fen);
  }

  private startAnalysis(fen: string) {
    if (!this.worker) return;

    console.log("[Stockfish] Analyzing:", fen.split(" ")[0]);
    this.currentAnalysisFen = fen;
    this.analysisComplete = false;

    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage("go depth 22");
  }

  stop() {
    if (this.worker && !this.analysisComplete) {
      this.worker.postMessage("stop");
    }
  }

  isReady() {
    return this.ready;
  }
}

// Global singleton
const stockfish = new StockfishManager();

export function useStockfish(fen: string, enabled: boolean = true) {
  const [evaluation, setEvaluation] = useState<StockfishEvaluation>(initialEval);
  const fenRef = useRef(fen);
  const isBlackTurnRef = useRef(false);

  // Initialize on mount
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    stockfish.init();
  }, [enabled]);

  // Handle messages
  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (message: string) => {
      // Only process if this is for our current FEN analysis
      const depthMatch = message.match(/info.*depth (\d+)/);
      const scoreMatch = message.match(/score cp (-?\d+)/);
      const mateMatch = message.match(/score mate (-?\d+)/);
      const bestMoveMatch = message.match(/bestmove (\w+)/);
      const pvMatch = message.match(/ pv (.+)/);

      if (depthMatch || scoreMatch || mateMatch || pvMatch) {
        setEvaluation((prev) => {
          const newEval = { ...prev, isAnalyzing: true };

          if (depthMatch) {
            newEval.depth = parseInt(depthMatch[1]);
          }

          // Stockfish returns score from side-to-move's perspective
          // Flip the score if it's Black's turn so we always show from White's perspective
          const flipScore = isBlackTurnRef.current ? -1 : 1;

          if (scoreMatch) {
            newEval.score = parseInt(scoreMatch[1]) * flipScore;
            newEval.mate = null;
          } else if (mateMatch) {
            newEval.mate = parseInt(mateMatch[1]) * flipScore;
            newEval.score = null;
          }

          if (pvMatch) {
            newEval.pv = pvMatch[1].split(" ").slice(0, 5);
          }

          return newEval;
        });
      }

      if (bestMoveMatch) {
        setEvaluation((prev) => ({
          ...prev,
          bestMove: bestMoveMatch[1],
          isAnalyzing: false,
        }));
      }
    };

    stockfish.addListener(handleMessage);
    return () => stockfish.removeListener(handleMessage);
  }, [enabled]);

  // Analyze when FEN changes
  useEffect(() => {
    if (!enabled) return;

    fenRef.current = fen;

    // Determine if it's black's turn from FEN (second field after position)
    const isBlackTurn = fen.split(" ")[1] === "b";
    isBlackTurnRef.current = isBlackTurn;

    // Small debounce to avoid rapid re-analysis
    const timer = setTimeout(() => {
      if (fenRef.current === fen) {
        stockfish.analyze(fen);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [fen, enabled]);

  const analyze = useCallback((depth: number = 22) => {
    setEvaluation((prev) => ({ ...prev, isAnalyzing: true }));
    stockfish.analyze(fenRef.current);
  }, []);

  const stop = useCallback(() => {
    stockfish.stop();
    setEvaluation((prev) => ({ ...prev, isAnalyzing: false }));
  }, []);

  return { evaluation, analyze, stop, isReady: stockfish.isReady() };
}
