import { z } from "zod";
import { trimmedString } from "./common";

export const createClassroomSchema = z.object({
  name: trimmedString.min(1).max(255),
  year: z.coerce.string().trim().min(1).max(50),
});

export const joinClassroomSchema = z.object({
  inviteCode: trimmedString.min(1).max(50),
});

export const createClassroomInviteSchema = z.object({
  expiresInHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(168),
  maxUses: z.coerce.number().int().min(1).max(10000).optional(),
});
