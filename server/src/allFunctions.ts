// src/allFunctions.ts
import { AIFunctionCall } from "./domain/AICommandFunction";
import { visitUrl } from "./functions/visitUrl";
import { refreshScreen } from "./functions/refreshScreen";
import { findUIElements } from "./functions/findUIElements";
import { clickCoordinates } from "./functions/clickCoordinates";
import { enterTextValue } from "./functions/enterTextValue";
import { pressKey } from "./functions/pressKey";
import { comment } from "./functions/comment";
import { check } from "./functions/check";
import { describeWhatYouSee } from "./functions/describeWhatYouSee";
import { setOutputParameter } from "./functions/setOutputParameter";
import { scrollPage } from "./functions/scrollPage";
import { resetBrowser } from "./functions/resetBrowser";

export const functions: AIFunctionCall[] = [
  visitUrl,
  refreshScreen,
  findUIElements,
  clickCoordinates,
  enterTextValue,
  pressKey,
  comment,
  check,

  // commented because this propmt
  // Find the question on the screen, then find the correct answer. Locate the radio button with the correct answer and click it. Find next button and click it.
  // you see a question and a few possible answers, find the text that represents correct answer  
  //describeWhatYouSee,  

  setOutputParameter,
  scrollPage,
  resetBrowser,
];
