// src/domain/FunctionCall.ts
export interface FunctionCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}
