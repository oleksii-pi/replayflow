// src/index.ts
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import { functions } from "./allFunctions";
import { FunctionCall } from "./domain/FunctionCall";
import { openAIapi } from "./services/openAIapi";
import { ChatCompletionMessageParam } from "openai/resources";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { extractScript, Script } from "./functions/extractScript";
import { page } from "./browser";

dotenv.config();

const systemMessageBase = "Act as coordinator and decide which tool to use based on the user's request.";

const functionsSystemMessageExtension = functions
  .filter((f) => f.systemMessageExtension)
  .map(
    (f) =>
      `Function "${f.name}" must follow these rule(s): "${f.systemMessageExtension}"`
  )
  .join("\n");

const systemMessage =
  systemMessageBase + "\n\n" + functionsSystemMessageExtension;

console.log(
  "Functions loaded:",
  functions.map((func) => func.name),
  systemMessage
);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());

server.listen(5000, () => {
  console.log("Server listening on port 5000");
});

const _scriptContext = { in: {}, out: {} } as any;

io.on("connection", (socket) => {
  console.log("A user connected, socket id:" + socket.id);

  const sendScreenshot = async () => {
    const screenshot = (await page().screenshot()).toString("base64");
    io.emit("browser_screenshot", screenshot);
  };

  socket.on("user_message", async (allMessages: string) => {
    console.log("======================================");
    const systemMessageItem: ChatCompletionMessageParam = {
      role: "system",
      content: systemMessage,
    };
    const messagesFromFrontEnd = (
      JSON.parse(allMessages) as ChatCompletionMessageParam[]
    ).filter((m) => m.role !== "system");

    const messagesWithoutScriptRequests = messagesFromFrontEnd.filter(
      (m) => (m.content as string).startsWith("script") === false
    );

    const lastUserMessage = messagesFromFrontEnd[
      messagesFromFrontEnd.length - 1
    ].content as string;

    console.log("User command: ");
    console.log(
      "\x1b[35m%s\x1b[0m", // Pink color
      lastUserMessage
    );

    if (lastUserMessage === "script") {
      // script function
      const script = await extractScript(messagesWithoutScriptRequests);
      const allScriptInputVariables = (JSON.parse(script) as Script).steps
        .filter((m) => m.command.startsWith("{{") === true)
        .map((m) => m.command)
        .join("\n");
      const allUserCommands = (JSON.parse(script) as Script).steps
        .filter((m) => m.command.startsWith("{{") === false)
        .map((m, i) => i + 1 + ". " + m.command)
        .join("\n");
      const contextBlockStart = "<details><summary>Context</summary>\n\n";
      const contextBlockClose = "</details>";
      const answer =
        "script function answers:\n\n" +
        contextBlockStart +
        "\n```text\n" +
        allScriptInputVariables +
        "\n" +
        allUserCommands +
        "\n```\n" +
        "```json\n" +
        script +
        "\n```\n" +
        contextBlockClose;

      socket.emit("server_response", answer);
      socket.emit("function_completed");
      return;
    }

    if (lastUserMessage.startsWith("{{")) {
      // setInputParameter function
      const variableName = lastUserMessage.split("{{")[1].split("}}")[0];
      const variableValue = lastUserMessage.split("=")[1].trim();
      _scriptContext.in[variableName] = variableValue;
      console.log("Script context updated: ", _scriptContext);
      const answer = `setInputParameter function answers: {{${variableName}}} is linked to the script context.`;
      socket.emit("server_response", answer);
      socket.emit("function_completed");
      return;
    }

    const messages = [systemMessageItem, ...messagesWithoutScriptRequests];
    console.log("messages:");
    console.log(
      "\x1b[32m%s\x1b[0m", // Green color
      JSON.stringify(messages, null, 2)
    );

    const startTime = Date.now();
    const functionCalls = await convertToFunctionCalls(messages);
    const endTime = Date.now();
    socket.emit("server_response", "// convertToFunctionCalls: completed in " + (endTime - startTime) + "ms");

    if (functionCalls.length === 0) {
      socket.emit(
        "server_response",
        "I'm sorry, error occurred while processing the command (function not found)."
      );
      return;
    }

    for (let i = 0; i < 1; i++) {
      // only one function call for now
      try {
        await executeCommand(functionCalls[i] as FunctionCall, messages, socket);
      } catch (error: any) {
        const contextBlockStart = "<details><summary>Context</summary>\n\n";
        const contextBlockClose = "</details>";
        socket.emit(
          "server_response",
          `An error occurred while executing function ${JSON.stringify(functionCalls[i], null, 2)}. ${contextBlockStart} \n ${String(error)} \n ${contextBlockClose}`
        );
      }

      await sendScreenshot();
      setTimeout(sendScreenshot, 1000);
      setTimeout(sendScreenshot, 3000);
      setTimeout(sendScreenshot, 11000);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

async function convertToFunctionCalls(messages: ChatCompletionMessageParam[]) {
  const openAIFunctions = functions.map((func) => ({
    name: func.name,
    description: func.description,
    parameters: func.parameters,
  }));

  
  const messageConfig: ChatCompletionCreateParamsNonStreaming = {
    model: "gpt-4o",
    messages,
    tools: openAIFunctions.map((func) => ({
      function: func,
      type: "function",
    })),
    tool_choice: "required",
  };
  
  console.log("messageConfig:");
  console.log(
    "\x1b[32m%s\x1b[0m", // Green color
    JSON.stringify(messageConfig, null, 2)
  );

  const response = await openAIapi.chat.completions.create(messageConfig);

  const functionCalls = response.choices[0].message.tool_calls as FunctionCall[];

  console.log(
    "Function calls: " + "\x1b[33m%s\x1b[0m", // Yellow color
    functionCalls?.map((f) => f.function.name + " " + f.function.arguments)
  );

  return functionCalls;
}

async function executeCommand(functionCall: FunctionCall, messages: ChatCompletionMessageParam[], socket: Socket) {
  const func = functions.find((func) => func.name === functionCall.function.name);

  if (!func) {
    return `${functionCall.function.name} is not supported.`;
  }

  const args = JSON.parse(functionCall.function.arguments);
  args._scriptContext = _scriptContext;
  args._socket = socket;
  args._io = io;
  args._messages = messages;

  socket.emit("server_response", `// execute: ${func.name}`);

  const startTime = Date.now();
  const result = await func.execute(args, page());
  const endTime = Date.now();
  socket.emit("server_response", `// ${func.name}: completed in ${endTime - startTime}ms`);
  socket.emit("server_response", `${func.name} exection result:\n\n${result}`);
  socket.emit("function_completed");
}
