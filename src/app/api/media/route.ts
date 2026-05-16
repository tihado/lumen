import { getAppEnv, getProviderReadiness } from "@/lib/env";
import { mirrorRemoteAssetToS3 } from "@/lib/media/s3-storage";
import {
  falGenerateImage,
  falGenerateVideo,
  fallbackFalImage,
  fallbackFalVideo,
} from "@/lib/orchestrator/providers/fal";

export const runtime = "nodejs";
export const maxDuration = 600;

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
      }).catch((error: unknown) => {
        console.warn("[api/media] S3 mirror failed, using fal URL", {
          modality,
          error: error instanceof Error ? error.message : String(error),
        });
        return img;
      });
      console.info("[api/media] media generation completed with fal", {
        modality,
        mirroredToS3: asset.url !== img.url,
      });
      return Response.json({
        usedFallback: false,
        modality,
        asset,
      });
    }
    console.warn("[api/media] fal not ready, using fallback media", {
      modality,
      hasFalKey: Boolean(env.FAL_KEY),
    });
  } catch (error) {
    console.error("[api/media] fal generation failed, using fallback media", {
      modality,
      error: error instanceof Error ? error.message : String(error),
    });
    /* fall through */
  }
  const fb =
    modality === "video" ? fallbackFalVideo(prompt) : fallbackFalImage(prompt);
  console.info("[api/media] fallback media returned", {
    modality,
    url: fb.url,
  });
  return Response.json({
    usedFallback: true,
    modality,
    asset: fb,
  });
}
