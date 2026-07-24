import { z } from "zod";
import { trimmedString, positiveInt } from "./common";

export const checkSimilaritySchema = z.object({
  content: trimmedString.min(10).max(2000),
  classroomId: positiveInt.optional().nullable(),
});
