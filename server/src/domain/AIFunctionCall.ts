// server/src/domain/AICommandFunction.ts
import { Page } from "playwright";

export interface AIFunctionCall {
  name: string;
  description: string;
  systemMessageExtension?: string;
  parameters: Record<string, unknown>; 
  execute: (args: any, page: Page) => Promise<string>;
}
