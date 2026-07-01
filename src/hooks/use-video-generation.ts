"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VideoJobStatus =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface VideoGenerationState {
  status: VideoJobStatus;
  progress: number;
  step: string | null;
  videoUrl: string | null;
  error: string | null;
  jobId: string | null;
}

const initialState: VideoGenerationState = {
  status: "idle",
  progress: 0,
  step: null,
  videoUrl: null,
  error: null,
  jobId: null,
};

/**
 * Drives the async video pipeline (issue #321) from the client:
 *   1. POST /api/video/generate  -> returns a jobId immediately
 *   2. EventSource /api/video/status?jobId=…  -> streams progress
 *
 * The stream is closed on a terminal status. If the server caps the stream
 * (4-min budget) it closes the connection without a terminal status, and the
 * browser's EventSource transparently reconnects to keep receiving updates.
 */
export function useVideoGeneration() {
  const [state, setState] = useState<VideoGenerationState>(initialState);
  const sourceRef = useRef<EventSource | null>(null);

  const closeStream = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  // Close any open stream when the component unmounts.
  useEffect(() => closeStream, [closeStream]);

  const subscribe = useCallback(
    (jobId: string) => {
      closeStream();
      const es = new EventSource(
        `/api/video/status?jobId=${encodeURIComponent(jobId)}`,
      );
      sourceRef.current = es;

      es.onmessage = (evt) => {
        let data: Partial<VideoGenerationState> & { type?: string };
        try {
          data = JSON.parse(evt.data);
        } catch {
          return; // ignore malformed frame
        }
        if (data.type === "timeout") return; // EventSource will reconnect

        setState((prev) => ({
          ...prev,
          status: (data.status as VideoJobStatus) ?? prev.status,
          progress:
            typeof data.progress === "number" ? data.progress : prev.progress,
          step: data.step ?? prev.step,
          videoUrl: data.videoUrl ?? prev.videoUrl,
          error: data.error ?? prev.error,
        }));

        if (data.status === "completed" || data.status === "failed") {
          // Terminal: close so EventSource does not auto-reconnect.
          closeStream();
        }
      };
      // On a transient connection error EventSource auto-reconnects; nothing to do.
    },
    [closeStream],
  );

  const generate = useCallback(
    async (input: { content?: string; imageUrl?: string }) => {
      setState({ ...initialState, status: "queued", step: "Queued" });
      try {
        const res = await fetch("/api/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          setState((p) => ({
            ...p,
            status: "failed",
            error: data?.error ?? "Failed to start video generation",
          }));
          return null;
        }
        setState((p) => ({ ...p, jobId: data.jobId, status: "queued" }));
        subscribe(data.jobId);
        return data.jobId as string;
      } catch (e) {
        setState((p) => ({
          ...p,
          status: "failed",
          error: e instanceof Error ? e.message : "Network error",
        }));
        return null;
      }
    },
    [subscribe],
  );

  const reset = useCallback(() => {
    closeStream();
    setState(initialState);
  }, [closeStream]);

  return {
    ...state,
    generate,
    reset,
    isGenerating: state.status === "queued" || state.status === "processing",
  };
}