import { getAppEnv, getProviderReadiness } from "@/lib/env";
import { uploadGeneratedBytesToS3 } from "@/lib/media/s3-storage";
import { slngTextToSpeech } from "@/lib/orchestrator/providers/slng";

export const runtime = "nodejs";
export const maxDuration = 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Content-Type, X-Media-URL, X-SLNG-Model",
};

function corsHeaders(headers?: HeadersInit) {
  return {
    ...headers,
    ...CORS_HEADERS,
  };
}

function audioLogContext(text: string) {
  return {
    textLength: text.length,
    textPreview: text.slice(0, 140),
  };
}

function logAudioError(method: "GET" | "POST", text: string, error: unknown) {
  console.error("[api/audio] TTS generation failed", {
    method,
    ...audioLogContext(text),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

function fallbackAudioResponse() {
  return Response.json(
    {
      error: "SLNG audio unavailable. Set SLNG_API_KEY and SLNG_API_BASE_URL.",
      usedFallback: true,
    },
    { headers: corsHeaders(), status: 503 }
  );
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS, status: 204 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = (url.searchParams.get("text") ?? "").trim();
  if (!text) {
    return Response.json(
      { error: "text required" },
      { headers: corsHeaders(), status: 400 }
    );
  }

  const env = getAppEnv();
  const readiness = getProviderReadiness(env);
  if (!readiness.slng) {
    console.warn("[api/audio] SLNG is not configured", {
      method: "GET",
      ...audioLogContext(text),
      hasSlngApiKey: Boolean(env.SLNG_API_KEY),
      hasSlngApiBaseUrl: Boolean(env.SLNG_API_BASE_URL),
    });
    return fallbackAudioResponse();
  }

  try {
    const audio = await slngTextToSpeech({
      text: text.slice(0, 1200),
      env,
    });
    const stored = await uploadGeneratedBytesToS3({
      bytes: audio.bytes,
      contentType: audio.mime,
      lessonId: "manual",
      nodeId: "audio",
      env,
    }).catch(() => null);
    return new Response(audio.bytes, {
      headers: {
        ...corsHeaders({
          "Cache-Control": "public, max-age=3600",
          "Content-Type": audio.mime,
          "X-SLNG-Model": audio.model,
          ...(stored?.url ? { "X-Media-URL": stored.url } : {}),
        }),
      },
    });
  } catch (e) {
    logAudioError("GET", text, e);
    return Response.json(
      { error: e instanceof Error ? e.message : String(e), usedFallback: true },
      { headers: corsHeaders(), status: 502 }
    );
  }
}

export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = String(body.text ?? "").trim();
  } catch {
    return Response.json(
      { error: "Invalid JSON" },
      { headers: corsHeaders(), status: 400 }
    );
  }
  if (!text) {
    return Response.json(
      { error: "text required" },
      { headers: corsHeaders(), status: 400 }
    );
  }

  const env = getAppEnv();
  const readiness = getProviderReadiness(env);
  if (!readiness.slng) {
    console.warn("[api/audio] SLNG is not configured", {
      method: "POST",
      ...audioLogContext(text),
      hasSlngApiKey: Boolean(env.SLNG_API_KEY),
      hasSlngApiBaseUrl: Boolean(env.SLNG_API_BASE_URL),
    });
    return fallbackAudioResponse();
  }

  try {
    const audio = await slngTextToSpeech({ text: text.slice(0, 1200), env });
    const stored = await uploadGeneratedBytesToS3({
      bytes: audio.bytes,
      contentType: audio.mime,
      lessonId: "manual",
      nodeId: "audio",
      env,
    }).catch(() => null);
    return new Response(audio.bytes, {
      headers: {
        ...corsHeaders({
          "Cache-Control": "no-store",
          "Content-Type": audio.mime,
          "X-SLNG-Model": audio.model,
          ...(stored?.url ? { "X-Media-URL": stored.url } : {}),
        }),
      },
    });
  } catch (e) {
    logAudioError("POST", text, e);
    return Response.json(
      { error: e instanceof Error ? e.message : String(e), usedFallback: true },
      { headers: corsHeaders(), status: 502 }
    );
  }
}
