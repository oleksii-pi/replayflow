// src/functions/describeWhatYouSee.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";
import { simpleClaudeApi } from "../services/claudeApi";

const describeImagePrompt = `
Answer the user's question based on the web page screenshot in a concise manner. 
Keeping your answer brief and straightforward if the information is clear.

User message:
`;

export const describeWhatYouSee: AIFunctionCall = {
  name: "describeWhatYouSee",
  description:
    "Describes what's on the page and answer user question if needed.",
  parameters: {
    type: "object",
    properties: {
      userMessage: { type: "string", description: "The last user message" },
    },
    required: ["userMessage"],
  },
  execute: async (args: any, page: Page) => {
    try {
      const { userMessage } = args;
      const screenshotBuffer = await page.screenshot();
      const imageBase64 = screenshotBuffer.toString("base64");

      const aiResponse = await simpleClaudeApi(
        describeImagePrompt + userMessage,
        [imageBase64]
      );

      return aiResponse;
    } catch (error: any) {
      console.error("Error describing screenshot:", error);
      throw new Error("Failed to describe screenshot.");
    }
  },
};
