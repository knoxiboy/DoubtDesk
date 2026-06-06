import { z } from "zod";

export const updateProfileSchema = z.object({
  emailNotificationsEnabled: z.boolean().optional(),
  notificationPreference: z.enum(["instant", "daily", "weekly", "none"]).optional(),
});
