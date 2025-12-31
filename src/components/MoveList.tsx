"use client";

import { useGameStore } from "@/stores/gameStore";
import type { MoveNode } from "@/types/chess";
import { useCallback, useEffect, useRef, Fragment } from "react";

interface MoveButtonProps {
  node: MoveNode;
  isCurrentNode: boolean;
  onClick: () => void;
  showMoveNumber?: boolean;
}

function MoveButton({ node, isCurrentNode, onClick, showMoveNumber = false }: MoveButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Scroll into view when this becomes the current move
  useEffect(() => {
    if (isCurrentNode) {
      buttonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isCurrentNode]);

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`
        px-1.5 py-0.5 rounded text-sm font-mono transition-all duration-150
        ${isCurrentNode
          ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
          : "text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100"
        }
      `}
    >
      {showMoveNumber && (
        <span className="text-zinc-500 mr-1">
          {node.moveNumber}.{node.isBlack ? ".." : ""}
        </span>
      )}
      {node.san}
    </button>
  );
}

interface SidelineProps {
  node: MoveNode;
  currentNode: MoveNode | null;
  onNodeClick: (node: MoveNode) => void;
  depth: number;
}

function Sideline({ node, currentNode, onNodeClick, depth }: SidelineProps) {
  return (
    <div
      className={`
        mt-1 pl-3 border-l-2 border-zinc-700/50 ml-2
        ${depth > 0 ? "text-xs" : "text-sm"}
      `}
    >
      <span className="text-zinc-600 mr-1 text-xs">(</span>
      <MoveLineRenderer
        startNode={node}
        currentNode={currentNode}
        onNodeClick={onNodeClick}
        depth={depth + 1}
        isFirstMove={true}
      />
      <span className="text-zinc-600 ml-1 text-xs">)</span>
    </div>
  );
}

interface MoveLineRendererProps {
  startNode: MoveNode;
  currentNode: MoveNode | null;
  onNodeClick: (node: MoveNode) => void;
  depth?: number;
  isFirstMove?: boolean;
}

function MoveLineRenderer({
  startNode,
  currentNode,
  onNodeClick,
  depth = 0,
  isFirstMove = false,
}: MoveLineRendererProps) {
  const elements: React.ReactNode[] = [];
  let current: MoveNode | null = startNode;
  let isFirst = isFirstMove;

  while (current) {
    const node: MoveNode = current;
    const isCurrentNode = currentNode?.id === node.id;

    // Show move number for white moves or at the start
    const showNumber = !node.isBlack || isFirst;

    elements.push(
      <span key={node.id} className="inline-flex items-baseline">
        <MoveButton
          node={node}
          isCurrentNode={isCurrentNode}
          onClick={() => onNodeClick(node)}
          showMoveNumber={showNumber}
        />
      </span>
    );

    // Check for sidelines (alternative moves)
    if (node.children.length > 1) {
      // Render sidelines (all children except the main line)
      for (let i = 1; i < node.children.length; i++) {
        elements.push(
          <Sideline
            key={`sideline-${node.id}-${i}`}
            node={node.children[i]}
            currentNode={currentNode}
            onNodeClick={onNodeClick}
            depth={depth}
          />
        );
      }
    }

    // Move to main line continuation
    current = node.children.length > 0 ? node.children[0] : null;
    isFirst = false;
  }

  return <span className="inline flex-wrap gap-0.5">{elements}</span>;
}

export function MoveList() {
  const { rootNode, currentNode, goToNode, goToStart, gameInfo, reset, promoteToMainline, truncateAfterCurrent } = useGameStore();

  const handleNodeClick = useCallback(
    (node: MoveNode) => {
      goToNode(node);
    },
    [goToNode]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header with game info */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide uppercase">
            Moves
          </h2>
          {rootNode && (
            <div className="flex gap-1">
              <button
                onClick={truncateAfterCurrent}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Truncate after current move"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                </svg>
              </button>
              <button
                onClick={reset}
                className="p-1.5 rounded hover:bg-red-900/50 text-zinc-500 hover:text-red-400 transition-colors"
                title="Clear all moves"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {(gameInfo.white || gameInfo.black) && (
          <div className="mt-2 text-xs text-zinc-400">
            {gameInfo.white && gameInfo.black ? (
              <>
                <span className="text-zinc-300">{gameInfo.white}</span>
                <span className="mx-2">vs</span>
                <span className="text-zinc-300">{gameInfo.black}</span>
              </>
            ) : (
              gameInfo.white || gameInfo.black
            )}
            {gameInfo.result && (
              <span className="ml-2 text-zinc-500">({gameInfo.result})</span>
            )}
          </div>
        )}
        {gameInfo.event && (
          <div className="mt-1 text-xs text-zinc-500">{gameInfo.event}</div>
        )}
      </div>

      {/* Move list */}
      <div className="flex-1 overflow-y-auto p-4">
        {rootNode ? (
          <div className="leading-relaxed">
            <button
              onClick={goToStart}
              className={`
                text-xs px-2 py-1 rounded mb-2 transition-colors
                ${!currentNode
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }
              `}
            >
              Start
            </button>
            <div className="mt-2">
              <MoveLineRenderer
                startNode={rootNode}
                currentNode={currentNode}
                onNodeClick={handleNodeClick}
                isFirstMove={true}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-zinc-500 text-sm">No game loaded</div>
            <div className="text-zinc-600 text-xs mt-2">
              Paste a PGN in the chat to begin analysis
            </div>
          </div>
        )}
      </div>

      {/* Position info footer */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {currentNode ? (
              <>
                Move {currentNode.moveNumber}
                {currentNode.isBlack ? "..." : "."} {currentNode.san}
              </>
            ) : (
              "Starting position"
            )}
          </span>
          {rootNode && (
            <span>
              {countTotalMoves(rootNode)} moves
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function countTotalMoves(node: MoveNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countTotalMoves(child);
  }
  return count;
}
