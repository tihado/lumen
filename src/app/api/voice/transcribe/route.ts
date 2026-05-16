import { getAppEnv, getProviderReadiness } from "@/lib/env";
import { slngSpeechToText } from "@/lib/orchestrator/providers/slng";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request: Request) {
  const env = getAppEnv();
  const readiness = getProviderReadiness(env);
  if (!readiness.slng) {
    return Response.json(
      {
        error:
          "SLNG speech-to-text unavailable. Set SLNG_API_KEY and SLNG_API_BASE_URL.",
        usedFallback: true,
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart form data" },
      { status: 400 }
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return Response.json({ error: "audio file required" }, { status: 400 });
  }

  const language =
    typeof form.get("language") === "string"
      ? String(form.get("language"))
      : undefined;

  try {
    const result = await slngSpeechToText({ audio, language, env });
    return Response.json({ ...result, usedFallback: false });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e), usedFallback: true },
      { status: 502 }
    );
  }
}
