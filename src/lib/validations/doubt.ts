import { z } from "zod";
import { trimmedString, safeUrl, positiveInt } from "./common";

export const createDoubtSchema = z.object({
  userName: trimmedString.min(1).max(255),
  subject: trimmedString.min(1).max(100),
  content: trimmedString.max(5000).optional(),
  imageUrl: z.union([safeUrl, z.literal('')]).optional().transform(e => e === '' ? undefined : e),
  classroomId: positiveInt.optional().nullable(),
  type: z.enum(["community", "teacher", "ai"]).default("community"),
  tags: z.array(trimmedString.min(1).max(80)).max(8).default([]),
}).refine((data) => data.content || data.imageUrl, {
  message: "Either content or imageUrl is required",
  path: ["content"]
});

export const updateDoubtActionSchema = z.object({
  action: z.enum(["like", "solve", "edit"]),
  content: trimmedString.max(5000).optional().nullable(),
  subject: trimmedString.max(100).optional(),
  imageUrl: z.union([safeUrl, z.literal('')]).optional().nullable().transform(e => e === '' ? null : e),
  userName: trimmedString.max(255).optional(),
  replyId: positiveInt.optional().nullable(),
  tags: z.array(trimmedString.min(1).max(80)).max(8).optional()
}).refine((data) => {
  if (data.action === "like" && !data.userName) return false;
  return true;
}, {
  message: "User name required for like",
  path: ["userName"]
});
