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
  const startedAt = Date.now();
  console.info("[fal] image request started", {
    model,
    promptLength: prompt.length,
  });
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
  console.info("[fal] image response received", {
    model,
    status: res.status,
    ok: res.ok,
    durationMs: Date.now() - startedAt,
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("[fal] image response body", {
      model,
      status: res.status,
      bodyPreview: text.slice(0, 500),
    });
    throw new Error(`fal HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    images?: Array<{ url: string; width?: number; height?: number }>;
  };
  const img = data.images?.[0];
  if (!img?.url) {
    console.warn("[fal] image response missing url", {
      model,
      responseKeys: Object.keys(data),
    });
    throw new Error("fal response missing images[0].url");
  }
  console.info("[fal] image ready", {
    model,
    width: img.width,
    height: img.height,
    durationMs: Date.now() - startedAt,
  });
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
  const startedAt = Date.now();
  console.info("[fal] video request started", {
    model,
    promptLength: prompt.length,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "16:9",
      duration: "6s",
      resolution: "720p",
      generate_audio: true,
    }),
  });
  console.info("[fal] video response received", {
    model,
    status: res.status,
    ok: res.ok,
    durationMs: Date.now() - startedAt,
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn("[fal] video response body", {
      model,
      status: res.status,
      bodyPreview: text.slice(0, 500),
    });
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
    console.warn("[fal] video response missing url", {
      model,
      responseKeys: Object.keys(data),
    });
    throw new Error("fal response missing video.url");
  }
  console.info("[fal] video ready", {
    model,
    mime: video.content_type,
    fileName: video.file_name,
    fileSize: video.file_size,
    durationMs: Date.now() - startedAt,
  });
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
