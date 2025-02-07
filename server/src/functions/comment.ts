/// src/functions/comment.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const comment: AIFunctionCall = {
  name: "comment",
  description: "This function does nothing but returns 'Comment stored'.",
  parameters: {
    type: "object",
    properties: {
      commentText: {
        type: "string",
        description: "Optional text to include in the comment (not used).",
      },
    },
    required: [],
  },
  execute: async (_args: any, _page: Page) => {
    return "Comment stored.";
  },
};
