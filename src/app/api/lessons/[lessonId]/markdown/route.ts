import { getAppEnv, getDatabaseAvailability } from "@/lib/env";
import { lessonDocumentToMarkdown } from "@/lib/lesson/markdown";
import { getLessonWithCurrentVersion } from "@/lib/lesson/repository";
import { readStudioState } from "@/lib/lesson/studio-state";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const database = getDatabaseAvailability(getAppEnv());
  if (!database.configured) {
    return Response.json(
      {
        error: database.message,
        code: database.code,
        action: database.action,
      },
      { status: 503 }
    );
  }

  try {
    const result = await getLessonWithCurrentVersion(lessonId);
    if (!result) {
      return Response.json({ error: "Lesson not found" }, { status: 404 });
    }
    if (!result.version) {
      return Response.json(
        { error: "Lesson has no saved version yet" },
        { status: 404 }
      );
    }

    const studioState = readStudioState(result.version.spec, {
      id: result.lesson.id,
      title: result.lesson.title,
      prompt: result.lesson.prompt,
    });

    if (!studioState) {
      return Response.json(
        { error: "Lesson markdown is unavailable for this version" },
        { status: 422 }
      );
    }

    return new Response(lessonDocumentToMarkdown(studioState.lesson), {
      headers: {
        "Content-Disposition": `inline; filename="${result.lesson.slug}.md"`,
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
