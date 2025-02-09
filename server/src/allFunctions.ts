// src/allFunctions.ts
import { AIFunctionCall } from "./domain/AICommandFunction";
import { visitUrl } from "./functions/visitUrl";
import { comment } from "./functions/comment";
import { check } from "./functions/check";
import { setOutputParameter } from "./functions/setOutputParameter";
import { resetBrowser } from "./functions/resetBrowser";
import { analyzeScreenshotAndAct } from "./functions/analyzeScreenshotAndAct";

export const functions: AIFunctionCall[] = [
  visitUrl,
  //// call them only when specific keyword is used:
  //comment,
  //check,
  analyzeScreenshotAndAct,
  setOutputParameter,
  resetBrowser,
];
