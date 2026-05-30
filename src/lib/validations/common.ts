import { z } from "zod";

export const trimmedString = z.string().trim();
export const safeUrl = trimmedString.url().max(2048);
export const positiveInt = z.coerce.number().int().positive();
