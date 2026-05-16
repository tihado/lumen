import { getAppEnv, getProviderReadiness } from "@/lib/env";
import {
  falGenerateImage,
  fallbackFalImage,
} from "@/lib/orchestrator/providers/fal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let prompt = "";
  try {
    const body = (await request.json()) as { prompt?: string };
    prompt = String(body.prompt ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!prompt) {
    return Response.json({ error: "prompt required" }, { status: 400 });
  }

  const env = getAppEnv();
  const readiness = getProviderReadiness(env);
  try {
    if (readiness.fal) {
      const img = await falGenerateImage(prompt, env);
      return Response.json({
        usedFallback: false,
        asset: img,
      });
    }
  } catch {
    /* fall through */
  }
  const fb = fallbackFalImage(prompt);
  return Response.json({
    usedFallback: true,
    asset: fb,
  });
}
