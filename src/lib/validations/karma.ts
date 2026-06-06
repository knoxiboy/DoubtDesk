import { z } from "zod";
import { trimmedString, positiveInt } from "./common";

export const karmaEventSchema = z.object({
  userEmail: z.string().email().max(255),
  eventType: z.enum([
    "answer_upvoted", "answer_accepted", "spam_report_accepted",
    "answer_downvoted", "streak_bonus",
  ]),
  replyId: positiveInt.optional().nullable(),
  doubtId: positiveInt.optional().nullable(),
  note: trimmedString.max(500).optional().nullable(),
});
