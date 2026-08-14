import { z } from "zod";
import { trimmedString, safeUrl, positiveInt } from "./common";

export const createReplySchema = z.object({
  doubtId: positiveInt.or(z.coerce.number().int().positive()),

  type: trimmedString.min(1),
  content: trimmedString.max(5000).optional().nullable(),
  imageUrl: safeUrl.optional().nullable(),
  originalCode: trimmedString.max(10000).optional().nullable(),
  correctedCode: trimmedString.max(10000).optional().nullable(),
  language: trimmedString.max(50).optional().nullable(),
}).refine((data) => data.content || data.imageUrl || data.correctedCode, {
  message: "Either content, imageUrl, or correctedCode is required",
  path: ["content"]
});

export const voteReplySchema = z.object({
  replyId: positiveInt,

});

export const updateReplyActionSchema = z.object({
  content: trimmedString.max(5000).optional().nullable(),
  imageUrl: safeUrl.optional().nullable(),
  originalCode: trimmedString.max(10000).optional().nullable(),
  correctedCode: trimmedString.max(10000).optional().nullable(),
  language: trimmedString.max(50).optional().nullable(),
});
