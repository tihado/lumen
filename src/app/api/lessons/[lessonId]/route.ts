import { getAppEnv, getDatabaseAvailability } from "@/lib/env";
import { getLessonWithCurrentVersion } from "@/lib/lesson/repository";

export const runtime = "nodejs";

export async function GET(
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
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
