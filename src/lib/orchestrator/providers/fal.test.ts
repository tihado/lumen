import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "@/lib/env";
import { falGenerateImage } from "./fal";

function testEnv(model: string): AppEnv {
  return {
    FAL_KEY: "test-fal-key",
    FAL_IMAGE_MODEL: model,
    mode: "test",
  } as AppEnv;
}

describe("falGenerateImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the Nano Banana 2 input schema and omits null dimensions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        images: [
          {
            url: "https://example.com/generated.png",
            content_type: "image/png",
            width: null,
            height: null,
          },
        ],
        description: "",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await falGenerateImage(
      "Create a classroom-safe diagram.",
      testEnv("fal-ai/nano-banana-2")
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://fal.run/fal-ai/nano-banana-2",
      expect.objectContaining({
        body: JSON.stringify({
          prompt: "Create a classroom-safe diagram.",
          num_images: 1,
          aspect_ratio: "4:3",
          output_format: "png",
          safety_tolerance: "4",
          sync_mode: false,
          resolution: "1K",
          limit_generations: true,
          enable_web_search: false,
        }),
      })
    );
    expect(result).toEqual({
      url: "https://example.com/generated.png",
      mime: "image/png",
    });
  });
});
