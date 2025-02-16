// server/src/allFunctions.ts
import { AIFunctionCall } from "./domain/AIFunctionCall";
import { visitUrl } from "./functions/visitUrl";
import { comment } from "./functions/comment";
import { setOutputParameter } from "./functions/setOutputParameter";
import { resetBrowser } from "./functions/resetBrowser";
import { analyzeScreenshotAndAct } from "./functions/analyzeScreenshotAndAct";

export const functions: AIFunctionCall[] = [
  analyzeScreenshotAndAct,
  visitUrl,
  comment,
  setOutputParameter,
  resetBrowser,
];
