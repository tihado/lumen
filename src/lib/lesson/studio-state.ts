import {
  type LessonDocument,
  safeParseLessonDocument,
} from "@/lib/lesson/schema";
import type { StudioTimelineRow } from "@/lib/orchestrator/stream-events";

export type StudioState = {
  lesson: LessonDocument;
  timeline: StudioTimelineRow[];
  transcript?: string;
};

type PersistedLessonSummary = {
  id?: string;
  title?: string;
  prompt?: string;
};

type PersistedStudioSpecInput = {
  artifactSpec: Record<string, unknown>;
  lesson: LessonDocument;
  timeline: StudioTimelineRow[];
  runId: string;
  transcript: string;
  completedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function buildLessonFromSandboxedSpec(
  spec: Record<string, unknown>,
  persistedLesson?: PersistedLessonSummary
): StudioState | null {
  const kind = spec.kind;
  if (!(kind === "solar-system" || kind === "static-lesson")) {
    return null;
  }

  const id = readString(persistedLesson?.id);
  if (!id) {
    return null;
  }

  const title =
    readString(spec.title) ?? readString(persistedLesson?.title) ?? "Lesson";
  const prompt =
    readString(spec.prompt) ?? readString(persistedLesson?.prompt) ?? title;
  const summary =
    readString(spec.summary) ?? "Review the saved interactive lesson.";
  const durationMinutes =
    typeof spec.durationMinutes === "number" ? spec.durationMinutes : undefined;
  const quiz = isRecord(spec.quiz) ? spec.quiz : null;
  const quizQuestion = readString(quiz?.question);
  const quizChoices = readStringArray(quiz?.choices);
  const quizAnswer = readString(quiz?.answer);

  const lesson: LessonDocument = {
    schemaVersion: 1,
    id,
    title,
    durationMinutes,
    language: readString(spec.language),
    root: "root",
    citations: [],
    nodes: {
      root: {
        id: "root",
        type: "section",
        title: "Lesson",
        children: ["obj-main", "sec-overview", "quiz-main"],
      },
      "obj-main": {
        id: "obj-main",
        type: "objectives",
        title: "Learning objectives",
        bullets: [
          `Explain the main idea of ${title}.`,
          "Check understanding with the saved lesson prompt.",
        ],
      },
      "sec-overview": {
        id: "sec-overview",
        type: "section",
        title: "Overview",
        children: ["txt-summary"],
      },
      "txt-summary": {
        id: "txt-summary",
        type: "text",
        title: "Saved lesson summary",
        format: "markdown",
        body: summary,
      },
      "quiz-main": {
        id: "quiz-main",
        type: "quiz",
        title: "Quick check",
        items: [
          {
            id: "q1",
            stem: quizQuestion ?? `What is one important idea from ${title}?`,
            choices: quizChoices.length > 0 ? quizChoices : undefined,
            answer: quizAnswer,
          },
        ],
      },
    },
  };

  const parsedLesson = safeParseLessonDocument(lesson);
  if (!parsedLesson.success) {
    return null;
  }

  return {
    lesson: parsedLesson.data,
    timeline: [],
    transcript: prompt,
  };
}

export function readStudioState(
  value: unknown,
  persistedLesson?: PersistedLessonSummary
): StudioState | null {
  if (!isRecord(value)) {
    return null;
  }

  const studio = isRecord(value.studio) ? value.studio : null;
  if (studio) {
    const parsedLesson = safeParseLessonDocument(studio.lesson);
    if (parsedLesson.success) {
      const timeline = Array.isArray(studio.timeline)
        ? (studio.timeline.filter(isRecord) as StudioTimelineRow[])
        : [];
      return {
        lesson: parsedLesson.data,
        timeline,
        transcript: readString(studio.transcript),
      };
    }
  }

  return buildLessonFromSandboxedSpec(value, persistedLesson);
}

export function createPersistedStudioSpec(
  input: PersistedStudioSpecInput
): Record<string, unknown> {
  const parsedLesson = safeParseLessonDocument(input.lesson);
  if (!parsedLesson.success) {
    throw new Error("Cannot persist invalid Studio lesson state.");
  }

  return {
    ...input.artifactSpec,
    studio: {
      lesson: parsedLesson.data,
      timeline: input.timeline.map((row) => ({ ...row })),
      runId: input.runId,
      transcript: input.transcript,
      completedAt: input.completedAt,
    },
  };
}
