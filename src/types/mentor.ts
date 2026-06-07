export type AIMode = "direct" | "socratic";

export interface MentorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SocraticRequest {
  messages: MentorMessage[];
  doubt: string;
}

export interface SocraticResponse {
  validation: string;
  nudge: string;
  question: string;
  isSolved: boolean;
  // FIXED: Changed from 'takeaway?: string' to 'string | null'
  // This explicitly matches your system prompt instruction which sets takeaway to 'null' when not solved.
  takeaway: string | null;
}
