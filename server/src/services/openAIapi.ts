// src/services/openAIapi.ts
import { OpenAI } from "openai";
import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources";

const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};

console.log("OpenAI API Key:", configuration.apiKey?.substring(0, 4) + "...");

export const openAIapi = new OpenAI(configuration);

interface SimpleOpenAIApiParams {
  message: string;
  imageBase64Array?: string[];
  answerJson?: boolean;
}

export const simpleOpenAIApi = async ({
  message,
  imageBase64Array = [],
  answerJson = false,
}: SimpleOpenAIApiParams): Promise<string> => {
  console.log("simpleOpenAIApi:");
  console.log(
    "\x1b[32m%s\x1b[0m", // Green color
    message
  );

  const imageMessages = imageBase64Array.map((image) => ({
    type: "image_url",
    image_url: {
      url: "data:image/jpeg;base64," + image,
    },
  })) as ChatCompletionContentPart[];

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: message,
        },
        ...imageMessages,
      ],
    },
  ];

  const startTime = Date.now();

  const response = await openAIapi.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    response_format: answerJson ? { type: "json_object" } : undefined,
  });

  const answer =
    response.choices[0].message.content ?? "No response available.";
  console.log("OpenAI answer:");
  console.log(
    "\x1b[33m%s\x1b[0m", // Yellow color
    answer
  );

  const endTime = Date.now();
  console.log(`simpleOpenAIApi execution time: ${endTime - startTime} ms`);

  return answer;
};
