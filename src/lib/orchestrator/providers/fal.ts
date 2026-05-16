import type { AppEnv } from "@/lib/env";

export type FalImageResult = {
  url: string;
  mime: string;
  width?: number;
  height?: number;
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
  const model = process.env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell";
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
