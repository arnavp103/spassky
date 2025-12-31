import type { Square, Move, Color, PieceSymbol } from "chess.js";

export interface MoveNode {
  id: string;
  move: Move;
  fen: string;
  san: string;
  moveNumber: number;
  isBlack: boolean;
  comment?: string;
  children: MoveNode[];
  parent: MoveNode | null;
}

export interface GameState {
  rootNode: MoveNode | null;
  currentNode: MoveNode | null;
  initialFen: string;
}

export interface ChessPiece {
  type: PieceSymbol;
  color: Color;
  square: Square;
}

export interface Arrow {
  from: Square;
  to: Square;
  color?: string;
}

export interface HighlightedSquare {
  square: Square;
  color?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  annotations?: {
    fen?: string;
    arrows?: Arrow[];
    highlights?: HighlightedSquare[];
  };
}
