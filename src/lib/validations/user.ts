import { z } from "zod";
import { trimmedString, emailStr } from "./common";

export const onboardSchema = z.object({
  university: trimmedString.min(1).max(255),
  year: trimmedString.max(50).optional(),
  role: z.string().min(1).max(50),
  collegeEmail: z.string().email().max(255),
});

export const preferencesSchema = z.object({
  themePreference: z.enum(["light", "dark", "system"]),
});
