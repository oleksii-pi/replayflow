// server/src/functions/visitUrl.ts
import { AIFunctionCall } from "../domain/AIFunctionCall";
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
    const { url, _io } = args;

    async function sendScreenshot() {
      const screenshot = (await page.screenshot()).toString("base64");
      _io.emit("browser_screenshot", screenshot);
      return screenshot;
    }
    
    await page.goto(url);
    await page.waitForTimeout(500);
    await sendScreenshot();
    return `Visited ${url}`;
  },
};
