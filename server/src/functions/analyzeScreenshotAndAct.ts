// server/src/functions/analyzeScreenshotAndAct.ts
import { AIFunctionCall } from "../domain/AIFunctionCall";
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
If user mentions going to step (eg "go to step 2" (label: "2"), "goto step exit" (label: "exit"), "go to step start" (label: "start")), then add a goto action to the plan.
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
        "typeText": { "text": string } | null,
        "wait": { "ms": number } | null,
        "goto": { "label": string } | null;
      }
    }
  ]
}

User task: 
\`\`\`
{{userTask}}
\`\`\`
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
  wait?: { ms: number };
  goto?: { label: string };
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
    console.log("analyzeScreenshotAndAct: _messages=\n" + JSON.stringify(_messages, null, 2));
    const userTask = _messages[_messages.length - 1].content as string;
    
    async function sendResponseMessage(msg: string, debug: boolean = false) {
      _socket.emit("server_response", JSON.stringify({ functionname: "analyzeScreenshotAndAct", payload: msg, debug: debug }));
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
      await sendResponseMessage(JSON.stringify(parsed));

      await sendScreenshot();
      
      return parsed;
    }
    
    let abortIneractionLoop = false;

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
      if (interaction.wait) {
        const waitMs = interaction.wait.ms || +interaction.wait;
        await page.waitForTimeout(waitMs);
        await sendScreenshot();
        await sendResponseMessage("Waited for " + waitMs + "ms");
        actionDone = true;
      }
      if (interaction.goto) {
        const gotoLabel = interaction.goto.label || interaction.goto;
        await sendResponseMessage("Goto label: " + gotoLabel);
        _socket.emit("goto", gotoLabel);
        abortIneractionLoop = true;
        return true;
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
        if (abortIneractionLoop) {
          break;
        }
      }
    }
    return "User task completed and performed " + completedActions + " actions.";
  },
};