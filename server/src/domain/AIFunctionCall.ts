// server/src/domain/AICommandFunction.ts
import { Page } from "playwright";

export interface AIFunctionCall {
  name: string;
  description: string;
  systemMessageExtension?: string;
  parameters: any; // You can define this more precisely if needed
  execute: (args: any, page: Page) => Promise<string>;
}
