// src/functions/enterTextValue.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const enterTextValue: AIFunctionCall = {
  name: "enterTextValue",
  systemMessageExtension:
    "Detect the {{input_parameter}} pattern and treat it as a literal string, not a variable for interpolation or further parsing. Skip everything that comes after the comment // in user input.",
  description: "Simulate typing text",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to type",
      },
    },
    required: ["text"],
  },
  execute: async (args: any, page: Page) => {
    const { text, _scriptContext } = args;

    let humanReadableMessage = "";

    // Substitute variables in text with values from _scriptContext
    const variablePattern = /{{(.*?)}}/g;
    const textWithContextVariables = (text as string).replace(
      variablePattern,
      (_, variable) => {
        return _scriptContext.in[variable] || "";
      }
    );

    try {
      await page.keyboard.type(textWithContextVariables);
      humanReadableMessage = `Successfully entered text.\n\n`;
    } catch (error) {
      humanReadableMessage = `Failed to enter text.\n\n`;
    }

    return humanReadableMessage;
  },
};
