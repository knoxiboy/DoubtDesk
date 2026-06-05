import { z } from "zod";
import { trimmedString, safeUrl } from "./common";

export const generateVideoSchema = z.object({
  content: trimmedString.max(5000).optional().nullable(),
  imageUrl: safeUrl.optional().nullable(),
}).refine((data) => data.content || data.imageUrl, {
  message: "Either content or imageUrl is required",
  path: ["content"]
});

export const scriptSchema = z.object({
  content: trimmedString.min(1).max(5000),
});
