import { afterEach, describe, expect, it } from "vitest";
import { getAppEnv, getProviderReadiness } from "./env";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getAppEnv", () => {
  it("treats blank optional env values as unset without dropping valid keys", () => {
    process.env.FAL_KEY = "test-fal-key";
    process.env.FAL_IMAGE_MODEL = "fal-ai/flux/schnell";
    process.env.PIONEER_API_URL = "";

    const env = getAppEnv();
    const readiness = getProviderReadiness(env);

    expect(env.FAL_KEY).toBe("test-fal-key");
    expect(env.PIONEER_API_URL).toBeUndefined();
    expect(readiness.fal).toBe(true);
    expect(readiness.pioneer).toBe(false);
  });
});
