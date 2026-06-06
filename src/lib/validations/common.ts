import { z } from "zod";

export const trimmedString = z.string().trim();
export const safeUrl = trimmedString.url().max(2048);
export const positiveInt = z.coerce.number().int().positive();
export const emailStr = z.string().email().max(255).optional().nullable();
