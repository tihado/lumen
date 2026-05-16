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
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://example.com/generated.png") {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png" },
        });
      }
      return Response.json({
        images: [
          {
            url: "https://example.com/generated.png",
            content_type: "image/png",
            width: null,
            height: null,
          },
        ],
        description: "",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await falGenerateImage(
      "Create a classroom-safe diagram.",
      testEnv("fal-ai/nano-banana-2")
    );

    const [, request] = fetchMock.mock.calls[0] as unknown as [
      RequestInfo | URL,
      RequestInit,
    ];
    expect(fetchMock).toHaveBeenCalledWith(
      "https://fal.run/fal-ai/nano-banana-2",
      expect.objectContaining({
        body: expect.any(String),
      })
    );
    expect(JSON.parse(String(request.body))).toEqual({
      prompt: "Create a classroom-safe diagram.",
      image_size: "landscape_4_3",
      num_images: 1,
      output_format: "png",
      safety_tolerance: "4",
      sync_mode: false,
      resolution: "1K",
      limit_generations: true,
      enable_web_search: false,
    });
    expect(result).toEqual({
      url: "data:image/png;base64,iVBORw==",
      mime: "image/png",
    });
  });
});
