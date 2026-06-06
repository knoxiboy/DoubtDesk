import { z } from "zod";
import { trimmedString } from "./common";

export const similarityCheckSchema = z.object({
  content: trimmedString.min(10).max(2000),
  classroomId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
});
