"use client";

import { create } from "zustand";
import { Chess, type Move, type Square } from "chess.js";
import type { MoveNode, Arrow, HighlightedSquare, ChatMessage } from "@/types/chess";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Exercise mode types
export interface ExerciseMode {
  active: boolean;
  expectedMove: string | null; // SAN notation of correct move
  positionFen: string | null; // FEN where exercise started
  question: string | null;
  hint?: string;
  answerExplanation: string | null;
}

interface GameStore {
  // Game tree state
  rootNode: MoveNode | null;
  currentNode: MoveNode | null;
  initialFen: string;

  // Board state
  currentFen: string;
  orientation: "white" | "black";
  arrows: Arrow[];
  highlights: HighlightedSquare[];

  // Chat state
  messages: ChatMessage[];

  // PGN metadata
  gameInfo: {
    white?: string;
    black?: string;
    event?: string;
    date?: string;
    result?: string;
  };

  // Exercise mode
  exerciseMode: ExerciseMode | null;
  onExerciseMove: ((moveSan: string, isCorrect: boolean) => void) | null;

  // Actions
  loadPgn: (pgn: string) => void;
  loadFen: (fen: string) => void;
  goToNode: (node: MoveNode) => void;
  goToMoveNumber: (moveNumber: number, color: "white" | "black", animate?: boolean) => void;
  goToStart: () => void;
  goToEnd: () => void;
  goForward: () => void;
  goBack: () => void;
  addSideline: (fromNode: MoveNode, move: Move) => MoveNode | null;
  addSidelineFromMoves: (fromMoveNumber: number, fromColor: "white" | "black", moves: string[]) => void;
  makeMove: (from: Square, to: Square, promotion?: string) => MoveNode | null;
  setOrientation: (orientation: "white" | "black") => void;
  flipBoard: () => void;
  setArrows: (arrows: Arrow[]) => void;
  setHighlights: (highlights: HighlightedSquare[]) => void;
  clearAnnotations: () => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  reset: () => void;
  promoteToMainline: () => void;
  truncateAfterCurrent: () => void;

  // Exercise mode actions
  setExerciseMode: (exercise: ExerciseMode | null) => void;
  clearExerciseMode: () => void;
  setOnExerciseMove: (callback: ((moveSan: string, isCorrect: boolean) => void) | null) => void;
}

function buildMoveTree(pgn: string): {
  rootNode: MoveNode | null;
  initialFen: string;
  gameInfo: GameStore["gameInfo"];
} {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch {
    return { rootNode: null, initialFen: chess.fen(), gameInfo: {} };
  }

  const header = chess.header();
  const gameInfo = {
    white: header.White ?? undefined,
    black: header.Black ?? undefined,
    event: header.Event ?? undefined,
    date: header.Date ?? undefined,
    result: header.Result ?? undefined,
  };

  const history = chess.history({ verbose: true });

  // Get the starting FEN - either from the PGN header or the standard starting position
  // If there's a FEN header in the PGN, use that; otherwise use the standard starting position
  const fenHeader = header.FEN;
  let initialFen: string;

  if (fenHeader) {
    // PGN has a custom starting position
    initialFen = fenHeader;
    chess.load(fenHeader);
  } else {
    // Standard starting position
    chess.reset();
    initialFen = chess.fen();
  }

  if (history.length === 0) {
    return { rootNode: null, initialFen, gameInfo };
  }

  let rootNode: MoveNode | null = null;
  let currentNode: MoveNode | null = null;

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    chess.move(move);

    const moveNumber = Math.floor(i / 2) + 1;
    const isBlack = i % 2 === 1;

    const newNode: MoveNode = {
      id: generateId(),
      move,
      fen: chess.fen(),
      san: move.san,
      moveNumber,
      isBlack,
      children: [],
      parent: currentNode,
    };

    if (currentNode) {
      currentNode.children.push(newNode);
    } else {
      rootNode = newNode;
    }

    currentNode = newNode;
  }

  return { rootNode, initialFen, gameInfo };
}

function getMainlineEnd(node: MoveNode | null): MoveNode | null {
  if (!node) return null;
  let current = node;
  while (current.children.length > 0) {
    current = current.children[0];
  }
  return current;
}

export const useGameStore = create<GameStore>((set, get) => ({
  rootNode: null,
  currentNode: null,
  initialFen: new Chess().fen(),
  currentFen: new Chess().fen(),
  orientation: "white",
  arrows: [],
  highlights: [],
  messages: [],
  gameInfo: {},
  exerciseMode: null,
  onExerciseMove: null,

  loadPgn: (pgn: string) => {
    const { rootNode, initialFen, gameInfo } = buildMoveTree(pgn);
    set({
      rootNode,
      currentNode: null,
      initialFen,
      currentFen: initialFen,
      gameInfo,
      arrows: [],
      highlights: [],
    });
  },

  loadFen: (fen: string) => {
    // Validate FEN by trying to load it
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      console.error("[GameStore] Invalid FEN:", fen);
      return;
    }

    // Clear the game tree and set the new position
    set({
      rootNode: null,
      currentNode: null,
      initialFen: fen,
      currentFen: fen,
      gameInfo: {},
      arrows: [],
      highlights: [],
    });
  },

  goToNode: (node: MoveNode) => {
    set({
      currentNode: node,
      currentFen: node.fen,
      arrows: [],
      highlights: [],
    });
  },

  goToMoveNumber: (moveNumber: number, color: "white" | "black", animate: boolean = true) => {
    const { rootNode, currentNode, initialFen } = get();
    if (!rootNode) return;

    // Find the target node
    const targetIsBlack = color === "black";
    let targetNode: MoveNode | null = null;
    let current: MoveNode | null = rootNode;

    while (current) {
      if (current.moveNumber === moveNumber && current.isBlack === targetIsBlack) {
        targetNode = current;
        break;
      }
      current = current.children.length > 0 ? current.children[0] : null;
    }

    if (!targetNode) return;

    // If not animating, just jump
    if (!animate) {
      set({
        currentNode: targetNode,
        currentFen: targetNode.fen,
        arrows: [],
        highlights: [],
      });
      return;
    }

    // Build path from root to target
    const pathToTarget: MoveNode[] = [];
    let node: MoveNode | null = targetNode;
    while (node) {
      pathToTarget.unshift(node);
      node = node.parent || null;
    }

    // Build path from root to current
    const pathToCurrent: MoveNode[] = [];
    node = currentNode;
    while (node) {
      pathToCurrent.unshift(node);
      node = node.parent || null;
    }

    // Find common ancestor and determine which nodes to animate through
    const currentIndex = pathToCurrent.length - 1;
    const targetIndex = pathToTarget.length - 1;

    // If going forward (target is ahead), animate forward
    // If going backward, go back then forward on new path
    let nodesToAnimate: MoveNode[] = [];

    if (targetIndex > currentIndex) {
      // Going forward - just animate from current to target
      const startFrom = currentIndex >= 0 ? currentIndex + 1 : 0;
      nodesToAnimate = pathToTarget.slice(startFrom);
    } else if (targetIndex < currentIndex) {
      // Going backward - first go to start, then forward to target
      // For simplicity, just animate forward from start
      set({ currentNode: null, currentFen: initialFen });
      nodesToAnimate = pathToTarget;
    } else {
      // Same level but different branch - go to common ancestor then forward
      set({ currentNode: null, currentFen: initialFen });
      nodesToAnimate = pathToTarget;
    }

    // Animate through nodes with delay
    if (nodesToAnimate.length === 0) {
      set({
        currentNode: targetNode,
        currentFen: targetNode.fen,
        arrows: [],
        highlights: [],
      });
      return;
    }

    const animateDelay = 250; // ms between moves
    nodesToAnimate.forEach((animNode, index) => {
      setTimeout(() => {
        set({
          currentNode: animNode,
          currentFen: animNode.fen,
          arrows: [],
          highlights: [],
        });
      }, index * animateDelay);
    });
  },

  goToStart: () => {
    const { initialFen } = get();
    set({
      currentNode: null,
      currentFen: initialFen,
      arrows: [],
      highlights: [],
    });
  },

  goToEnd: () => {
    const { rootNode } = get();
    const endNode = getMainlineEnd(rootNode);
    if (endNode) {
      set({
        currentNode: endNode,
        currentFen: endNode.fen,
        arrows: [],
        highlights: [],
      });
    }
  },

  goForward: () => {
    const { currentNode, rootNode } = get();
    if (!currentNode && rootNode) {
      set({
        currentNode: rootNode,
        currentFen: rootNode.fen,
        arrows: [],
        highlights: [],
      });
    } else if (currentNode && currentNode.children.length > 0) {
      const nextNode = currentNode.children[0];
      set({
        currentNode: nextNode,
        currentFen: nextNode.fen,
        arrows: [],
        highlights: [],
      });
    }
  },

  goBack: () => {
    const { currentNode, initialFen } = get();
    if (currentNode) {
      if (currentNode.parent) {
        set({
          currentNode: currentNode.parent,
          currentFen: currentNode.parent.fen,
          arrows: [],
          highlights: [],
        });
      } else {
        set({
          currentNode: null,
          currentFen: initialFen,
          arrows: [],
          highlights: [],
        });
      }
    }
  },

  addSideline: (fromNode: MoveNode, move: Move) => {
    const chess = new Chess(fromNode.parent?.fen || get().initialFen);

    try {
      const result = chess.move(move);
      if (!result) return null;

      const newNode: MoveNode = {
        id: generateId(),
        move: result,
        fen: chess.fen(),
        san: result.san,
        moveNumber: fromNode.moveNumber,
        isBlack: fromNode.isBlack,
        children: [],
        parent: fromNode.parent,
      };

      if (fromNode.parent) {
        fromNode.parent.children.push(newNode);
      }

      set({
        currentNode: newNode,
        currentFen: newNode.fen,
        arrows: [],
        highlights: [],
      });

      return newNode;
    } catch {
      return null;
    }
  },

  addSidelineFromMoves: (fromMoveNumber: number, fromColor: "white" | "black", moves: string[]) => {
    const { rootNode, initialFen } = get();
    if (!rootNode || moves.length === 0) return;

    // Find the parent node (the move before where we want to branch)
    const targetIsBlack = fromColor === "black";
    let parentNode: MoveNode | null = null;
    let branchPoint: MoveNode | null = null;
    let current: MoveNode | null = rootNode;

    // Find the node at the branch point
    while (current) {
      if (current.moveNumber === fromMoveNumber && current.isBlack === targetIsBlack) {
        branchPoint = current;
        parentNode = current.parent;
        break;
      }
      current = current.children.length > 0 ? current.children[0] : null;
    }

    if (!branchPoint) return;

    // Get the FEN from the parent (position before the move we're replacing)
    const startFen = parentNode?.fen || initialFen;
    const chess = new Chess(startFen);

    // Build the sideline
    let lastNode: MoveNode | null = null;
    let sidelineStart: MoveNode | null = null;

    for (let i = 0; i < moves.length; i++) {
      try {
        const result = chess.move(moves[i]);
        if (!result) break;

        const moveIdx = i;
        const baseMove = branchPoint.isBlack ? 0 : 1; // Adjust for which side starts
        const moveNumber = branchPoint.moveNumber + Math.floor((moveIdx + baseMove) / 2);
        const isBlack = (moveIdx + (branchPoint.isBlack ? 1 : 0)) % 2 === 1;

        const newNode: MoveNode = {
          id: generateId(),
          move: result,
          fen: chess.fen(),
          san: result.san,
          moveNumber,
          isBlack,
          children: [],
          parent: lastNode || parentNode,
        };

        if (!sidelineStart) {
          sidelineStart = newNode;
          // Add to parent's children
          if (parentNode) {
            parentNode.children.push(newNode);
          }
        } else if (lastNode) {
          lastNode.children.push(newNode);
        }

        lastNode = newNode;
      } catch {
        break;
      }
    }

    // Navigate to the end of the sideline
    if (lastNode) {
      set({
        currentNode: lastNode,
        currentFen: lastNode.fen,
        arrows: [],
        highlights: [],
      });
    }
  },

  makeMove: (from: Square, to: Square, promotion?: string) => {
    const { currentNode, currentFen, rootNode } = get();
    const chess = new Chess(currentFen);

    try {
      const move = chess.move({ from, to, promotion });
      if (!move) return null;

      const moveNumber = currentNode
        ? (currentNode.isBlack ? currentNode.moveNumber + 1 : currentNode.moveNumber)
        : 1;
      const isBlack = currentNode ? !currentNode.isBlack : false;

      const newNode: MoveNode = {
        id: generateId(),
        move,
        fen: chess.fen(),
        san: move.san,
        moveNumber,
        isBlack,
        children: [],
        parent: currentNode,
      };

      if (currentNode) {
        // Check if this move already exists as a child
        const existingChild = currentNode.children.find(
          child => child.san === move.san
        );
        if (existingChild) {
          set({
            currentNode: existingChild,
            currentFen: existingChild.fen,
          });
          return existingChild;
        }
        // Add to children array
        currentNode.children.push(newNode);
        // Force Zustand to detect the change by creating a new root reference
        // We do this by creating a shallow clone of the rootNode object
        const updatedRoot = rootNode ? { ...rootNode } : null;
        set({
          rootNode: updatedRoot,
          currentNode: newNode,
          currentFen: newNode.fen,
          arrows: [],
          highlights: [],
        });
      } else {
        // This is the first move
        if (rootNode && rootNode.san === move.san) {
          set({
            currentNode: rootNode,
            currentFen: rootNode.fen,
          });
          return rootNode;
        }
        // Create new root
        set({
          rootNode: newNode,
          currentNode: newNode,
          currentFen: newNode.fen,
          arrows: [],
          highlights: [],
        });
      }

      return newNode;
    } catch {
      return null;
    }
  },

  setOrientation: (orientation: "white" | "black") => {
    set({ orientation });
  },

  flipBoard: () => {
    set((state) => ({
      orientation: state.orientation === "white" ? "black" : "white",
    }));
  },

  setArrows: (arrows: Arrow[]) => {
    set({ arrows });
  },

  setHighlights: (highlights: HighlightedSquare[]) => {
    set({ highlights });
  },

  clearAnnotations: () => {
    set({ arrows: [], highlights: [] });
  },

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  reset: () => {
    const initialFen = new Chess().fen();
    set({
      rootNode: null,
      currentNode: null,
      initialFen,
      currentFen: initialFen,
      orientation: "white",
      arrows: [],
      highlights: [],
      messages: [],
      gameInfo: {},
    });
  },

  promoteToMainline: () => {
    const { currentNode, rootNode } = get();
    if (!currentNode || !rootNode) return;

    // Walk up from currentNode to root, making each node the first child of its parent
    let node: MoveNode | null = currentNode;
    while (node && node.parent) {
      const parentNode: MoveNode = node.parent;
      const index = parentNode.children.indexOf(node);
      if (index > 0) {
        // Move this node to be the first child (main line)
        parentNode.children.splice(index, 1);
        parentNode.children.unshift(node);
      }
      node = parentNode;
    }

    // Force re-render by creating a shallow clone
    set({ rootNode: { ...rootNode } });
  },

  truncateAfterCurrent: () => {
    const { currentNode, rootNode } = get();
    if (!rootNode) return;

    if (!currentNode) {
      // At starting position - clear everything
      const initialFen = new Chess().fen();
      set({
        rootNode: null,
        currentNode: null,
        currentFen: initialFen,
        arrows: [],
        highlights: [],
      });
      return;
    }

    // First, promote current line to mainline (handles nested sidelines)
    let node: MoveNode | null = currentNode;
    while (node && node.parent) {
      const parentNode: MoveNode = node.parent;
      const index = parentNode.children.indexOf(node);
      if (index > 0) {
        // Move this node to be the first child (main line)
        parentNode.children.splice(index, 1);
        parentNode.children.unshift(node);
      }
      // Remove all other sidelines at this level
      parentNode.children = [node];
      node = parentNode;
    }

    // Remove all children of current node (truncate after)
    currentNode.children = [];

    // Force re-render by creating a shallow clone
    set({ rootNode: { ...rootNode } });
  },

  // Exercise mode actions
  setExerciseMode: (exercise: ExerciseMode | null) => {
    set({ exerciseMode: exercise });
  },

  clearExerciseMode: () => {
    set({ exerciseMode: null, onExerciseMove: null });
  },

  setOnExerciseMove: (callback: ((moveSan: string, isCorrect: boolean) => void) | null) => {
    set({ onExerciseMove: callback });
  },
}));
