import { getAppEnv } from "@/lib/env";
import { lessonDocumentSchema } from "@/lib/lesson/schema";
import { reviseCanvasLesson } from "@/lib/orchestrator/providers/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      lesson?: unknown;
      instruction?: unknown;
    };
    const instruction = String(body.instruction ?? "").trim();
    if (!instruction) {
      return Response.json({ error: "instruction required" }, { status: 400 });
    }
    const lesson = lessonDocumentSchema.parse(body.lesson);
    const result = await reviseCanvasLesson({
      lesson,
      instruction,
      env: getAppEnv(),
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}
