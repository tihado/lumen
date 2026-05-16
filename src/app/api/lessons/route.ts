import { getAppEnv, getDatabaseAvailability } from "@/lib/env";
import { listLessons } from "@/lib/lesson/repository";

export const runtime = "nodejs";

export async function GET() {
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
    const rows = await listLessons();
    return Response.json({ lessons: rows });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
