import { z } from "zod";
import { positiveInt } from "./common";

export const updateNotificationSchema = z.object({
  notificationId: positiveInt.optional(),
  markAllRead: z.boolean().optional(),
}).refine((data) => data.notificationId || data.markAllRead, {
  message: "Either notificationId or markAllRead is required",
  path: ["notificationId"],
});
