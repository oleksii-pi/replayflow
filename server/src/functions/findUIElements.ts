// src/functions/findUIElements.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";
import { simpleClaudeApi } from "../services/claudeApi";
import { ChatCompletionMessageParam } from "openai/resources";

interface UIElementAnnotation {
  text: string | null;
  description: string;
  x: number;
  y: number;
  userRequestedToClick: boolean;
}

const annotateImagePrompt = `Find the center coordinates of one or more UI elements 
(labels, icons, inputs, buttons, comboboxes, etc.) in the screenshot. 
If user requested to click on an element, set userRequestedToClick to true otherwise false.
Return all found elements in this JSON array:
[{text: string | null, description: string, x: number, y: number, userRequestedToClick: boolean}]
Example of valid JSON:
\`\`\`json
[
  {
    "text": "Grundgesetz",
    "description": "Radio button for correct answer 'Grundgesetz'",
    "x": 178, 
    "y": 337,
    "userRequestedToClick": true
  },
  {
    "text": "nächste Aufgabe >",
    "description": "Next button",
    "x": 285,
    "y": 486,
    "userRequestedToClick": false
  }
]
\`\`\`

Here is the full history of user messages:
\`\`\`
{{allUserMessages}}
\`\`\`

IMPORTANT: Find elements based on the last user message.
IMPORTANT: Assume that user requires to click or not based on the last user message.
`;

export const findUIElements: AIFunctionCall = {
  name: "findUIElements",
  description: "Finds UI element coordinates from the page, describes and click elements if requested.",
  parameters: {
    type: "object",
    properties: {
    },
  },
  execute: async (args: any, page: Page) => {
    try {
      const { _socket, _messages } = args;
      const screenshotBuffer = await page.screenshot();
      const imageBase64 = screenshotBuffer.toString("base64");

      const allUserMessages = (_messages as ChatCompletionMessageParam[]).filter((m) => m.role === "user");

      const aiResponse = await simpleClaudeApi(
        annotateImagePrompt
          .replace("{{allUserMessages}}", JSON.stringify(allUserMessages, null, 2)),
        [imageBase64],
        true
      );

      let UIElementAnnotations = [];
      try {
        UIElementAnnotations = JSON.parse(aiResponse) as UIElementAnnotation[];
      } catch (error: any) {
        return aiResponse;
      }
      
      await page.evaluate((annotations: UIElementAnnotation[]) => {
        annotations.forEach((annotation) => {
          if (!annotation.x)
            return;
          const x = annotation.x;
          const y = annotation.y;
          const circleRadius = 32;
          const circle = document.createElement("div");
          circle.style.position = "absolute";
          circle.style.left = `${x - circleRadius}px`;
          circle.style.top = `${y - circleRadius}px`;
          circle.style.width = `${circleRadius * 2}px`;
          circle.style.height = `${circleRadius * 2}px`;
          circle.style.borderRadius = "50%";
          circle.style.border = "2px solid orange";
          circle.style.pointerEvents = "none";
          circle.style.zIndex = "9999";
          document.body.appendChild(circle);

          //Remove the circle after 2 seconds
          setTimeout(() => {
            document.body.removeChild(circle);
          }, 10000);
        });
      }, UIElementAnnotations);

      for (const annotation of UIElementAnnotations) {
        const x = annotation.x;
        const y = annotation.y;
        if (annotation.userRequestedToClick) {
          await page.mouse.click(x, y);
          const screenshotBuffer = await page.screenshot();
          const screenshot = screenshotBuffer.toString("base64");
          _socket.emit("browser_screenshot", screenshot);
        }
      }

      return aiResponse;
    } catch (error: any) {
      console.error("Error analyzing screenshot:", error);
      throw new Error("Failed to analyze screenshot.");
    }
  },
};
