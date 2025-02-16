// server/src/functions/setOutputParameter.ts
import { AIFunctionCall } from "../domain/AIFunctionCall";
import { Page } from "playwright";
import { IScriptContext } from "../domain/IScriptContext";

interface IFunctionParams {
  outParameterName: string;
  outParameterValue: string;
  _scriptContext: IScriptContext;
}

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
    const { outParameterName, outParameterValue, _scriptContext} = args as IFunctionParams;
    _scriptContext.out.set(outParameterName, outParameterValue);
    console.log("Script context updated: ", _scriptContext);
    return `Set output parameter: {{${outParameterName}}}=${outParameterValue}`;
  },
};
