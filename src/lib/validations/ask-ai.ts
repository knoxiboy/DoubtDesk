import { z } from "zod";
import { trimmedString } from "./common";

export const askAiSchema = z.object({
  prompt: trimmedString.max(10000).optional().default(""),
  type: z.enum(["standard", "simple", "exam", "eli10"]).optional().default("standard"),
  imageBase64: trimmedString.max(500000).optional().nullable(),
  classroomId: z.union([z.coerce.number().int().positive(), z.string(), z.null()]).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: trimmedString.max(4000),
  })).max(20).optional().default([]),
});
