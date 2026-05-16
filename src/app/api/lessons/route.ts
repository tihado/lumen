import { listLessons } from "@/lib/lesson/repository";

export const runtime = "nodejs";

export async function GET() {
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
