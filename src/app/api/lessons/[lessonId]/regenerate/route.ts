import { getAppEnv, getProviderReadiness } from "@/lib/env";
import { getLessonWithCurrentVersion } from "@/lib/lesson/repository";
import { generateLessonStream } from "@/lib/orchestrator/generate-lesson";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const existing = await getLessonWithCurrentVersion(lessonId);
  if (!existing) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  let prompt = existing.lesson.prompt;
  try {
    const body = (await request.json()) as { prompt?: string };
    if (typeof body.prompt === "string" && body.prompt.trim()) {
      prompt = body.prompt.trim();
    }
  } catch {
    /* empty body is allowed */
  }

  const env = getAppEnv();
  const readiness = getProviderReadiness(env);
  let failed: string | null = null;
  for await (const ev of generateLessonStream({
    transcript: prompt,
    lessonId,
    env,
    readiness,
  })) {
    if (ev.type === "run_failed") {
      failed = ev.message;
    }
  }

  if (failed) {
    return Response.json({ error: failed }, { status: 500 });
  }
  const updated = await getLessonWithCurrentVersion(lessonId);
  return Response.json(updated);
}
