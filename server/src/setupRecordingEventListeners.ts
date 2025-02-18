// server/src/setupRecordingEventListeners.ts
import { Page } from "playwright";
import { simpleClaudeApi } from "./services/claudeApi";

declare global {
  interface Window {
    recordEvent: (type: string, data?: Record<string, any>) => void;
  }
}

interface UIElement {
    text: string | null;
    description: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

interface AIResponse {
    uiElements: UIElement[],
    eventDescription: string
}

const promptTemplate = `Look at screenshot and provide a decription for all UI elements.
Find UI elements that located under event coordinates.
UI element can be: text, image, icon, button, link, menu, menu item, combobox, checkbox, radio button, etc.
From the description it should be clear what the only one UI element was interacted with.

Return a JSON with this structure:
{
 "uiElements": [{ "text": string | null, "description": string, "x1": number, "y1": number, "x2": number, "y2": number }],
 "eventDescription": string
}

Possilbe eventDescription values:
'Click on "Subscription" button'
'Enter "Hello" into input field "Name"'
'Click on "Pattern" combobox'
'Scroll down 400px'
'Scroll right 400px'

Event data:
\`\`\`
{event}
\`\`\`
`;

export async function setupRecordingEventListeners(
  page: Page,
  eventCallback: (eventMessage: string) => void
) {
  await page.exposeFunction("recordEvent", async (type: string, data?: Record<string, any>) => {
    const eventData = { type, data };
    //eventCallback(JSON.stringify(eventData));

    const screenshot = (await page.screenshot()).toString("base64");
    const prompt = promptTemplate.replace("{event}", JSON.stringify(eventData));
    const aiResponse = await simpleClaudeApi(prompt, [screenshot], true);

    eventCallback((JSON.parse(aiResponse) as AIResponse)?.eventDescription ?? "PARSING ERROR in setupRecordingEventListeners.recordEvent");
  });

  await page.addInitScript(() => {
    let debounceTimerKeydown: number | null = null;
    let pendingKeydownData:
      | { keys: string[]; boundingRect: { x1: number; y1: number; x2: number; y2: number } }
      | null = null;
    let pendingKeydownTarget: EventTarget | null = null;

    const flushDebouncedKeydown = () => {
      if (debounceTimerKeydown) {
        clearTimeout(debounceTimerKeydown);
        debounceTimerKeydown = null;
      }
      if (pendingKeydownData !== null) {
        window.recordEvent("keydown", pendingKeydownData);
        pendingKeydownData = null;
        pendingKeydownTarget = null;
      }
    };

    document.addEventListener("click", (event) => {
      flushDebouncedKeydown();
      window.recordEvent("mouse_click", {
        x: event.clientX,
        y: event.clientY,
      });
    });

    document.addEventListener("keydown", (event) => {
      const targetElem = event.target as HTMLElement;
      const rect = targetElem.getBoundingClientRect();
      const boundingRect = {
        x1: Math.round(rect.x), 
        y1: Math.round(rect.y),
        x2: Math.round(rect.x + rect.width),
        y2: Math.round(rect.y + rect.height),
      };

      if (pendingKeydownTarget && pendingKeydownTarget !== targetElem) {
        flushDebouncedKeydown();
      }

      pendingKeydownTarget = targetElem;
      const keyValue = targetElem instanceof HTMLInputElement && targetElem.type === "password"
      ? "*"
      : event.key;
      pendingKeydownData = pendingKeydownData ?? { keys: [], boundingRect };
      pendingKeydownData.keys.push(keyValue);

      if (debounceTimerKeydown) {
        clearTimeout(debounceTimerKeydown);
      }
      debounceTimerKeydown = window.setTimeout(() => {
        flushDebouncedKeydown();
      }, 2000);
    });

    let scrollTimer: number | null = null;
    window.addEventListener(
      "scroll",
      () => {
        flushDebouncedKeydown();
        if (scrollTimer) {
          clearTimeout(scrollTimer);
        }
        scrollTimer = window.setTimeout(() => {
          window.recordEvent("scroll", {
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          });
        }, 400);
      },
      { passive: true }
    );
  });

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      const message = {
        type: "framenavigated",
        data: { url: frame.url() },
      };
      eventCallback(JSON.stringify(message));
    }
  });
}
