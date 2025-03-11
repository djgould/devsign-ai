import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { fireworks } from "@ai-sdk/fireworks";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

export const DEFAULT_CHAT_MODEL: string = "chat-model-small";

export const myProvider = customProvider({
  languageModels: {
    "chat-model-small": openai("gpt-4o-mini-2024-07-18"),
    "chat-model-large": openai("gpt-4o-2024-08-06"),
    "chat-model-reasoning": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/deepseek-r1"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-4o-2024-08-06"),
    "artifact-model": openai("gpt-4o-2024-08-06"),
  },
  imageModels: {
    "small-model": openai.image("dall-e-2"),
    "large-model": openai.image("dall-e-3"),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model-small",
    name: "Small model",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "chat-model-large",
    name: "Large model",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "chat-model-reasoning",
    name: "Reasoning model",
    description: "Uses advanced reasoning",
  },
];
