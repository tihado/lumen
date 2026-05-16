import { afterEach, describe, expect, it } from "vitest";
import {
  getAppEnv,
  getDatabaseAvailability,
  getProviderReadiness,
} from "./env";

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

  it("reports missing DATABASE_URL as an actionable app state", () => {
    process.env.DATABASE_URL = "";

    const database = getDatabaseAvailability(getAppEnv());

    expect(database.configured).toBe(false);
    if (!database.configured) {
      expect(database.code).toBe("database_url_missing");
      expect(database.message).toContain("DATABASE_URL");
      expect(database.action).toContain("pnpm run db:migrate");
    }
  });

  it("reports DATABASE_URL as configured when present", () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/next_learn";

    expect(getDatabaseAvailability(getAppEnv())).toEqual({ configured: true });
  });

  it("reads SLNG voice agent settings independently from core SLNG readiness", () => {
    process.env.SLNG_API_KEY = "test-slng-key";
    process.env.SLNG_API_BASE_URL = "https://api.slng.ai";
    process.env.SLNG_AGENT_API_BASE_URL = "https://api.agents.slng.ai";
    process.env.SLNG_AGENT_ID = "agent_123";

    const env = getAppEnv();

    expect(getProviderReadiness(env).slng).toBe(true);
    expect(env.SLNG_AGENT_API_BASE_URL).toBe("https://api.agents.slng.ai");
    expect(env.SLNG_AGENT_ID).toBe("agent_123");
  });
});
