import { z } from "zod";

// Types for context passed to the agent
export interface AgentContext {
  currentFen?: string;
  gameInfo?: { white?: string; black?: string };
  pgn?: string;
  stockfishEval?: {
    score: number | null;
    mate: number | null;
    bestMove: string | null;
    depth: number;
    pv?: string[];
  };
}

// Logger utility
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(`[SPASSKY] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  },
  tool: (toolName: string, input: unknown) => {
    console.log(`[SPASSKY] Tool called: ${toolName}`, JSON.stringify(input, null, 2));
  },
  error: (message: string, error?: unknown) => {
    console.error(`[SPASSKY ERROR] ${message}`, error);
  },
  request: (context: AgentContext) => {
    console.log(`[SPASSKY] Request received:`, {
      hasPgn: !!context.pgn,
      hasFen: !!context.currentFen,
      hasEval: !!context.stockfishEval,
      gameInfo: context.gameInfo,
    });
  },
};

// Generate the system prompt based on context
export function buildSystemPrompt(context: AgentContext): string {
  const { pgn, currentFen, gameInfo, stockfishEval } = context;

  return `You are Spassky, a warm and knowledgeable chess coach. You're walking through chess content with your student, who sees the lesson progressively as you teach.

CURRENT CONTEXT:
${pgn ? `Game PGN: ${pgn}` : "No game loaded yet"}
${currentFen ? `Current position (FEN): ${currentFen}` : "Starting position"}
${gameInfo?.white ? `White: ${gameInfo.white}` : ""}
${gameInfo?.black ? `Black: ${gameInfo.black}` : ""}
${stockfishEval ? `Engine eval available at depth ${stockfishEval.depth}` : ""}

CORE PRINCIPLE: You MUST call tools, not describe calling them.
- Wrong: "Let me show you move 5..." then explain without calling jumpToMove
- Right: Call jumpToMove(5, "white") THEN explain what you see

====== TEACHING MODES ======

## MODE 1: OPENING STUDY (Berlin Wall, Open Sicilian, etc.)

When teaching an opening, you are an INTERACTIVE COACH. The student will make moves and you respond to them, walking them through the theory branches.

**How opening study works:**
1. Start by explaining the opening's character and strategic ideas
2. Use setPosition to set up the starting position (usually after move 5-8 of mainline)
3. Explain the key ideas and typical plans for both sides
4. Use askExercise to have the student play the next move
5. When they play, respond with [OPENING_MOVE] to explain their choice:
   - If it's mainline theory: praise and explain why it's good, then continue
   - If it's a sideline: explain the move, show the resulting position, compare to mainline
   - If it's a mistake: explain why it's inaccurate, use proposeSideline to show the better line
6. Continue walking through branches based on their moves

**Key tools for openings:**
- setPosition: Jump to a FEN position (use for starting positions)
- proposeSideline: Show alternative variations and their consequences
- askExercise: Let student choose the next move
- drawArrows: Show piece placement ideas, pawn breaks

## MODE 2: ENDGAME STUDY (Lucena Position, etc.)

When teaching an endgame:
1. Use setPosition to load the FEN position directly
2. Explain the win/draw technique step by step
3. Use askExercise to test key moves
4. Show the full technique with clear explanations

**Lucena Position specifics:**
- The goal is to "build a bridge" - use the rook to shield the king from checks
- Key moves: Rd1+, Kc7, Rd4 (the bridge), then Kc6/b6 and Re4+ shielding

## MODE 3: GAME ANALYSIS (Kasparov games, etc.)

Give a COMPLETE lesson in one response:

1. **Opening Context** (brief)
   - Jump to where the opening is set up (around move 5-8)
   - Name the opening, give 1-2 sentences of context

2. **Key Moments** (the meat of the lesson)
   - Select 3-5 critical positions to discuss
   - For each: jumpToMove, explain the position, use drawArrows/highlightSquares
   - Use proposeSideline to show alternatives

3. **Conclusion**
   - Jump to final position
   - Summarize what we learned

====== TOOLS ======

- jumpToMove: Navigate to positions in a loaded PGN
- setPosition: Load a specific FEN position directly (use for endgames and custom positions)
- drawArrows: Show attacks, threats, plans (green=good, red=threat, yellow=idea, blue=alternative)
- highlightSquares: Mark weak squares, outposts, key squares
- proposeSideline: Show "what should have been played" or alternative variations
- askExercise: Pose puzzles - student plays answer on board
- getAnalysis: Get engine eval (explain ideas, don't just quote numbers)
- scratchpad: Private notes (student sees in 'Thoughts' tab)

====== RESPONDING TO USER INPUT ======

**Questions during lesson:**
If you see [POSITION: move X, color], they're asking about that specific position - jump there and address their question.

**Exercise responses:**
When you see [EXERCISE_RESPONSE]:
- If correct: Celebrate! Show why it works with arrows, then continue
- If incorrect: Be encouraging, show why their move doesn't work, reveal the answer

**Opening move responses:**
When you see [OPENING_MOVE], the student played a move during opening study - analyze it and guide them through the theory.

STYLE:
- Conversational and warm
- Use **markdown** for emphasis
- Ask rhetorical questions: "See how the knight is eyeing d5?"
- Be thorough on tactics, brief on routine moves`;
}

// Define all available tools
export const tools = {
  jumpToMove: {
    description: "Navigate to a specific move in a loaded PGN game. Always call this before discussing a position in game analysis.",
    inputSchema: z.object({
      moveNumber: z.number().describe("The move number (e.g., 7 for move 7)"),
      color: z.enum(["white", "black"]).describe("Which side's move"),
    }),
  },

  setPosition: {
    description: "Set the board to a specific FEN position. Use this for endgame studies or to jump directly to a position without needing a full PGN. This clears any existing game and loads the new position.",
    inputSchema: z.object({
      fen: z.string().describe("The FEN string for the position (e.g., '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1')"),
      description: z.string().optional().describe("Optional description of the position for context"),
    }),
  },

  drawArrows: {
    description: "Draw arrows on the board to visualize attacks, threats, plans, or piece relationships.",
    inputSchema: z.object({
      arrows: z.array(
        z.object({
          from: z.string().describe("Starting square (e.g., 'e2')"),
          to: z.string().describe("Ending square (e.g., 'e4')"),
          color: z
            .enum(["green", "red", "yellow", "blue"])
            .default("green")
            .describe("green=good/plan, red=threat/attack, yellow=idea, blue=alternative"),
        })
      ),
    }),
  },

  highlightSquares: {
    description: "Highlight squares to show weak points, outposts, or key squares.",
    inputSchema: z.object({
      squares: z.array(z.string()).describe("Squares to highlight (e.g., ['e4', 'd5'])"),
      color: z.enum(["green", "red", "yellow", "blue"]).default("yellow"),
    }),
  },

  proposeSideline: {
    description: "Show an alternative line of moves. Use when demonstrating 'what should have been played' or exploring variations.",
    inputSchema: z.object({
      fromMoveNumber: z.number().describe("Move number where the sideline branches"),
      fromColor: z.enum(["white", "black"]).describe("Which side's move we're replacing"),
      moves: z.array(z.string()).describe("Alternative moves in SAN (e.g., ['Nxd5', 'exd5', 'Bb5+'])"),
      explanation: z.string().describe("Why this line is interesting or better"),
    }),
  },

  askExercise: {
    description: "Pose a 'find the best move' exercise. The student will play their answer on the board.",
    inputSchema: z.object({
      question: z.string().describe("The question (e.g., 'What would you play here as White?')"),
      hint: z.string().optional().describe("Optional hint"),
      answerMove: z.string().describe("Correct move in SAN notation"),
      answerExplanation: z.string().describe("Why this is best"),
    }),
  },

  clearAnnotations: {
    description: "Clear all arrows and highlights from the board.",
    inputSchema: z.object({}),
  },

  getAnalysis: {
    description: "Get engine evaluation for the current position. Use to verify your analysis, but explain ideas rather than just quoting engine lines.",
    inputSchema: z.object({
      reason: z.string().optional().describe("Why you need analysis"),
    }),
  },

  scratchpad: {
    description: "Your private thinking space. Use to work through calculations before presenting them. The student can see this in a 'Thoughts' tab.",
    inputSchema: z.object({
      thought: z.string().describe("Your analysis or notes"),
      analyzeMoves: z.array(z.string()).optional().describe("Lines you're calculating"),
    }),
  },

  waitForUser: {
    description: "Pause to let the student absorb the position. Use sparingly at natural break points - after opening setup, before revealing tactics, between major sections. Don't overuse.",
    inputSchema: z.object({
      prompt: z.string().optional().describe("Optional prompt like 'Ready to see the key move?'"),
    }),
  },
};

// Tool input types for type safety
export type JumpToMoveInput = z.infer<typeof tools.jumpToMove.inputSchema>;
export type SetPositionInput = z.infer<typeof tools.setPosition.inputSchema>;
export type DrawArrowsInput = z.infer<typeof tools.drawArrows.inputSchema>;
export type HighlightSquaresInput = z.infer<typeof tools.highlightSquares.inputSchema>;
export type ProposeSidelineInput = z.infer<typeof tools.proposeSideline.inputSchema>;
export type AskExerciseInput = z.infer<typeof tools.askExercise.inputSchema>;
export type GetAnalysisInput = z.infer<typeof tools.getAnalysis.inputSchema>;
export type ScratchpadInput = z.infer<typeof tools.scratchpad.inputSchema>;
export type WaitForUserInput = z.infer<typeof tools.waitForUser.inputSchema>;
