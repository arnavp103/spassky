import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { buildSystemPrompt, tools, logger, type AgentContext } from "./agent";

export const maxDuration = 60;

export async function POST(req: Request) {
  const context: AgentContext & { messages: UIMessage[] } = await req.json();
  const { messages } = context;

  // Log incoming request
  logger.request(context);

  // Build system prompt with current context
  const systemPrompt = buildSystemPrompt(context);

  logger.info("Starting stream", {
    messageCount: messages.length,
    lastMessageRole: messages[messages.length - 1]?.role,
  });

  try {
    const result = streamText({
      //! don't change the model
      model: google("gemini-flash-latest"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      onStepFinish: (step) => {
        // Log each step as it finishes
        if (step.toolCalls && step.toolCalls.length > 0) {
          step.toolCalls.forEach((tc) => {
            logger.tool(tc.toolName, "input" in tc ? tc.input : tc);
          });
        }
      },
    });

    logger.info("Stream created successfully");
    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("Failed to create stream", error);
    throw error;
  }
}
