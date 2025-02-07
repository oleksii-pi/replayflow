// src/functions/clickCoordinates.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const clickCoordinates: AIFunctionCall = {
  name: "clickCoordinates",
  description: "Click at specific x, y coordinates on the page",
  parameters: {
    type: "object",
    properties: {
      x: {
        type: "number",
        description: "The x-coordinate to click.",
      },
      y: {
        type: "number",
        description: "The y-coordinate to click.",
      },
    },
    required: ["x", "y"],
  },
  execute: async (args: any, page: Page) => {
    const { x, y } = args;

    let humanReadableMessage = "";

    try {
      // Perform the click action
      await page.mouse.click(x, y);

      // Display a circle at the click position
      await page.evaluate(
        ({ x, y }) => {
          const circleRadius = 8;
          const circle = document.createElement("div");
          circle.style.position = "absolute";
          circle.style.left = `${x - circleRadius}px`;
          circle.style.top = `${y - circleRadius}px`;
          circle.style.width = `${circleRadius * 2}px`;
          circle.style.height = `${circleRadius * 2}px`;
          circle.style.borderRadius = "50%";
          circle.style.border = "2px solid red";
          circle.style.pointerEvents = "none";
          circle.style.zIndex = "9999";
          document.body.appendChild(circle);

          setTimeout(() => {
            document.body.removeChild(circle);
          }, 10000);
        },
        { x, y }
      );

      humanReadableMessage = `Successfully clicked at coordinates (${x}, ${y})\n\n`;
    } catch (error) {
      humanReadableMessage = `Failed to click at coordinates (${x}, ${y}).\n\n`;
    }

    return humanReadableMessage;
  },
};
