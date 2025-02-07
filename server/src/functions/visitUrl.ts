// src/functions/visitUrl.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const visitUrl: AIFunctionCall = {
  name: "visitUrl",
  description: "Visit a specific URL",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to visit" },
    },
    required: ["url"],
  },
  execute: async (args: any, page: Page) => {
    const { url } = args;
    await page.goto(url);
    return `Visited ${url}`;
  },
};
