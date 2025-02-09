/// src/functions/comment.ts
import { ChatCompletionMessageParam } from "openai/resources";
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const comment: AIFunctionCall = {
  name: "comment",
  systemMessageExtension: "Use this tool when user mention explicitly words `comment` or `note`.",
  description: "Use this tool when user mention explicitly words `comment` or `note`.",
  parameters: {
    type: "object",
    properties: {
    }
  },
  execute: async (args: any, _page: Page) => {
    const { _messages } = args as {
      _messages: ChatCompletionMessageParam[];
    };
    const comment = _messages[_messages.length - 1].content as string;
    return "Comment stored: " + comment;
  },
};
