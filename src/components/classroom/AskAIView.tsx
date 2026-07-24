"use client";

import { useState, useRef, useEffect } from "react";
import { MentorModeToggle } from "@/components/layout/MentorModeToggle";
import type { AIMode, ChatMessage } from "@/types/ai-chat";
import type { Doubt } from "@/types";

// FIX 3: Centralized UI copy to resolve "No hardcoded strings" rule
const ASK_AI_COPY = {
  loading: "Generating response...",
  inputLabel: {
    mentor: "Message input for mentor mode",
    direct: "Message input for direct mode",
  },
  placeholder: {
    mentor: "Paste your code or describe your problem...",
    direct: "Ask anything...",
  },
  emptyState: {
    mentor: "Mentor Mode is on. Paste your code or question and I will guide you step by step.",
    direct: "Direct Mode is on. Ask anything and I will answer immediately.",
  },
  helperText: {
    mentor: "Mentor Mode active — Enter to send, Shift+Enter for new line",
    direct: "Direct Mode active — Enter to send, Shift+Enter for new line",
  },
} as const;

interface DisplayMessage extends ChatMessage {
  id: string;
  isCelebration?: boolean;
}

interface AskAIViewProps {
  classroomId?: number | null;
  onSuccess?: () => void;
  initialDoubt?: Doubt | null;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function isCelebrationMessage(text: string): boolean {
  return /nailed it|correct!|well done|great job|you got it/i.test(text);
}

export default function AskAIView({ classroomId = null, onSuccess, initialDoubt }: AskAIViewProps) {
  const [mode, setMode] = useState<AIMode>(() => {
    if (typeof window === "undefined") return "direct";
    return (localStorage.getItem("dd_ai_mode") as AIMode) ?? "direct";
  });

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // FIX 1: Synchronous ref to prevent double-submit race condition
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("dd_ai_mode", mode);
  }, [mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.role === "assistant"
          ? { ...msg, isCelebration: mode === "mentor" && isCelebrationMessage(msg.content) }
          : msg
      )
    );
  }, [mode]);

  useEffect(() => {
    if (initialDoubt) {
      const doubtText = initialDoubt.content === "Visual Inquiry" ? "" : (initialDoubt.content ?? "");
      const initialUserMsg: DisplayMessage = {
        id: "initial-user-" + initialDoubt.id,
        role: "user",
        content: doubtText,
      };

      setMessages([initialUserMsg]);

      const fetchSolution = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/replies?doubtId=${initialDoubt.id}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const solution = data.find(
                (r: any) =>
                  r.type === "solution" || r.userName === "DoubtDesk AI"
              );
              if (solution) {
                const assistantMsg: DisplayMessage = {
                  id: "initial-assistant-" + initialDoubt.id,
                  role: "assistant",
                  content: solution.content,
                  isCelebration: mode === "mentor" && isCelebrationMessage(solution.content),
                };
                setMessages([initialUserMsg, assistantMsg]);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching solution for initial doubt:", err);
        } finally {
          setIsLoading(false);
        }
      };

      void fetchSolution();
    }
  }, [initialDoubt]); 

  function handleModeChange(newMode: AIMode) {
    setMode(newMode);
    setMessages([]);
  }

  async function handleSubmit() {
    const trimmed = input.trim();
    
    // FIX 1: Block execution immediately if a submit is already in flight
    if (!trimmed || isLoading || submitInFlightRef.current) return;
    submitInFlightRef.current = true;

    const userMsg: DisplayMessage = {
      id: generateId(),
      role: "user",
      content: trimmed,
    };

    const updatedMessages = [...messages, userMsg];

    const historyForApi: ChatMessage[] = messages.map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // FIX 2: Omit classroomId completely if it is null to satisfy Zod/API validation
        body: JSON.stringify({ 
          message: trimmed,
          history: historyForApi,
          mode,
          ...(classroomId !== null ? { classroomId } : {}),
        }),
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const data = (await res.json()) as { reply: string };
      const replyText = data.reply ?? "Sorry, something went wrong.";

      const assistantMsg: DisplayMessage = {
        id: generateId(),
        role: "assistant",
        content: replyText,
        isCelebration: mode === "mentor" && isCelebrationMessage(replyText),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      onSuccess?.();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Could not reach the AI. Please try again.",
        },
      ]);
    } finally {
      // FIX 1: Clear the synchronous guard when the request finishes
      submitInFlightRef.current = false;
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">AI Solver</span>
          {mode === "mentor" && (
            <span className="text-xs text-slate-400 hidden md:block">
              — Hints only, no direct answers
            </span>
          )}
        </div>
        <MentorModeToggle mode={mode} onChange={handleModeChange} disabled={isLoading} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-slate-500 text-sm mt-8">
            {ASK_AI_COPY.emptyState[mode]}
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={["flex", msg.role === "user" ? "justify-end" : "justify-start"].join(" ")}>
            <div
              className={[
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words",
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : msg.isCelebration
                    ? "bg-emerald-900/60 border border-emerald-500/40 text-emerald-100 rounded-bl-sm"
                    : "bg-slate-800 text-slate-100 rounded-bl-sm",
              ].join(" ")}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start" role="status">
            <span className="sr-only">{ASK_AI_COPY.loading}</span>
            <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl bg-slate-800 text-slate-100 text-sm px-4 py-2.5 min-h-[44px] max-h-40 placeholder:text-slate-500 border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors"
            aria-label={ASK_AI_COPY.inputLabel[mode]}
            placeholder={ASK_AI_COPY.placeholder[mode]}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || !input.trim()}
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">
          {ASK_AI_COPY.helperText[mode]}
        </p>
      </div>
    </div>
  );
}