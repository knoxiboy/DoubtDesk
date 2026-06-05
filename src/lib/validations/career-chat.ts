import { z } from "zod";
import { trimmedString } from "./common";

export const careerChatInputSchema = z.object({
  userInput: trimmedString.min(1).max(5000),
});

export const shareChatSchema = z.object({
  chatId: trimmedString.min(1).max(255),
  shared: z.boolean().optional(),
});

export const saveChatHistorySchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: trimmedString.min(1).max(10000),
  chatId: trimmedString.min(1).max(255),
  chatTitle: trimmedString.max(255).optional(),
});
