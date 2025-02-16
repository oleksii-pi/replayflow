// server/src/functions/resetBrowser.ts
import { AIFunctionCall } from "../domain/AIFunctionCall";
import { Page } from "playwright";
import { resetBrowser as reset } from "../browser";

export const resetBrowser: AIFunctionCall = {
  name: "resetBrowser",
  description:
    "Reset browser to initial state.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: async (_args: any, _page: Page) => {
    await reset();
    return "Browser state was reset.";
  },
};
