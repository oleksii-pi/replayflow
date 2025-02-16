// src/services/claudeApi.ts
import Anthropic from "@anthropic-ai/sdk";
import { ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources";
import { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";

const configuration = {
  apiKey: process.env.ANTHROPIC_API_KEY,
};

console.log(
  "Anthropic API Key:",
  configuration.apiKey?.substring(0, 4) + "..."
);

export const anthropicApi = new Anthropic(configuration);

export const simpleClaudeApi = async (
  message: string,
  imageBase64Array: string[] = [],
  answerJson?: boolean
): Promise<string> => {
  console.log("simpleClaudeApi:");
  console.log(
    "\x1b[32m%s\x1b[0m", // Green color
    message
  );

  const imageMessages: ImageBlockParam[] = imageBase64Array.map((image) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: "image/png", // Playwright screenshots are PNG by default
      data: image,
    },
  }));

  const content: (TextBlockParam | ImageBlockParam)[] = [
    {
      type: "text",
      text: message,
    },
    ...imageMessages,
  ];

  const startTime = Date.now();

  try {
    const messageConfig: MessageCreateParamsNonStreaming = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024 * 8,
      system: answerJson ? "Answer as a valid JSON string. Do not include any additional text or explanation." : undefined,
      messages: [
        {
          role: "user",
          content: content,
        },
      ]
    };

    console.log("messageConfig:");
    console.log(
      "\x1b[32m%s\x1b[0m", // Green color
      messageConfig
    );

    const response = await anthropicApi.messages.create(messageConfig);

    const answer =
      response.content
        ?.filter((b) => b.type === "text")
        .map((block) => block.text)
        .join("") ?? "No response available.";
    console.log("Claude answer:");
    console.log(
      "\x1b[33m%s\x1b[0m", // Yellow color
      answer
    );
    console.log("Claude usage:");
    console.log(
      "\x1b[34m%s\x1b[0m", // Blue color
      response.usage
    );

    const endTime = Date.now();
    console.log(`simpleClaudeApi execution time: ${endTime - startTime} ms`);

    return answer;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    throw error;
  }
};
