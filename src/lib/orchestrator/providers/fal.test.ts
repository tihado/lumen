import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "@/lib/env";
import { falGenerateImage, falGenerateVideo } from "./fal";

function testEnv(model: string, videoModel = "fal-ai/veo3.1/fast"): AppEnv {
  return {
    FAL_KEY: "test-fal-key",
    FAL_IMAGE_MODEL: model,
    FAL_VIDEO_MODEL: videoModel,
    mode: "test",
  } as AppEnv;
}

describe("falGenerateImage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it("uses the fal queue API for video generation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          request_id: "request-1",
          status_url:
            "https://queue.fal.run/fal-ai/veo3.1/fast/requests/request-1/status",
          response_url:
            "https://queue.fal.run/fal-ai/veo3.1/fast/requests/request-1/response",
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "IN_PROGRESS",
          response_url:
            "https://queue.fal.run/fal-ai/veo3.1/fast/requests/request-1/response",
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "COMPLETED",
          response_url:
            "https://queue.fal.run/fal-ai/veo3.1/fast/requests/request-1/response",
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          video: {
            url: "https://example.com/generated.mp4",
            content_type: "video/mp4",
            file_name: "generated.mp4",
            file_size: 1234,
          },
        })
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const generation = falGenerateVideo(
      "Show evaporation and condensation in motion.",
      testEnv("fal-ai/nano-banana-2")
    );
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    const result = await generation;

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://queue.fal.run/fal-ai/veo3.1/fast",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          prompt: "Show evaporation and condensation in motion.",
          aspect_ratio: "16:9",
          duration: "6s",
          resolution: "720p",
          generate_audio: true,
          auto_fix: true,
          safety_tolerance: "4",
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://queue.fal.run/fal-ai/veo3.1/fast/requests/request-1/status?logs=1",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://queue.fal.run/fal-ai/veo3.1/fast/requests/request-1/response",
      expect.any(Object)
    );
    expect(result).toEqual({
      url: "https://example.com/generated.mp4",
      mime: "video/mp4",
      fileName: "generated.mp4",
      fileSize: 1234,
    });
  });
});
