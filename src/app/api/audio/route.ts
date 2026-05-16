import { getAppEnv, getProviderReadiness } from "@/lib/env";
import { uploadGeneratedBytesToS3 } from "@/lib/media/s3-storage";
import { slngTextToSpeech } from "@/lib/orchestrator/providers/slng";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    { status: 503 }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = (url.searchParams.get("text") ?? "").trim();
  if (!text) {
    return Response.json({ error: "text required" }, { status: 400 });
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
    if (stored?.url) {
      return Response.redirect(stored.url, 302);
    }
    return new Response(audio.bytes, {
      headers: {
        "Content-Type": audio.mime,
        "Cache-Control": "public, max-age=3600",
        "X-SLNG-Model": audio.model,
      },
    });
  } catch (e) {
    logAudioError("GET", text, e);
    return Response.json(
      { error: e instanceof Error ? e.message : String(e), usedFallback: true },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = String(body.text ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!text) {
    return Response.json({ error: "text required" }, { status: 400 });
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
        "Content-Type": audio.mime,
        "Cache-Control": "no-store",
        "X-SLNG-Model": audio.model,
        ...(stored?.url ? { "X-Media-URL": stored.url } : {}),
      },
    });
  } catch (e) {
    logAudioError("POST", text, e);
    return Response.json(
      { error: e instanceof Error ? e.message : String(e), usedFallback: true },
      { status: 502 }
    );
  }
}
