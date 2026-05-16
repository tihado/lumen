import { createFal, type FalVideoModelOptions } from "@ai-sdk/fal";
import { generateImage, experimental_generateVideo as generateVideo } from "ai";
import type { AppEnv } from "@/lib/env";

export type FalImageResult = {
  url: string;
  mime: string;
  width?: number;
  height?: number;
};

export type FalVideoResult = {
  url: string;
  mime: string;
  fileName?: string;
  fileSize?: number;
};

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function falApiKey(env: AppEnv) {
  return env.FAL_API_KEY ?? env.FAL_KEY;
}

function dataUrl(file: { base64: string; mediaType: string }) {
  return `data:${file.mediaType};base64,${file.base64}`;
}

function firstFalImageMetadata(providerMetadata: unknown) {
  const image = (
    providerMetadata as {
      fal?: { images?: Record<string, unknown>[] };
    }
  ).fal?.images?.[0];
  return {
    width: optionalNumber(image?.width),
    height: optionalNumber(image?.height),
    mime:
      typeof image?.contentType === "string" ? image.contentType : undefined,
  };
}

function firstFalVideoMetadata(providerMetadata: unknown) {
  const video = (
    providerMetadata as {
      fal?: { videos?: Record<string, unknown>[] };
    }
  ).fal?.videos?.[0];
  return {
    url: typeof video?.url === "string" ? video.url : undefined,
    mime:
      typeof video?.contentType === "string" ? video.contentType : undefined,
    fileName: typeof video?.fileName === "string" ? video.fileName : undefined,
    fileSize: optionalNumber(video?.fileSize),
  };
}

function imageGenerationOptions(model: string) {
  if (model === "fal-ai/nano-banana-2") {
    return {
      outputFormat: "png",
      safetyTolerance: "4",
      syncMode: false,
      resolution: "1K",
      limit_generations: true,
      enable_web_search: false,
    };
  }

  return {};
}

/**
 * Generates a fal image through the AI SDK. Override model with FAL_IMAGE_MODEL.
 */
export async function falGenerateImage(
  prompt: string,
  env: AppEnv
): Promise<FalImageResult> {
  const key = falApiKey(env);
  if (!key) {
    throw new Error("FAL_API_KEY or FAL_KEY missing");
  }
  const model = env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell";
  const startedAt = Date.now();
  console.info("[fal] image request started", {
    model,
    promptLength: prompt.length,
  });
  const provider = createFal({ apiKey: key });
  const options = imageGenerationOptions(model);
  const result = await generateImage({
    model: provider.image(model),
    prompt,
    n: 1,
    aspectRatio: "4:3",
    providerOptions: {
      fal: options,
    },
  });
  const metadata = firstFalImageMetadata(result.providerMetadata);
  const width = metadata.width;
  const height = metadata.height;
  console.info("[fal] image ready", {
    model,
    width,
    height,
    warnings: result.warnings.length,
    durationMs: Date.now() - startedAt,
  });
  return {
    url: dataUrl(result.image),
    mime: metadata.mime ?? result.image.mediaType,
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  };
}

export function fallbackFalImage(topic: string): FalImageResult {
  return {
    url: `https://picsum.photos/seed/${encodeURIComponent(topic.slice(0, 24))}/800/600`,
    mime: "image/jpeg",
    width: 800,
    height: 600,
  };
}

/**
 * Generates a fal text-to-video job through the AI SDK. Override model with
 * FAL_VIDEO_MODEL.
 */
export async function falGenerateVideo(
  prompt: string,
  env: AppEnv
): Promise<FalVideoResult> {
  const key = falApiKey(env);
  if (!key) {
    throw new Error("FAL_API_KEY or FAL_KEY missing");
  }
  const model = env.FAL_VIDEO_MODEL ?? "fal-ai/veo3.1/fast";
  const startedAt = Date.now();
  console.info("[fal] video request started", {
    model,
    promptLength: prompt.length,
  });
  const provider = createFal({ apiKey: key });
  const result = await generateVideo({
    model: provider.video(model),
    prompt,
    aspectRatio: "16:9",
    duration: 6,
    providerOptions: {
      fal: {
        resolution: "720p",
        generate_audio: true,
        pollTimeoutMs: 600_000,
      } satisfies FalVideoModelOptions,
    },
  });
  const video = firstFalVideoMetadata(result.providerMetadata);
  const url = video.url ?? dataUrl(result.video);
  console.info("[fal] video ready", {
    model,
    mime: video.mime ?? result.video.mediaType,
    fileName: video.fileName,
    fileSize: video.fileSize,
    warnings: result.warnings.length,
    durationMs: Date.now() - startedAt,
  });
  return {
    url,
    mime: video.mime ?? result.video.mediaType,
    fileName: video.fileName,
    fileSize: video.fileSize,
  };
}

export function fallbackFalVideo(topic: string): FalVideoResult {
  const q = encodeURIComponent(topic.slice(0, 80));
  return {
    url: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?topic=${q}`,
    mime: "video/mp4",
    fileName: "fallback-demo-video.mp4",
  };
}
