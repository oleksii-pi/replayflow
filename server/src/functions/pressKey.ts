/// src/functions/pressKey.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const pressKey: AIFunctionCall = {
  name: "pressKey",
  description:
    "Simulate pressing a key on the currently focused element (e.g. Enter, Tab, Escape, etc.)",
  parameters: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "The key to press (for example 'Enter', 'Tab', 'Escape')",
      },
    },
    required: ["key"],
  },
  execute: async (args: any, page: Page) => {
    const { key } = args;

    let humanReadableMessage = "";

    try {
      await page.keyboard.press(key);
      humanReadableMessage = `Successfully pressed key "${key}" on the currently focused element.\n\n`;
    } catch (error) {
      humanReadableMessage = `Failed to press key "${key}" on the currently focused element.\n\n`;
    }

    return humanReadableMessage;
  },
};
