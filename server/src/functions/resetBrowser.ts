// src/functions/resetBrowser.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";
import { resetBrowser as reset } from "../browser";

export const resetBrowser: AIFunctionCall = {
  name: "resetBrowser",
  description:
    "Reset browser cookies, storage, and other data, but keep the same Page object alive",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: async (_args: any, _page: Page) => {
    await reset();
    return "Browser state was reset.";
  },
};
