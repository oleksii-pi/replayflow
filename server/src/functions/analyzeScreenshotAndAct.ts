// src/functions/analyzeScreenshotAndAct.ts

import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";
import { simpleClaudeApi } from "../services/claudeApi";
import { Socket } from "socket.io";
import { Server } from "http";
import { ChatCompletionMessageParam } from "openai/resources";

const analyzeImagePrompt = `
Explain what you see in the screenshot and how it relates to the user task.
Provide a plan of actions to perform the user task.
User can ask generic question, that does not require any action, so actions will be empty.
Find the bounding box coordinates of one or more UI elements in the screenshot.
Look all possible UI elements, including text, images, buttons, links, menus, icons, etc.
Return a JSON with this structure:
{
  "reasoning": "What you can see on the screenshot, how it relates to the user task and what you can do to perform user task if action required",
  "uiElements": [{ "text": string | null, "description": string, "x1": number, "y1": number, "x2": number, "y2": number }],
  "actions": [
    {
      "elementIndex": number | null,
      "interaction": {
        "mouseHover": { "x": number, "y": number } | null,
        "mouseClick": { "x": number, "y": number } | null,
        "mouseScroll": { "x": number, "y": number } | null,
        "keyPress": { "key": string } | null,
        "typeText": { "text": string } | null
      }
    }
  ]
}
User task: 
{{userTask}}
`;

interface UIElement {
  text: string | null;
  description: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Interaction {
  mouseHover?: { x: number; y: number };
  mouseClick?: { x: number; y: number };
  mouseScroll?: { x: number; y: number };
  keyPress?: { key: string };
  typeText?: { text: string };
}

interface Action {
  elementIndex: number | null;
  interaction: Interaction;
}

interface AIAssessment {
  reasoning: string;
  uiElements: UIElement[];
  actions: Action[];
}

export const analyzeScreenshotAndAct: AIFunctionCall = {
  name: "analyzeScreenshotAndAct",
  description: "Analyze screenshot and perform user task.",
  parameters: {},
  execute: async (args: any, page: Page): Promise<string> => {
    const { _socket, _io, _messages } = args as {
      _socket: Socket;
      _io: Server;
      _messages: ChatCompletionMessageParam[];
    };
    console.log("analyzeScreenshotAndAct: " + JSON.stringify(_messages, null, 2));
    const userTask = _messages[_messages.length - 1].content as string;
    
    async function sendResponseMessage(msg: string, debug?: boolean) {
      _socket.emit("server_response", (debug ? "// " : "") + "analyzeScreenshotAndAct: " + msg);
    }
    async function sendScreenshot() {
      const screenshot = (await page.screenshot()).toString("base64");
      _io.emit("browser_screenshot", screenshot);
      return screenshot;
    }
   
    async function performReasoning(): Promise<AIAssessment | null> {
      const screenshot = await sendScreenshot();
      const prompt = analyzeImagePrompt.replace("{{userTask}}", userTask)

      const startTime = Date.now();
      const aiResponse = await simpleClaudeApi(prompt, [screenshot], true);
      const endTime = Date.now();
      await sendResponseMessage(`performReasoning: completed in ${endTime - startTime}ms`, true);
      
      let parsed: AIAssessment | null = null;
      try {
        parsed = JSON.parse(aiResponse) as AIAssessment;
      } catch {
        await sendResponseMessage("AI returned invalid JSON: \n\n" + aiResponse, true);
        return null;
      }
      await sendResponseMessage(aiResponse);
      
      await page.evaluate((data: UIElement[]) => {
        data.forEach((d, index) => {
          if (!d.x1 || !d.y1 || !d.x2 || !d.y2) return;
          const margin = 4;
          const rect = document.createElement("div");
          rect.style.position = "absolute";
          rect.style.left = `${Math.min(d.x1, d.x2) - margin}px`;
          rect.style.top = `${Math.min(d.y1, d.y2) - margin}px`;
          rect.style.width = `${Math.abs(d.x2 - d.x1) + 2 * margin}px`;
          rect.style.height = `${Math.abs(d.y2 - d.y1) + 2 * margin}px`;
          rect.style.border = "2px solid red";
          rect.style.pointerEvents = "none";
          rect.style.zIndex = "9999";
          
          const indexLabel = document.createElement("div");
          indexLabel.style.position = "absolute";
          indexLabel.style.left = "50%";
          indexLabel.style.top = "50%";
          indexLabel.style.transform = "translate(-50%, -50%)";
          indexLabel.style.color = "red";
          indexLabel.style.fontSize = "16px";
          indexLabel.style.fontWeight = "bold";
          indexLabel.textContent = `${index}`;
          
          rect.appendChild(indexLabel);
          document.body.appendChild(rect);
          setTimeout(() => document.body.removeChild(rect), 300);
        });
      }, parsed.uiElements || []);

      await sendScreenshot();
      
      return parsed;
    }

    async function performInteraction(interaction: Interaction): Promise<boolean> {
      const oldUrl = page.url();
      let actionDone = false;
      
      if (interaction.mouseClick && interaction.mouseClick.x != null && interaction.mouseClick.y != null) {
        await page.mouse.click(interaction.mouseClick.x, interaction.mouseClick.y);
        await page.waitForTimeout(100);
        await sendScreenshot();
        await sendResponseMessage("Clicked at (" + interaction.mouseClick.x + "," + interaction.mouseClick.y + ")");
        actionDone = true;
      }
      if (interaction.mouseHover && interaction.mouseHover.x != null && interaction.mouseHover.y != null) {
        await page.mouse.move(interaction.mouseHover.x, interaction.mouseHover.y);
        await page.waitForTimeout(100);
        await sendScreenshot();
        await sendResponseMessage("Hovered at (" + interaction.mouseHover.x + "," + interaction.mouseHover.y + ")");
        actionDone = true;
      }
      if (interaction.mouseScroll && interaction.mouseScroll.x != null && interaction.mouseScroll.y != null) {
        await page.mouse.wheel(interaction.mouseScroll.x, interaction.mouseScroll.y);
        await page.waitForTimeout(100);
        await sendScreenshot();
        await sendResponseMessage("Scrolled with delta (" + interaction.mouseScroll.x + "," + interaction.mouseScroll.y + ")");
        actionDone = true;
      }
      if (interaction.keyPress && interaction.keyPress.key) {
        await page.keyboard.press(interaction.keyPress.key);
        await page.waitForTimeout(100);
        await sendScreenshot();
        await sendResponseMessage("Pressed key: " + interaction.keyPress.key);
        actionDone = true;
      }
      if (interaction.typeText && interaction.typeText.text) {
        await page.keyboard.type(interaction.typeText.text);
        await page.waitForTimeout(100);
        await sendScreenshot();
        await sendResponseMessage("Typed text: " + interaction.typeText.text);
        actionDone = true;
      }
      if (!actionDone) {
        await sendResponseMessage("Warning: no action performed: \n\n" + JSON.stringify(interaction, null, 2));
      }
      const newUrl = page.url();
      if (newUrl !== oldUrl) {
        await page.waitForTimeout(1000);
        await sendScreenshot();
        await sendResponseMessage("URL changed to: " + newUrl);
      }
      return actionDone;
    }

    const plan = await performReasoning();
    if (!plan) {
      return "Error: No valid AI response returned";
    }

    let completedActions = 0;
    for (const action of plan.actions) {
      if (await performInteraction(action.interaction)) {
        completedActions++;
      }
    }
    return "User task completed and performed " + completedActions + " actions.";
  },
};