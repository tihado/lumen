import type { LessonPatchOp } from "@/lib/lesson/patches";
import type { LessonDocument } from "@/lib/lesson/schema";

export type ProviderId =
  | "llm"
  | "tavily"
  | "pioneer"
  | "fal"
  | "slng"
  | "orchestrator";

export type ProviderReadiness = {
  llm: boolean;
  tavily: boolean;
  fal: boolean;
  pioneer: boolean;
  slng: boolean;
};

export type StreamEvent =
  | {
      type: "run_started";
      runId: string;
      lessonId: string;
      readiness: ProviderReadiness;
    }
  | {
      type: "provider_started";
      runId: string;
      stepId: string;
      provider: ProviderId;
      label: string;
    }
  | {
      type: "provider_completed";
      runId: string;
      stepId: string;
      provider: ProviderId;
      detail?: string;
      usedFallback?: boolean;
    }
  | { type: "lesson_patch"; runId: string; patch: LessonPatchOp }
  | { type: "lesson_snapshot"; runId: string; lesson: LessonDocument }
  | { type: "run_completed"; runId: string; lessonId: string }
  | { type: "run_failed"; runId: string; message: string };

export function parseStreamEventLine(line: string): StreamEvent | null {
  const t = line.trim();
  if (!t) {
    return null;
  }
  try {
    return JSON.parse(t) as StreamEvent;
  } catch {
    return null;
  }
}
