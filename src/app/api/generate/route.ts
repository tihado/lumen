import {
  getAppEnv,
  getDatabaseAvailability,
  getProviderReadiness,
} from "@/lib/env";
import { generateLessonStream } from "@/lib/orchestrator/generate-lesson";
import type { StreamEvent } from "@/lib/orchestrator/stream-events";

export const runtime = "nodejs";
export const maxDuration = 120;

function streamEvents(events: StreamEvent[], init?: ResponseInit) {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const ev of events) {
          controller.enqueue(enc.encode(`${JSON.stringify(ev)}\n`));
        }
        controller.close();
      },
    }),
    {
      ...init,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        ...init?.headers,
      },
    }
  );
}

export async function POST(request: Request) {
  let transcript = "";
  let lessonId: string | undefined;
  try {
    const body = (await request.json()) as {
      transcript?: string;
      lessonId?: string;
    };
    transcript = String(body.transcript ?? "").trim();
    lessonId =
      typeof body.lessonId === "string" && body.lessonId.length > 0
        ? body.lessonId
        : undefined;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!transcript) {
    return Response.json(
      { error: "transcript is required (or use typed intent in studio)" },
      { status: 400 }
    );
  }

  const env = getAppEnv();
  const readiness = getProviderReadiness(env);
  const database = getDatabaseAvailability(env);

  if (!database.configured) {
    return streamEvents(
      [
        {
          type: "run_failed",
          runId: "local",
          message: database.message,
        },
      ],
      { status: 200 }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const ev of generateLessonStream({
          transcript,
          lessonId,
          env,
          readiness,
        })) {
          controller.enqueue(enc.encode(`${JSON.stringify(ev)}\n`));
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        controller.enqueue(
          enc.encode(
            `${JSON.stringify({ type: "run_failed", runId: "local", message })}\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
