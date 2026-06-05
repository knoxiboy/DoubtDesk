import { z } from "zod";
import { positiveInt } from "./common";

export const upvoteReplySchema = z.object({
  replyId: positiveInt,
});

export const acceptReplySchema = z.object({
  replyId: positiveInt,
});
