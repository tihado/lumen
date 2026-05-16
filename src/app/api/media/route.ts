import { getAppEnv, getProviderReadiness } from "@/lib/env";
import { mirrorRemoteAssetToS3 } from "@/lib/media/s3-storage";
import {
  falGenerateImage,
  falGenerateVideo,
  fallbackFalImage,
  fallbackFalVideo,
} from "@/lib/orchestrator/providers/fal";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let prompt = "";
  let modality: "image" | "video" = "image";
  try {
    const body = (await request.json()) as {
      prompt?: string;
      modality?: "image" | "video";
    };
    prompt = String(body.prompt ?? "").trim();
    modality = body.modality === "video" ? "video" : "image";
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
      const img =
        modality === "video"
          ? await falGenerateVideo(prompt, env)
          : await falGenerateImage(prompt, env);
      const asset = await mirrorRemoteAssetToS3({
        asset: img,
        lessonId: "manual",
        nodeId: modality,
        env,
      }).catch(() => img);
      return Response.json({
        usedFallback: false,
        modality,
        asset,
      });
    }
  } catch {
    /* fall through */
  }
  const fb =
    modality === "video" ? fallbackFalVideo(prompt) : fallbackFalImage(prompt);
  return Response.json({
    usedFallback: true,
    modality,
    asset: fb,
  });
}
