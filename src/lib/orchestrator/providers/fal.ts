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

type FalFile = {
  url?: string;
  content_type?: string;
  contentType?: string;
  file_name?: string;
  fileName?: string;
  file_size?: number;
  fileSize?: number;
};

type FalVideoResponse = {
  video?: FalFile;
  videos?: FalFile[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function falApiKey(env: AppEnv) {
  return env.FAL_API_KEY ?? env.FAL_KEY;
}

function imageRequestBody(prompt: string, model: string) {
  if (model === "fal-ai/nano-banana-2") {
    return {
      prompt,
      image_size: "landscape_4_3",
      num_images: 1,
      output_format: "png",
      safety_tolerance: "4",
      sync_mode: false,
      resolution: "1K",
      limit_generations: true,
      enable_web_search: false,
    };
  }

  return {
    prompt,
    image_size: "landscape_4_3",
    num_images: 1,
  };
}

function parseFalImageResponse(data: unknown): FalImageResult {
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const image =
    Array.isArray(record.images) && record.images[0]
      ? record.images[0]
      : record.image;
  const imageRecord =
    image && typeof image === "object"
      ? (image as Record<string, unknown>)
      : {};
  const url = typeof imageRecord.url === "string" ? imageRecord.url : undefined;
  if (!url) {
    throw new Error("fal image response missing image.url");
  }
  const mime =
    typeof imageRecord.content_type === "string"
      ? imageRecord.content_type
      : typeof imageRecord.contentType === "string"
        ? imageRecord.contentType
        : "image/png";
  const width =
    typeof imageRecord.width === "number" && Number.isFinite(imageRecord.width)
      ? imageRecord.width
      : undefined;
  const height =
    typeof imageRecord.height === "number" &&
    Number.isFinite(imageRecord.height)
      ? imageRecord.height
      : undefined;

  return {
    url,
    mime,
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  };
}

/** Generates a fal image and keeps the provider-hosted URL for persisted HTML. */
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
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      "X-Fal-Request-Timeout": "120",
    },
    body: JSON.stringify(imageRequestBody(prompt, model)),
  });
  const result = parseFalImageResponse(
    await readJsonResponse<unknown>(res, "image")
  );
  console.info("[fal] image ready", {
    model,
    width: result.width,
    height: result.height,
    durationMs: Date.now() - startedAt,
  });
  return result;
}

export function fallbackFalImage(topic: string): FalImageResult {
  return {
    url: `https://picsum.photos/seed/${encodeURIComponent(topic.slice(0, 24))}/800/600`,
    mime: "image/jpeg",
    width: 800,
    height: 600,
  };
}

function videoRequestBody(prompt: string) {
  return {
    prompt,
    aspect_ratio: "16:9",
    duration: "6s",
    resolution: "720p",
    generate_audio: true,
    auto_fix: true,
    safety_tolerance: "4",
  };
}

async function readJsonResponse<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    console.warn(`[fal] ${label} response body`, {
      status: res.status,
      bodyPreview: text.slice(0, 500),
    });
    throw new Error(`fal ${label} HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return JSON.parse(text) as T;
}

function parseFalVideoResponse(data: FalVideoResponse): FalVideoResult {
  const video = data.video ?? data.videos?.[0];
  if (!video?.url) {
    console.warn("[fal] video response missing url", {
      responseKeys: Object.keys(data),
    });
    throw new Error("fal response missing video.url");
  }
  return {
    url: video.url,
    mime: video.content_type ?? video.contentType ?? "video/mp4",
    fileName: video.file_name ?? video.fileName,
    fileSize: video.file_size ?? video.fileSize,
  };
}

function unwrapQueueResult(data: unknown): FalVideoResponse {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (record.data && typeof record.data === "object") {
      return record.data as FalVideoResponse;
    }
    if (record.payload && typeof record.payload === "object") {
      return record.payload as FalVideoResponse;
    }
  }
  return data as FalVideoResponse;
}

/**
 * Submits a fal text-to-video job. Override model with FAL_VIDEO_MODEL.
 *
 * The default endpoint is Veo 3.1 fast, whose documented response includes
 * `video.url`. Other fal video models often return the same shape, but this
 * parser also accepts `videos[0].url` for compatibility. Video models can run
 * long enough for direct fal.run requests to time out, so this uses fal's queue
 * API and polls for the result instead.
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
  const url = `https://queue.fal.run/${model}`;
  const startedAt = Date.now();
  console.info("[fal] video request started", {
    model,
    promptLength: prompt.length,
  });
  const submitRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      "X-Fal-Request-Timeout": "180",
    },
    body: JSON.stringify(videoRequestBody(prompt)),
  });
  console.info("[fal] video queue submitted", {
    model,
    status: submitRes.status,
    ok: submitRes.ok,
    durationMs: Date.now() - startedAt,
  });

  const submitted = await readJsonResponse<{
    request_id?: string;
    status_url?: string;
    response_url?: string;
  }>(submitRes, "video queue submit");

  if (
    !(submitted.request_id && submitted.status_url && submitted.response_url)
  ) {
    throw new Error("fal video queue response missing request URLs");
  }

  const statusUrl = submitted.status_url;
  let responseUrl = submitted.response_url;
  const deadline = Date.now() + 175_000;

  while (Date.now() < deadline) {
    await sleep(3000);
    const statusRes = await fetch(`${statusUrl}?logs=1`, {
      headers: { Authorization: `Key ${key}` },
    });
    const status = await readJsonResponse<{
      status?: string;
      response_url?: string;
      error?: string;
      error_type?: string;
    }>(statusRes, "video queue status");

    if (status.response_url) {
      responseUrl = status.response_url;
    }
    if (status.status === "COMPLETED") {
      if (status.error) {
        throw new Error(
          `fal video generation failed: ${status.error_type ?? status.error}`
        );
      }
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${key}` },
      });
      const result = unwrapQueueResult(
        await readJsonResponse<unknown>(resultRes, "video queue result")
      );
      const parsed = parseFalVideoResponse(result);
      console.info("[fal] video ready", {
        model,
        requestId: submitted.request_id,
        mime: parsed.mime,
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        durationMs: Date.now() - startedAt,
      });
      return parsed;
    }
  }

  throw new Error(
    `fal video queue timed out after ${Date.now() - startedAt}ms (${submitted.request_id})`
  );
}

export function fallbackFalVideo(topic: string): FalVideoResult {
  const q = encodeURIComponent(topic.slice(0, 80));
  return {
    url: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?topic=${q}`,
    mime: "video/mp4",
    fileName: "fallback-demo-video.mp4",
  };
}
