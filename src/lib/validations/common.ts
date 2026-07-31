import { z } from "zod";

export const trimmedString = z.string().trim();
export const safeUrl = trimmedString.refine(
  (val) => {
    if (!val) return true;
    if (val.startsWith("data:image/") || val.startsWith("data:application/pdf")) {
      return val.length <= 15 * 1024 * 1024;
    }
    if (val.length > 2048) return false;
    try {
      const parsed = new URL(val);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_) {
      return false;
    }
  },
  { message: "Invalid URL or file format" }
);
export const positiveInt = z.coerce.number().int().positive();
