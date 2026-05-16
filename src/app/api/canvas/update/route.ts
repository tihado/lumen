import { nanoid } from "nanoid";
import { getAppEnv, getDatabaseAvailability } from "@/lib/env";
import { updateSandboxedLessonCode } from "@/lib/lesson/html-artifact";
import {
  getLessonWithCurrentVersion,
  saveLessonVersion,
} from "@/lib/lesson/repository";
import { type LessonDocument, lessonDocumentSchema } from "@/lib/lesson/schema";
import {
  createPersistedStudioSpec,
  readStudioState,
} from "@/lib/lesson/studio-state";
import {
  reviseCanvasLesson,
  reviseSandboxLessonCode,
} from "@/lib/orchestrator/providers/llm";
import type { StudioTimelineRow } from "@/lib/orchestrator/stream-events";

export const runtime = "nodejs";
export const maxDuration = 180;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatTeachingGuideContext(lesson: LessonDocument) {
  return JSON.stringify(
    {
      title: lesson.title,
      gradeBand: lesson.gradeBand,
      durationMinutes: lesson.durationMinutes,
      root: lesson.root,
      nodes: Object.values(lesson.nodes).map((node) => {
        if (node.type === "section") {
          return {
            id: node.id,
            type: node.type,
            title: node.title,
            summary: node.summary,
            children: node.children,
          };
        }
        return node;
      }),
      citations: lesson.citations.map((citation) => ({
        id: citation.id,
        title: citation.title,
        excerpt: citation.excerpt,
        nodeIds: citation.nodeIds,
      })),
    },
    null,
    2
  );
}

async function updateSavedSandbox(input: {
  lessonId: string;
  instruction: string;
  lesson: LessonDocument;
  teachingGuideContext?: string;
}) {
  const env = getAppEnv();
  const database = getDatabaseAvailability(env);
  if (!database.configured) {
    return {
      sandboxUpdated: false,
      sandboxProblem: database.message,
    };
  }

  const existing = await getLessonWithCurrentVersion(input.lessonId);
  if (!existing?.version) {
    return {
      sandboxUpdated: false,
      sandboxProblem: "No saved sandbox HTML version exists for this lesson.",
    };
  }

  const revision = await reviseSandboxLessonCode({
    html: existing.version.html,
    instruction: input.instruction,
    teachingGuideContext: input.teachingGuideContext,
    env,
  });
  if (!(revision.themeCss || revision.runtimeScript)) {
    return {
      sandboxUpdated: false,
      sandboxReply: revision.reply,
      sandboxProblem:
        revision.problem ?? "The code model did not return sandbox code.",
    };
  }

  const html = updateSandboxedLessonCode({
    html: existing.version.html,
    themeCss: revision.themeCss,
    runtimeScript: revision.runtimeScript,
  });
  const persistedSummary = {
    id: existing.lesson.id,
    title: existing.lesson.title,
    prompt: existing.lesson.prompt,
  };
  const priorState = readStudioState(existing.version.spec, persistedSummary);
  const timelineRow: StudioTimelineRow = {
    key: `sandbox-code-${nanoid(8)}`,
    provider: "llm",
    label: "Update sandbox HTML code",
    status: "completed",
    detail: revision.reply,
    usedFallback: revision.usedFallback,
    problem: revision.problem,
  };
  const artifactSpec = isRecord(existing.version.spec)
    ? existing.version.spec
    : {};
  await saveLessonVersion({
    lessonId: input.lessonId,
    title: input.lesson.title,
    html,
    spec: createPersistedStudioSpec({
      artifactSpec,
      lesson: input.lesson,
      timeline: [...(priorState?.timeline ?? []), timelineRow],
      runId: `sandbox-code-${nanoid(8)}`,
      transcript: priorState?.transcript ?? existing.lesson.prompt,
      completedAt: new Date().toISOString(),
    }),
  });

  return {
    sandboxUpdated: true,
    sandboxReply: revision.reply,
    sandboxModel: revision.model,
    sandboxTimelineRow: timelineRow,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      lesson?: unknown;
      instruction?: unknown;
      lessonId?: unknown;
      updateSandboxCode?: unknown;
      includeTeachingGuideContext?: unknown;
    };
    const instruction = String(body.instruction ?? "").trim();
    if (!instruction) {
      return Response.json({ error: "instruction required" }, { status: 400 });
    }
    const lesson = lessonDocumentSchema.parse(body.lesson);
    const lessonId =
      typeof body.lessonId === "string" && body.lessonId.trim()
        ? body.lessonId.trim()
        : lesson.id;
    const includeTeachingGuideContext =
      body.includeTeachingGuideContext === true;
    const teachingGuideContext = includeTeachingGuideContext
      ? formatTeachingGuideContext(lesson)
      : undefined;
    const result = await reviseCanvasLesson({
      lesson,
      instruction,
      env: getAppEnv(),
      teachingGuideContext,
    });
    if (body.updateSandboxCode !== true) {
      return Response.json(result);
    }
    const sandbox = await updateSavedSandbox({
      lessonId,
      instruction,
      lesson: result.lesson,
      teachingGuideContext: includeTeachingGuideContext
        ? formatTeachingGuideContext(result.lesson)
        : undefined,
    }).catch((error) => ({
      sandboxUpdated: false,
      sandboxProblem: error instanceof Error ? error.message : String(error),
    }));
    return Response.json({
      ...result,
      lessonId,
      ...sandbox,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}
