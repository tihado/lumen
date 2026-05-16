import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "@/lib/env";
import { pioneerExtract } from "./pioneer";

function testEnv(): AppEnv {
  return {
    PIONEER_API_URL: "https://api.pioneer.ai",
    PIONEER_API_KEY: "test-pioneer-key",
    mode: "test",
  } as AppEnv;
}

describe("pioneerExtract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses Pioneer inference with API-key auth and GLiNER2 schema", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        entities: [
          { text: "photosynthesis", type: "concept" },
          { text: "chlorophyll", type: "term" },
          { text: "plants eat soil", type: "misconception" },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await pioneerExtract("Teach photosynthesis", testEnv());

    const [, request] = fetchMock.mock.calls[0] as unknown as [
      RequestInfo | URL,
      RequestInit,
    ];
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.pioneer.ai/inference",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-API-Key": "test-pioneer-key",
        }),
      })
    );
    expect(JSON.parse(String(request.body))).toEqual({
      model_id: "fastino/gliner2-base-v1",
      text: "Teach photosynthesis",
      schema: {
        entities: [
          "concept",
          "term",
          "misconception",
          "process",
          "object",
          "relationship",
          "measurement",
          "person",
          "place",
        ],
      },
      threshold: 0.35,
    });
    expect(result).toEqual([
      { label: "photosynthesis", kind: "concept" },
      { label: "chlorophyll", kind: "term" },
      { label: "plants eat soil", kind: "misconception" },
    ]);
  });

  it("normalizes grouped Pioneer entity responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          output: {
            entities: {
              concept: ["ecosystem"],
              term: [{ value: "habitat" }],
            },
          },
        })
      )
    );

    await expect(
      pioneerExtract("Teach ecosystems", testEnv())
    ).resolves.toEqual([
      { label: "ecosystem", kind: "concept" },
      { label: "habitat", kind: "term" },
    ]);
  });

  it("chunks long text to stay under GLiNER2 model limits", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        entities: [{ text: "water cycle", type: "process" }],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const longText = Array.from(
      { length: 180 },
      (_, index) =>
        `Sentence ${index} explains evaporation, condensation, and precipitation for students.`
    ).join(" ");

    const result = await pioneerExtract(longText, testEnv());

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    for (const [, request] of fetchMock.mock.calls as unknown as [
      RequestInfo | URL,
      RequestInit,
    ][]) {
      const body = JSON.parse(String(request.body)) as { text: string };
      expect(body.text.length).toBeLessThanOrEqual(2800);
    }
    expect(result).toEqual([{ label: "water cycle", kind: "process" }]);
  });
});
