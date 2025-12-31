"use client";

import { useMemo } from "react";
import { marked } from "marked";

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Chess move regex pattern - matches moves like "1. e4", "1... e5", "Nf3", "Bxc6+", etc.
const CHESS_MOVE_PATTERN = /\b(\d+\.{1,3}\s*)?([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O-O|O-O)\b/g;

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

// Parse text to extract chess moves and make them clickable
function parseChessMoves(
  text: string,
  onMoveClick: (moveNumber: number, color: "white" | "black") => void
): React.ReactNode[] {
  // Decode HTML entities first
  const decodedText = typeof document !== "undefined" ? decodeHtmlEntities(text) : text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  // Track last seen move number for sequential moves (e.g., "1. e4 e5")
  let lastMoveNumber: number | null = null;
  let lastColor: "white" | "black" = "white";

  // Reset regex state
  CHESS_MOVE_PATTERN.lastIndex = 0;

  while ((match = CHESS_MOVE_PATTERN.exec(decodedText)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(decodedText.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const moveNumberPart = match[1]; // e.g., "3." or "3..."
    // match[2] is the SAN notation (e.g., "Bc4")

    // Parse move number and color
    let moveNumber: number | null = null;
    let color: "white" | "black" = "white";

    if (moveNumberPart) {
      const numMatch = moveNumberPart.match(/(\d+)/);
      if (numMatch) {
        moveNumber = parseInt(numMatch[1], 10);
        // "..." indicates black's move
        color = moveNumberPart.includes("...") ? "black" : "white";
        lastMoveNumber = moveNumber;
        lastColor = color;
      }
    } else if (lastMoveNumber !== null) {
      // No move number prefix - infer from last move
      // If last was white's move, this is black's move in same number
      // If last was black's move, this is white's next move
      if (lastColor === "white") {
        moveNumber = lastMoveNumber;
        color = "black";
        lastColor = "black";
      } else {
        moveNumber = lastMoveNumber + 1;
        color = "white";
        lastMoveNumber = moveNumber;
        lastColor = "white";
      }
    }

    // Create clickable move button
    if (moveNumber !== null) {
      parts.push(
        <button
          key={`move-${key++}`}
          onClick={() => onMoveClick(moveNumber!, color)}
          className="px-1 py-0.5 rounded text-sm font-mono transition-all duration-150 text-amber-300 hover:bg-amber-500/20 hover:ring-1 hover:ring-amber-500/40 mx-0.5"
        >
          {fullMatch}
        </button>
      );
    } else {
      // Move without number context - just style it but don't make clickable
      parts.push(
        <span key={`move-${key++}`} className="font-mono text-zinc-200">
          {fullMatch}
        </span>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < decodedText.length) {
    parts.push(decodedText.slice(lastIndex));
  }

  return parts;
}

interface MarkdownContentProps {
  content: string;
  onMoveClick?: (moveNumber: number, color: "white" | "black") => void;
}

export function MarkdownContent({ content, onMoveClick }: MarkdownContentProps) {
  const processedContent = useMemo(() => {
    // First parse markdown to HTML
    const html = marked.parse(content) as string;

    // If no move click handler, just return the HTML
    if (!onMoveClick) {
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }

    // For content with move handler, we need to process text nodes
    // We'll do a simpler approach: split by HTML tags and process text between them
    const tagPattern = /(<[^>]+>)/g;
    const segments = html.split(tagPattern);

    return (
      <>
        {segments.map((segment, i) => {
          if (segment.startsWith("<")) {
            // HTML tag - render as-is
            return <span key={i} dangerouslySetInnerHTML={{ __html: segment }} />;
          } else if (segment.trim()) {
            // Text content - parse for chess moves
            return <span key={i}>{parseChessMoves(segment, onMoveClick)}</span>;
          }
          return segment;
        })}
      </>
    );
  }, [content, onMoveClick]);

  return (
    <div
      className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-li:my-0 prose-strong:text-amber-300 [&_br]:block [&_br]:my-1"
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {processedContent}
    </div>
  );
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  onMoveClick?: (moveNumber: number, color: "white" | "black") => void;
}

export function ChatMessage({ role, content, onMoveClick }: ChatMessageProps) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[90%] rounded-2xl px-4 py-3 text-sm
          ${role === "user"
            ? "bg-amber-500/20 text-amber-100"
            : "bg-zinc-800/70 text-zinc-200"}
        `}
      >
        {role === "assistant" ? (
          <MarkdownContent content={content} onMoveClick={onMoveClick} />
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        )}
      </div>
    </div>
  );
}
