// src/functions/check.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";
import { simpleClaudeApi } from "../services/claudeApi";

/**
 * This function attempts to confirm that the user’s request
 * (e.g. "Check that there are no validation errors", "Is there a button labeled 'Sign In'?")
 * is satisfied based on a screenshot analysis. If the check passes, the response should be "Ok".
 * If it is not, respond with a short message "Check failed. This is not true."
 */
const checkPrompt = `
Analyze the screenshot. Check if the requirement in the user message is fulfilled.
If it is, respond only with the text "Ok". If it is not, respond with a short message "Check failed. This is not true.".
Answer based on user request:
`;

export const check: AIFunctionCall = {
  name: "check",
  description:
    "Verifies if a user-specified check is satisfied in the current page screenshot. Returns 'Ok' if so.",
  systemMessageExtension:
    "Only use when user use one of: confirm, validate, check, assert, ensure, verify.",
  parameters: {
    type: "object",
    properties: {
    },
    required: [],
  },
  execute: async (args: any, page: Page) => {
    try {
      const { _messages } = args;
      const userMessage = _messages[_messages.length - 1];
      const screenshotBuffer = await page.screenshot();
      const imageBase64 = screenshotBuffer.toString("base64");

      const aiResponse = await simpleClaudeApi(checkPrompt + userMessage, [
        imageBase64,
      ]);

      return aiResponse;
    } catch (error: any) {
      console.error("Error checking page:", error);
      throw new Error("Failed to complete check.");
    }
  },
};
