"use client";

import { Chessboard } from "react-chessboard";
import { useGameStore } from "@/stores/gameStore";
import type { Square } from "chess.js";
import { Chess } from "chess.js";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { GameImporter } from "./GameImporter";
import { EvalBar } from "./EvalBar";
import { useStockfish } from "@/hooks/useStockfish";

export function ChessBoard() {
  const {
    currentFen,
    orientation,
    arrows,
    highlights,
    makeMove,
    flipBoard,
    goToStart,
    goBack,
    goForward,
    goToEnd,
    exerciseMode,
    onExerciseMove,
  } = useGameStore();

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [rightClickedSquares, setRightClickedSquares] = useState<
    Record<string, React.CSSProperties>
  >({});
  const [showEval, setShowEval] = useState(true);
  const [boardSize, setBoardSize] = useState(480);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);

  // Stockfish evaluation
  const { evaluation } = useStockfish(currentFen, showEval);

  // Calculate board size rounded to multiple of 8 to prevent sub-pixel gaps
  useEffect(() => {
    const calculateBoardSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Calculate available space: subtract eval bar (if shown) and minimal padding
      const evalBarWidth = showEval ? 48 : 0; // 28px bar + gap
      const horizontalPadding = 48; // minimal padding
      const verticalPadding = 48;

      // Available space for the board
      const availableWidth = containerWidth - evalBarWidth - horizontalPadding;
      const availableHeight = containerHeight - verticalPadding;

      // Use the smaller dimension to keep board square
      const maxSize = Math.min(availableWidth, availableHeight);

      // Round down to nearest multiple of 8 for clean pixel rendering
      const roundedSize = Math.floor(maxSize / 8) * 8;

      // Minimum size of 240px
      const newSize = Math.max(roundedSize, 240);

      setBoardSize(newSize);
    };

    // Initial calculation after a brief delay for layout to settle
    const timeoutId = setTimeout(calculateBoardSize, 50);

    // Use ResizeObserver to recalculate on container resize
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize calculations
      requestAnimationFrame(calculateBoardSize);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [showEval]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goBack();
          break;
        case "ArrowRight":
          e.preventDefault();
          goForward();
          break;
        case "ArrowUp":
          e.preventDefault();
          goToStart();
          break;
        case "ArrowDown":
          e.preventDefault();
          goToEnd();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  // Calculate legal moves for selected piece
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    const chess = new Chess(currentFen);
    return chess.moves({ square: selectedSquare, verbose: true });
  }, [selectedSquare, currentFen]);

  // Handle move with exercise mode support
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      // If in exercise mode, intercept the move
      if (exerciseMode?.active && onExerciseMove) {
        // Create a temp chess instance to get the SAN notation
        const chess = new Chess(currentFen);
        try {
          const move = chess.move({ from, to, promotion });
          if (!move) return false;

          // Check if the move matches the expected answer
          const isCorrect = move.san === exerciseMode.expectedMove;

          // Call the callback with the result
          onExerciseMove(move.san, isCorrect);

          // Make the actual move on the board
          makeMove(from, to, promotion);
          return true;
        } catch {
          return false;
        }
      }

      // Normal mode - just make the move
      const result = makeMove(from, to, promotion);
      return result !== null;
    },
    [currentFen, exerciseMode, onExerciseMove, makeMove]
  );

  const onDrop = useCallback(
    ({
      piece,
      sourceSquare,
      targetSquare,
    }: {
      piece: { pieceType: string; position: string; isSparePiece: boolean };
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare) return false;

      // Clear selection on drop
      setSelectedSquare(null);

      // Check for promotion - pieceType is like "wP", "bK", etc.
      const pieceType = piece.pieceType;
      const isPromotion =
        pieceType[1] === "P" &&
        ((pieceType[0] === "w" && targetSquare[1] === "8") ||
          (pieceType[0] === "b" && targetSquare[1] === "1"));

      const promotion = isPromotion ? "q" : undefined;
      return handleMove(
        sourceSquare as Square,
        targetSquare as Square,
        promotion
      );
    },
    [handleMove]
  );

  const onSquareClick = useCallback(
    ({ square }: { piece: { pieceType: string } | null; square: string }) => {
      const sq = square as Square;
      const chess = new Chess(currentFen);
      const pieceOnSquare = chess.get(sq);

      // If we have a selected piece and click a legal move square, make the move
      if (selectedSquare && selectedSquare !== sq) {
        const isLegalTarget = legalMoves.some((m) => m.to === sq);
        if (isLegalTarget) {
          const pieceOnSelected = chess.get(selectedSquare);
          const isPromotion =
            pieceOnSelected?.type === "p" &&
            ((pieceOnSelected.color === "w" && sq[1] === "8") ||
              (pieceOnSelected.color === "b" && sq[1] === "1"));

          handleMove(selectedSquare, sq, isPromotion ? "q" : undefined);
          setSelectedSquare(null);
          return;
        }
      }

      // If clicking on a piece of the current turn, select it
      if (pieceOnSquare && pieceOnSquare.color === chess.turn()) {
        setSelectedSquare(sq);
        return;
      }

      // Otherwise clear selection
      setSelectedSquare(null);
    },
    [selectedSquare, legalMoves, currentFen, handleMove]
  );

  const onSquareRightClick = useCallback(
    ({ square }: { piece: { pieceType: string } | null; square: string }) => {
      const color = "rgba(255, 170, 0, 0.4)";
      setRightClickedSquares((prev) => {
        const newSquares = { ...prev };
        if (newSquares[square]) {
          delete newSquares[square];
        } else {
          newSquares[square] = { backgroundColor: color };
        }
        return newSquares;
      });
    },
    []
  );

  // Build a set of legal move target squares for quick lookup
  const legalMoveTargets = useMemo(() => {
    const targets = new Map<string, { isCapture: boolean }>();
    const chess = new Chess(currentFen);
    for (const move of legalMoves) {
      const targetPiece = chess.get(move.to as Square);
      const isCapture = targetPiece !== null || move.flags.includes("e");
      targets.set(move.to, { isCapture });
    }
    return targets;
  }, [legalMoves, currentFen]);

  // Custom square renderer to show legal move dots and highlights
  const squareRenderer = useCallback(
    ({ square, children }: { piece: { pieceType: string } | null; square: string; children?: React.ReactNode }) => {
      const isSelected = selectedSquare === square;
      const isHighlighted = highlights.some((h) => h.square === square);
      const highlightColor = highlights.find((h) => h.square === square)?.color;
      const isRightClicked = rightClickedSquares[square];
      const legalMove = legalMoveTargets.get(square);

      const needsOverlay = isSelected || isHighlighted || isRightClicked || legalMove;

      if (!needsOverlay) {
        return <>{children}</>;
      }

      return (
        <>
          {children}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: isSelected
                ? "rgba(255, 255, 0, 0.5)"
                : isHighlighted
                  ? highlightColor || "rgba(255, 170, 0, 0.4)"
                  : isRightClicked
                    ? "rgba(255, 170, 0, 0.4)"
                    : undefined,
              pointerEvents: "none",
            }}
          />
          {legalMove && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: legalMove.isCapture ? "85%" : "33%",
                height: legalMove.isCapture ? "85%" : "33%",
                borderRadius: "50%",
                backgroundColor: legalMove.isCapture ? undefined : "rgba(0, 0, 0, 0.2)",
                border: legalMove.isCapture ? "5px solid rgba(0, 0, 0, 0.2)" : undefined,
                pointerEvents: "none",
              }}
            />
          )}
        </>
      );
    },
    [selectedSquare, highlights, rightClickedSquares, legalMoveTargets]
  );

  // Convert arrows to react-chessboard format
  const customArrows = useMemo(() => {
    return arrows.map((arrow) => ({
      startSquare: arrow.from,
      endSquare: arrow.to,
      color: arrow.color || "rgb(255, 170, 0)",
    }));
  }, [arrows]);

  // Custom piece theme for a more editorial look
  const customDarkSquareColor = "#779556";
  const customLightSquareColor = "#ebecd0";

  return (
    <div className="flex h-full flex-col">
      {/* Exercise mode indicator */}
      {exerciseMode?.active && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-medium text-sm">Exercise Mode</span>
            <span className="text-amber-300/70 text-sm">— {exerciseMode.question}</span>
          </div>
          {exerciseMode.hint && (
            <div className="text-zinc-400 text-xs mt-1">Hint: {exerciseMode.hint}</div>
          )}
        </div>
      )}
      {/* Board container */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 gap-3 overflow-visible">
        {/* Evaluation bar - match board height */}
        {showEval && (
          <EvalBar
            score={evaluation.score}
            mate={evaluation.mate}
            orientation={orientation}
            isAnalyzing={evaluation.isAnalyzing}
            depth={evaluation.depth}
            height={boardSize}
          />
        )}
        {/* Chessboard - size rounded to multiple of 8 to prevent sub-pixel gaps */}
        <div
          ref={boardWrapperRef}
          className={exerciseMode?.active ? "ring-4 ring-amber-500 ring-offset-2 ring-offset-zinc-900" : ""}
          style={{
            width: boardSize,
            height: boardSize,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            flexShrink: 0,
            backgroundColor: '#779556', // Match dark square to hide any sub-pixel gaps
          }}
        >
          <Chessboard
            options={{
              position: currentFen,
              onPieceDrop: onDrop,
              boardOrientation: orientation,
              arrows: customArrows,
              darkSquareStyle: { backgroundColor: customDarkSquareColor },
              lightSquareStyle: { backgroundColor: customLightSquareColor },
              onSquareClick: onSquareClick,
              onSquareRightClick: onSquareRightClick,
              squareRenderer: squareRenderer,
              animationDurationInMs: 150,
              allowDragging: true,
              showNotation: true,
            }}
          />
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-2 p-4 border-t border-zinc-800">
        <button
          onClick={goToStart}
          className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Go to start"
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
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>
        <button
          onClick={goBack}
          className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Previous move"
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
            <polygon points="19 20 9 12 19 4 19 20" />
          </svg>
        </button>
        <button
          onClick={goForward}
          className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Next move"
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
            <polygon points="5 4 15 12 5 20 5 4" />
          </svg>
        </button>
        <button
          onClick={goToEnd}
          className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Go to end"
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
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
        <div className="w-px h-6 bg-zinc-700 mx-2" />
        <GameImporter />
        <button
          onClick={flipBoard}
          className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Flip board"
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
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
