import { z } from "zod";
import { trimmedString } from "./common";

export const createTagSchema = z.object({
  name: trimmedString.min(1).max(80),
  description: trimmedString.max(500).optional(),
  classroomId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
});
