import { z } from "zod";
import { getAppEnv } from "@/lib/env";
import {
  createSlngVoiceAgentWebSession,
  describeSlngVoiceAgentSetup,
} from "@/lib/orchestrator/providers/slng";

const requestSchema = z.object({
  participantName: z.string().trim().min(1).max(80).optional(),
  lessonTitle: z.string().trim().max(180).optional(),
  lessonSummary: z.string().trim().max(8000).optional(),
  transcript: z.string().trim().max(4000).optional(),
  lessonId: z.string().trim().max(120).optional(),
  demoMode: z.string().trim().max(80).optional(),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function logContext(extra?: Record<string, unknown>) {
  const env = getAppEnv();
  return {
    hasSlngApiKey: Boolean(env.SLNG_API_KEY),
    hasSlngAgentId: Boolean(env.SLNG_AGENT_ID),
    slngAgentApiBaseUrl: env.SLNG_AGENT_API_BASE_URL ?? "default",
    slngApiBaseUrl: env.SLNG_API_BASE_URL ?? "default",
    ...extra,
  };
}

function summarizeInput(input: z.infer<typeof requestSchema>) {
  return {
    demoMode: input.demoMode,
    hasLessonId: Boolean(input.lessonId),
    lessonId: input.lessonId,
    hasLessonTitle: Boolean(input.lessonTitle),
    lessonTitle: input.lessonTitle,
    lessonSummaryLength: input.lessonSummary?.length ?? 0,
    transcriptLength: input.transcript?.length ?? 0,
    participantName: input.participantName,
  };
}

const SLNG_AGENT_ARGUMENT_MAX_LENGTH = 1024;

function truncateForAgent(value: string | undefined, maxLength: number) {
  if (!value) {
    return "";
  }
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 22)}\n[context truncated]`
    : value;
}

function slngAgentArgument(value: string | undefined) {
  return truncateForAgent(value, SLNG_AGENT_ARGUMENT_MAX_LENGTH);
}

function corsHeaders(headers?: HeadersInit) {
  return {
    ...headers,
    ...CORS_HEADERS,
  };
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS, status: 204 });
}

export async function POST(request: Request) {
  const env = getAppEnv();
  const setup = describeSlngVoiceAgentSetup(env);
  if (!setup.ready) {
    console.warn(
      "[api/voice/agent-session] SLNG voice agent not configured",
      logContext({ hint: setup.hint })
    );
    return Response.json(
      { error: setup.hint },
      { headers: corsHeaders(), status: 503 }
    );
  }

  let input: z.infer<typeof requestSchema>;
  try {
    const raw = (await request.json()) as unknown;
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[api/voice/agent-session] Invalid request payload", {
        issues: parsed.error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: issue.path.join("."),
        })),
        rawType: typeof raw,
        rawKeys:
          typeof raw === "object" && raw !== null ? Object.keys(raw) : [],
      });
      return Response.json(
        {
          error: "Invalid voice agent session request.",
          issues: parsed.error.issues.map((issue) => ({
            message: issue.message,
            path: issue.path.join("."),
          })),
        },
        { headers: corsHeaders(), status: 400 }
      );
    }
    input = parsed.data;
  } catch (e) {
    console.warn("[api/voice/agent-session] Could not read JSON body", {
      error: e instanceof Error ? e.message : String(e),
    });
    return Response.json(
      { error: "Invalid JSON body for voice agent session request." },
      { headers: corsHeaders(), status: 400 }
    );
  }

  try {
    console.info(
      "[api/voice/agent-session] Creating SLNG voice agent session",
      logContext(summarizeInput(input))
    );
    const session = await createSlngVoiceAgentWebSession({
      env,
      participantName: input.participantName,
      arguments: {
        demo_mode: slngAgentArgument(input.demoMode ?? "lesson-rehearsal"),
        lesson_id: slngAgentArgument(input.lessonId ?? "unsaved"),
        lesson_title: slngAgentArgument(input.lessonTitle ?? "Untitled lesson"),
        lesson_summary: slngAgentArgument(input.lessonSummary),
        teacher_transcript: slngAgentArgument(input.transcript),
        product_context: slngAgentArgument(
          "Lumen is a voice-first lesson canvas. Help the teacher rehearse, ask one useful student-style question at a time, and suggest concrete lesson improvements."
        ),
      },
    });
    console.info("[api/voice/agent-session] SLNG voice agent session ready", {
      callId: session.callId,
      roomName: session.roomName,
      hasLivekitUrl: Boolean(session.livekitUrl),
      hasLivekitToken: Boolean(session.livekitToken),
      maxSessionSeconds: session.maxSessionSeconds,
    });
    return Response.json(session, { headers: corsHeaders() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      "[api/voice/agent-session] SLNG voice agent session failed",
      logContext({
        ...summarizeInput(input),
        error: message,
        stack: e instanceof Error ? e.stack : undefined,
      })
    );
    return Response.json(
      { error: message },
      { headers: corsHeaders(), status: 502 }
    );
  }
}
