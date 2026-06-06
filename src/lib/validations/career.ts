import { z } from "zod";
import { trimmedString } from "./common";

export const coverLetterSchema = z.object({
  jobDescription: trimmedString.min(1).max(10000),
  userDetails: trimmedString.min(1).max(10000),
});

export const resumeBuilderSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  resumeName: trimmedString.min(1).max(255),
  resumeData: z.any(),
});

export const careerChatSchema = z.object({
  message: trimmedString.min(1).max(2000),
  context: trimmedString.max(5000).optional(),
});

export const roadmapSchema = z.object({
  targetField: trimmedString.min(1).max(255),
  timeline: trimmedString.min(1).max(100),
  currentLevel: trimmedString.min(1).max(100),
  weeklyCommitment: trimmedString.max(50).optional(),
});
