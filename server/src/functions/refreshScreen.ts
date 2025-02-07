// src/functions/refreshScreen.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const refreshScreen: AIFunctionCall = {
  name: "refreshScreen",
  description: "Updates the screenshot.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: async (_args: any, _page: Page) => {
    // No operation
    return "Screenshot updated";
  },
};
