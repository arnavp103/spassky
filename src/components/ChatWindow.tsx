"use client";

import { useGameStore } from "@/stores/gameStore";
import { useScratchpadStore } from "@/stores/scratchpadStore";
import { useState, useRef, useEffect, useCallback, type FormEvent, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type UIMessage,
} from "ai";
import type { Square } from "chess.js";
import { famousGames, openingStudies, endgameStudies, type OpeningStudy, type EndgameStudy, type FamousGame } from "@/data/famousGames";
import { useStockfish } from "@/hooks/useStockfish";
import { ThoughtsPanel } from "./ThoughtsPanel";
import { ChatMessage } from "./ChatMessage";

// Tool call that's been queued for execution
interface QueuedToolCall {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
}

// A section of the response, parsed by jumpToMove boundaries
interface ResponseSection {
  textStart: number;
  textEnd: number;
  toolCalls: QueuedToolCall[];
  moveNumber?: number;
  moveColor?: "white" | "black";
}

// Constants for arrow and highlight colors
const ARROW_COLOR_MAP: Record<string, string> = {
  green: "rgba(0, 200, 100, 0.8)",
  red: "rgba(255, 80, 80, 0.8)",
  yellow: "rgba(255, 200, 0, 0.8)",
  blue: "rgba(80, 150, 255, 0.8)",
};

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  green: "rgba(0, 200, 100, 0.4)",
  red: "rgba(255, 80, 80, 0.4)",
  yellow: "rgba(255, 200, 0, 0.4)",
  blue: "rgba(80, 150, 255, 0.4)",
};

export function ChatWindow() {
  const {
    loadPgn,
    loadFen,
    currentFen,
    gameInfo,
    goToMoveNumber,
    setArrows,
    setHighlights,
    clearAnnotations,
    addSidelineFromMoves,
    exerciseMode,
    setExerciseMode,
    clearExerciseMode,
    setOnExerciseMove,
  } = useGameStore();

  const { entries: scratchpadEntries, addEntry: addScratchpadEntry } = useScratchpadStore();

  const [inputValue, setInputValue] = useState("");
  const [loadedPgn, setLoadedPgn] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"chat" | "thoughts">("chat");

  // Progressive reveal state
  const [queuedToolCalls, setQueuedToolCalls] = useState<QueuedToolCall[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [sections, setSections] = useState<ResponseSection[]>([]);
  const [currentMovePosition, setCurrentMovePosition] = useState<{
    moveNumber: number;
    color: "white" | "black";
  } | null>(null);

  // Get Stockfish evaluation for the current position
  const { evaluation: stockfishEval } = useStockfish(currentFen);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize stockfish eval to prevent transport recreation
  // We stringify pv array to detect content changes without deep comparison
  const pvString = stockfishEval.pv?.join(',') || '';
  const stableStockfishEval = useMemo(
    () => ({
      score: stockfishEval.score,
      mate: stockfishEval.mate,
      bestMove: stockfishEval.bestMove,
      depth: stockfishEval.depth,
      pv: stockfishEval.pv,
    }),
    [
      stockfishEval.score,
      stockfishEval.mate,
      stockfishEval.bestMove,
      stockfishEval.depth,
      pvString, // Use stringified version to track pv changes efficiently
    ]
  );

  // Create transport with custom body data
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          currentFen,
          gameInfo,
          pgn: loadedPgn,
          stockfishEval: stableStockfishEval,
        },
      }),
    [currentFen, gameInfo, loadedPgn, stableStockfishEval]
  );

  // Execute a single tool call
  // Execute a single tool call - use ref for stockfish to avoid recreation
  const stockfishEvalRef = useRef(stockfishEval);
  stockfishEvalRef.current = stockfishEval;

  const executeToolCall = useCallback(
    (toolCall: QueuedToolCall, animate: boolean = true) => {
      console.log("[ChatWindow] Executing tool:", toolCall.toolName, toolCall.input);

      switch (toolCall.toolName) {
        case "jumpToMove": {
          const { moveNumber, color } = toolCall.input as {
            moveNumber: number;
            color: "white" | "black";
          };
          goToMoveNumber(moveNumber, color, animate);
          clearAnnotations();
          setCurrentMovePosition({ moveNumber, color });
          return `Jumped to move ${moveNumber} (${color})`;
        }

        case "setPosition": {
          const { fen, description } = toolCall.input as {
            fen: string;
            description?: string;
          };
          loadFen(fen);
          clearAnnotations();
          setCurrentMovePosition(null);
          return `Position set${description ? `: ${description}` : ""}`;
        }

        case "drawArrows": {
          const { arrows } = toolCall.input as {
            arrows: Array<{ from: string; to: string; color?: string }>;
          };
          setArrows(
            arrows.map((a) => ({
              from: a.from as Square,
              to: a.to as Square,
              color: ARROW_COLOR_MAP[a.color || "green"],
            }))
          );
          return `Drew ${arrows.length} arrows`;
        }

        case "highlightSquares": {
          const { squares, color } = toolCall.input as {
            squares: string[];
            color?: string;
          };
          setHighlights(
            squares.map((sq) => ({
              square: sq as Square,
              color: HIGHLIGHT_COLOR_MAP[color || "yellow"],
            }))
          );
          return `Highlighted ${squares.length} squares`;
        }

        case "proposeSideline": {
          const { fromMoveNumber, fromColor, moves, explanation } = toolCall.input as {
            fromMoveNumber: number;
            fromColor: "white" | "black";
            moves: string[];
            explanation: string;
          };
          addSidelineFromMoves(fromMoveNumber, fromColor, moves);
          return `Created sideline: ${moves.join(" ")} - ${explanation}`;
        }

        case "askExercise": {
          const { question, hint, answerMove, answerExplanation } = toolCall.input as {
            question: string;
            hint?: string;
            answerMove: string;
            answerExplanation: string;
          };
          setExerciseMode({
            active: true,
            expectedMove: answerMove,
            positionFen: currentFen,
            question,
            hint,
            answerExplanation,
          });
          return "Exercise posed - waiting for user to play on board";
        }

        case "clearAnnotations": {
          clearAnnotations();
          return "Annotations cleared";
        }

        case "getAnalysis": {
          const currentEval = stockfishEvalRef.current;
          const analysisResult = {
            currentFen,
            score: currentEval.score,
            mate: currentEval.mate,
            depth: currentEval.depth,
            bestMove: currentEval.bestMove,
            pv: currentEval.pv,
            evaluation:
              currentEval.mate !== null
                ? `Mate in ${currentEval.mate}`
                : `${((currentEval.score || 0) / 100).toFixed(1)} pawns (${(currentEval.score || 0) > 0 ? "White" : "Black"} advantage)`,
          };
          return JSON.stringify(analysisResult);
        }

        case "scratchpad": {
          const { thought, analyzeMoves } = toolCall.input as {
            thought: string;
            analyzeMoves?: string[];
          };
          const currentEval = stockfishEvalRef.current;
          addScratchpadEntry({
            thought,
            analyzeMoves,
            analysisResult: {
              score: currentEval.score,
              mate: currentEval.mate,
              bestMove: currentEval.bestMove,
              pv: currentEval.pv || [],
            },
          });
          return "Thought recorded";
        }

        case "waitForUser": {
          // No longer used - frontend handles pacing
          return "Continued";
        }

        default:
          return "Unknown tool";
      }
    },
    [
      goToMoveNumber,
      loadFen,
      clearAnnotations,
      setArrows,
      setHighlights,
      addSidelineFromMoves,
      setExerciseMode,
      addScratchpadEntry,
      currentFen,
    ]
  );

  const { messages, sendMessage, addToolOutput, status, error } = useChat({
    transport,

    async onToolCall({ toolCall }) {
      // Queue the tool call instead of executing immediately
      const queuedCall: QueuedToolCall = {
        toolName: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        input: toolCall.input as Record<string, unknown>,
      };

      console.log("[ChatWindow] Queueing tool:", toolCall.toolName);
      setQueuedToolCalls((prev) => [...prev, queuedCall]);

      // For tools that need immediate response (getAnalysis, scratchpad), execute now
      if (toolCall.toolName === "getAnalysis" || toolCall.toolName === "scratchpad") {
        const output = executeToolCall(queuedCall, false);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: output || "Done",
        });
      } else {
        // For visual tools, return placeholder output - they'll be executed during reveal
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: "Queued for reveal",
        });
      }
    },
  });

  // Set up exercise move callback when exercise mode becomes active
  useEffect(() => {
    if (!exerciseMode?.active) {
      setOnExerciseMove(null);
      return;
    }

    const handleExerciseMove = async (moveSan: string, isCorrect: boolean) => {
      clearExerciseMode();

      // Send hidden message to AI with the result
      const hiddenMessage = isCorrect
        ? `[EXERCISE_RESPONSE] User played: ${moveSan} (CORRECT - this was the expected move: ${exerciseMode.expectedMove})`
        : `[EXERCISE_RESPONSE] User played: ${moveSan} (INCORRECT - expected: ${exerciseMode.expectedMove}). Explanation of correct move: ${exerciseMode.answerExplanation}`;

      await sendMessage({ text: hiddenMessage });
    };

    setOnExerciseMove(handleExerciseMove);
  }, [exerciseMode?.active, exerciseMode?.expectedMove, exerciseMode?.answerExplanation, clearExerciseMode, setOnExerciseMove, sendMessage]);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when new messages are added
  // Note: We only depend on length to avoid scrolling during message updates (e.g., streaming)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Check if there are more tool calls to execute
  const hasMoreToolCalls = currentSection < queuedToolCalls.length;

  // Execute tool calls for the current section (up to and including next jumpToMove)
  const executeNextSection = useCallback(() => {
    if (currentSection >= queuedToolCalls.length) return;

    let i = currentSection;
    while (i < queuedToolCalls.length) {
      const toolCall = queuedToolCalls[i];
      executeToolCall(toolCall, true); // animate = true for Continue

      // If this was a jumpToMove, stop after executing it (user needs to see the position)
      if (toolCall.toolName === "jumpToMove") {
        setCurrentSection(i + 1);
        return;
      }
      i++;
    }
    // If we got here, we executed all remaining tool calls
    setCurrentSection(queuedToolCalls.length);
  }, [currentSection, queuedToolCalls, executeToolCall]);

  // Execute tool calls when AI finishes and we have queued calls
  useEffect(() => {
    if (status !== "ready" || queuedToolCalls.length === 0 || currentSection !== 0) {
      return;
    }

    // Execute first section immediately (no animation for initial setup)
    let i = 0;
    while (i < queuedToolCalls.length) {
      const toolCall = queuedToolCalls[i];
      executeToolCall(toolCall, false); // animate = false for initial reveal

      if (toolCall.toolName === "jumpToMove") {
        setCurrentSection(i + 1);
        return;
      }
      i++;
    }
    setCurrentSection(queuedToolCalls.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, queuedToolCalls, currentSection]); // Need full array since we access elements

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // If there are pending tool calls (user is interjecting during lesson)
    if (hasMoreToolCalls && currentMovePosition) {
      // Include current position context in the message
      const messageWithContext = `[POSITION: move ${currentMovePosition.moveNumber}, ${currentMovePosition.color}] ${inputValue}`;

      // Clear the pending tool calls - we're abandoning the rest of the lesson
      setQueuedToolCalls([]);
      setCurrentSection(0);
      setCurrentMovePosition(null);

      await sendMessage({ text: messageWithContext });
      setInputValue("");
      return;
    }

    // Reset tool call state for new conversation
    setQueuedToolCalls([]);
    setCurrentSection(0);
    setCurrentMovePosition(null);

    // Check if input looks like a PGN
    const isPgn =
      inputValue.includes("[Event") ||
      inputValue.includes("[White") ||
      (inputValue.includes("1.") && inputValue.includes("2."));

    if (isPgn) {
      loadPgn(inputValue);
      setLoadedPgn(inputValue);
      await sendMessage({
        text: `I've loaded a new game for analysis. Here's the PGN:\n\n${inputValue}\n\nPlease analyze this game and walk me through the key moments. Show me what I did well and where I went wrong.`,
      });
    } else {
      await sendMessage({ text: inputValue });
    }

    setInputValue("");
  };

  const handleContinue = () => {
    executeNextSection();
  };

  const handleLoadFamousGame = useCallback(async (game: FamousGame) => {
    loadPgn(game.pgn);
    setLoadedPgn(game.pgn);
    await sendMessage({
      text: `I'd like to study the "${game.name}" - ${game.players} (${game.year}). ${game.description}. Please tell me about the historical context of this game, explain the opening, discuss the middlegame strategies, and walk me through the key moments and brilliant moves.`,
    });
  }, [loadPgn, sendMessage]);

  const handleLoadOpening = useCallback(async (opening: OpeningStudy) => {
    loadPgn(opening.pgn);
    setLoadedPgn(opening.pgn);
    await sendMessage({
      text: `I'd like to study the ${opening.name} opening (${opening.eco}). ${opening.description}. Please teach me this opening interactively - walk me through the main ideas and key variations, and let me play moves to explore the theory branches.`,
    });
  }, [loadPgn, sendMessage]);

  const handleLoadEndgame = useCallback(async (endgame: EndgameStudy) => {
    loadFen(endgame.fen);
    setLoadedPgn(""); // Clear any loaded PGN
    await sendMessage({
      text: `I'd like to study the ${endgame.name}. ${endgame.description}. Objective: ${endgame.objective}. Please teach me this endgame technique step by step.`,
    });
  }, [loadFen, sendMessage]);

  // Extract text content from message parts
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  // Check if message should be hidden (exercise response)
  const isHiddenMessage = (message: UIMessage): boolean => {
    const text = getMessageText(message);
    return text.startsWith("[EXERCISE_RESPONSE]");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with Tabs */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("chat")}
            className={`text-sm font-semibold tracking-wide uppercase transition-colors ${
              activeTab === "chat"
                ? "text-zinc-200"
                : "text-zinc-500 hover:text-zinc-400"
            }`}
          >
            Coach
          </button>
          <button
            onClick={() => setActiveTab("thoughts")}
            className={`text-sm font-semibold tracking-wide uppercase transition-colors flex items-center gap-2 ${
              activeTab === "thoughts"
                ? "text-zinc-200"
                : "text-zinc-500 hover:text-zinc-400"
            }`}
          >
            Thoughts
            {scratchpadEntries.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                {scratchpadEntries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content area - conditionally render based on active tab */}
      {activeTab === "chat" ? (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col h-full px-4 pt-4 space-y-4">
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl px-4 py-3 text-sm bg-zinc-800/70 text-zinc-200">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      Hey! I&apos;m your chess coach. Show me a game you&apos;ve
                      played recently and let&apos;s go through it together.
                      {"\n\n"}
                      Just paste the PGN below - you can copy it from Lichess,
                      Chess.com, or any chess site. I&apos;ll walk you through
                      the key moments, point out what you did well, and help you
                      understand where things went wrong.
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl px-4 py-3 text-sm bg-zinc-800/70 text-zinc-200">
                    <div className="mb-3">
                      Or try one of these study options:
                    </div>

                    {/* Openings */}
                    <div className="mb-3">
                      <div className="text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">Openings</div>
                      <div className="flex flex-wrap gap-2">
                        {openingStudies.map((opening) => (
                          <button
                            key={opening.name}
                            onClick={() => handleLoadOpening(opening)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-xs transition-colors text-left border border-emerald-500/20"
                            title={`${opening.eco}: ${opening.description}`}
                          >
                            {opening.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Endgames */}
                    <div className="mb-3">
                      <div className="text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">Endgames</div>
                      <div className="flex flex-wrap gap-2">
                        {endgameStudies.map((endgame) => (
                          <button
                            key={endgame.name}
                            onClick={() => handleLoadEndgame(endgame)}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 text-xs transition-colors text-left border border-purple-500/20"
                            title={endgame.description}
                          >
                            {endgame.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Famous Games */}
                    <div>
                      <div className="text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">Famous Games</div>
                      <div className="flex flex-wrap gap-2">
                        {famousGames.map((game) => (
                          <button
                            key={game.name}
                            onClick={() => handleLoadFamousGame(game)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs transition-colors text-left border border-amber-500/20"
                            title={`${game.players} (${game.year})`}
                          >
                            {game.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages
              .filter((message) => !isHiddenMessage(message))
              .map((message) => {
                const text = getMessageText(message);
                if (!text) return null;

                return (
                  <ChatMessage
                    key={message.id}
                    role={message.role as "user" | "assistant"}
                    content={text}
                    onMoveClick={(moveNumber, color) => goToMoveNumber(moveNumber, color, false)}
                  />
                );
              })}

            {/* Exercise Mode UI */}
            {exerciseMode?.active && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="text-amber-300 font-medium mb-2">
                  {exerciseMode.question}
                </div>
                {exerciseMode.hint && (
                  <div className="text-amber-400/70 text-xs mb-3">
                    Hint: {exerciseMode.hint}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-amber-200/60 text-xs">
                    Play your move on the board
                  </div>
                  <button
                    onClick={clearExerciseMode}
                    className="px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-300 text-sm hover:bg-zinc-600"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800/70 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse" />
                    <div
                      className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-red-400 text-xs">
                  {error.message || "An error occurred. Please try again."}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={
                  hasMoreToolCalls
                    ? "Type to interject, or press → to continue..."
                    : loadedPgn
                      ? "Ask about the position or a specific move..."
                      : "Paste a PGN to start..."
                }
                className="
                  flex-1 min-h-11 max-h-48 resize-none rounded-xl
                  bg-zinc-800/50 border border-zinc-700/50 px-4 py-3
                  text-sm text-zinc-200 placeholder-zinc-500
                  focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50
                  transition-all duration-200
                "
                rows={1}
                disabled={isLoading}
              />
              {/* Continue button - right arrow, shows when there are more tool calls */}
              {hasMoreToolCalls && !isLoading && (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="
                    p-2 rounded-xl bg-amber-500 text-black
                    hover:bg-amber-400 transition-all duration-200
                    flex items-center justify-center
                  "
                  title="Continue"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              )}
              {/* Send button - up arrow */}
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="
                  px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300
                  hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200 flex items-center justify-center
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 7-7 7 7" />
                  <path d="M12 19V5" />
                </svg>
              </button>
            </div>
          </form>
        </>
      ) : (
        <ThoughtsPanel entries={scratchpadEntries} />
      )}
    </div>
  );
}
