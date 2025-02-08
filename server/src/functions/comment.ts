/// src/functions/comment.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const comment: AIFunctionCall = {
  name: "comment",
  description: "Use this tool when user mention comment, note, explanation, or anything that does not require any action.",
  parameters: {
    type: "object",
    properties: {
    }
  },
  execute: async (_args: any, _page: Page) => {
    return "Comment stored.";
  },
};
