// src/functions/scrollPage.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

const VIEWPORT_WIDTH = 1000;
const VIEWPORT_HEIGHT = 800;

export const scrollPage: AIFunctionCall = {
  name: "scrollPage",
  description: `Scroll the content of the page, either vertically or horizontally, by the provided distance. The viewport is ${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT}.`,
  parameters: {
    type: "object",
    properties: {
      direction: {
        type: "string",
        description: "Either 'vertical' or 'horizontal'.",
      },
      distance: {
        type: "number",
        description:
          "Number of pixels to scroll in the specified direction. Positive values scroll down/right, and negative values scroll up/left.",
      },
    },
    required: ["direction", "distance"],
  },
  execute: async (args: any, page: Page) => {
    const { direction, distance } = args;

    let humanReadableMessage = "";

    try {
      // Optionally set the viewport if needed:
      // await page.setViewportSize({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

      const xScroll = direction === "horizontal" ? distance : 0;
      const yScroll = direction === "vertical" ? distance : 0;

      await page.evaluate(
        ({ x, y }) => {
          window.scrollBy(x, y);
        },
        { x: xScroll, y: yScroll }
      );

      humanReadableMessage = `Successfully scrolled the page ${distance}px ${direction}ly.\n\n`;
    } catch (error) {
      humanReadableMessage = `Failed to scroll the page.\n\n`;
    }

    return humanReadableMessage;
  },
};
