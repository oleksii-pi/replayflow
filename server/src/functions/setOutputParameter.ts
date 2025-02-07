/// src/functions/setOutputParameter.ts
import { AIFunctionCall } from "../domain/AICommandFunction";
import { Page } from "playwright";

export const setOutputParameter: AIFunctionCall = {
  name: "setOutputParameter",
  description:
    "Stores the value of an output parameter in the script context based on the current conversation.",
  parameters: {
    type: "object",
    properties: {
      outParameterName: {
        type: "string",
        description:
          "The name of the output parameter. If not specified, a new camel-case name will be generated.",
      },
      outParameterValue: {
        type: "string",
        description: "The value of the output parameter.",
      },
    },
    required: ["outParameterName", "outParameterValue"],
  },
  execute: async (args: any, _page: Page) => {
    const { outParameterName, outParameterValue, _scriptContext } = args;
    _scriptContext.out[outParameterName] = outParameterValue;
    console.log("Script context updated: ", _scriptContext);
    return `Set output parameter: {{${outParameterName}}}=${outParameterValue}`;
  },
};
