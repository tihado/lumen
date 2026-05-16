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

/**
 * Submits a fal image job (sync fal.run endpoint). Override model with FAL_IMAGE_MODEL.
 */
export async function falGenerateImage(
  prompt: string,
  env: AppEnv
): Promise<FalImageResult> {
  const key = env.FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY missing");
  }
  const model = env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell";
  const url = `https://fal.run/${model}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "landscape_4_3",
      num_images: 1,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    images?: Array<{ url: string; width?: number; height?: number }>;
  };
  const img = data.images?.[0];
  if (!img?.url) {
    throw new Error("fal response missing images[0].url");
  }
  return {
    url: img.url,
    mime: "image/png",
    width: img.width,
    height: img.height,
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
 * Submits a fal text-to-video job. Override model with FAL_VIDEO_MODEL.
 *
 * The default endpoint is Veo 3.1 fast, whose documented response includes
 * `video.url`. Other fal video models often return the same shape, but this
 * parser also accepts `videos[0].url` for compatibility.
 */
export async function falGenerateVideo(
  prompt: string,
  env: AppEnv
): Promise<FalVideoResult> {
  const key = env.FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY missing");
  }
  const model = env.FAL_VIDEO_MODEL ?? "fal-ai/veo3.1/fast";
  const url = `https://fal.run/${model}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "16:9",
      duration: "5s",
      resolution: "720p",
      generate_audio: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal video HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    video?: {
      url?: string;
      content_type?: string;
      file_name?: string;
      file_size?: number;
    };
    videos?: Array<{
      url?: string;
      content_type?: string;
      file_name?: string;
      file_size?: number;
    }>;
  };
  const video = data.video ?? data.videos?.[0];
  if (!video?.url) {
    throw new Error("fal response missing video.url");
  }
  return {
    url: video.url,
    mime: video.content_type ?? "video/mp4",
    fileName: video.file_name,
    fileSize: video.file_size,
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
