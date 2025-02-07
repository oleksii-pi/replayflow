// src/functions/extractScript.ts
import { ChatCompletionMessageParam } from "openai/resources";
import { simpleOpenAIApi } from "../services/openAIapi";

// Looks like this script not accurate enough, need to be improved

function buildPrompt(conversation: string): string {
  return `
Extract JSON script from this conversation:

Conversation:
\`\`\`
${conversation}
\`\`\`
If there is obvious personal information in the conversation, anonymize it in the result script.
Add additional steps at the beginning for initializing script input parameters if needed.
Preserve user input that comes to enterTextValue function.
Preserve all comments into steps.
Do not add any unnecessary steps, input or output parameters.

Example of expected format for this script:
{
  "title": "Extract Famous Person Age",
  "description": "This script visits Google, searches for a famous person's age, and retrieves the age from the search results.",
  "inputParameters": [
    {
      "name": "in_famousPersonName",
      "description": "The name of the famous person whose age you want to find.",
      "possible_value": "Brad Pitt"
    }
  ],
  "outputParameters": [
    {
      "name": "out_famousPersonAge",
      "description": "Found age in years",
      "possible_value": "61"
    }
  ],
  "steps": [
    {
      "command": "{{in_famousPersonName}}=",
      "possible_answer": "setInputParameter function answers: {{in_famousPersonName}} is linked to the script context."
    },
    {
      "command": "visit https://www.google.com",
      "possible_answer": "visitUrl function answers: Visited https://www.google.com"
    },
    {
      "command": "find reject all cookies button",
      "possible_answer": "findUIelements function answers: [{ 'text': 'Reject all', 'description': 'Button to reject all cookies', 'x': 396, 'y': 707 }]"
    },
    {
      "command": "click it",
      "possible_answer": "clickCoordinates function answers: Successfully clicked at coordinates (396, 707)."
    },
    {
      "command": "find main input",
      "possible_answer": "findUIelements function answers: [{ 'text': null, 'description': 'Main Google search input field', 'x': 498, 'y': 351 }]"
    },
    {
      "command": "click it",
      "possible_answer": "clickCoordinates function answers: Successfully clicked at coordinates (498, 351)."
    },
    {
      "command": "enter {{in_famousPersonName}} age",
      "possible_answer": "enterTextValue function answers: Successfully entered text."
    },
    {
      "command": "press enter",
      "possible_answer": "pressKey function answers: Successfully pressed key 'Enter' on the currently focused element."
    },
    {
      "command": "find result that contains age information",
      "possible_answer": "findUIelements function answers: [{ 'text': '61 years 18 Dec 1963', 'description': 'Age information displayed in the search result', 'x': 729, 'y': 341 }]"
    },
    {
      "command": "output found age years to {{out_famousPersonAge}}",
      "possible_answer": "setOutputParameter function answers: Set output parameter: 'out_famousPersonAge' = 61 years."
    }
  ]
}
`;
}

export type Script = {
  title: string;
  description: string;
  inputParameters: Array<{
    name: string;
    description: string;
    possible_value: string;
  }>;
  outputParameters: Array<{
    name: string;
    description: string;
    possible_value: string;
  }>;
  steps: Array<{
    command: string;
    possible_answer: string;
  }>;
};

export const extractScript = async function (
  conversation: ChatCompletionMessageParam[]
) {
  const finalPrompt = buildPrompt(JSON.stringify(conversation));
  const aiResponse = await simpleOpenAIApi({
    message: finalPrompt,
    answerJson: true,
  });
  const deserialisedScript = JSON.parse(aiResponse) as Script;
  return JSON.stringify(deserialisedScript, null, 2);
};
