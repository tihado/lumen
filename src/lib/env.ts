import { z } from "zod";
import type { ProviderReadiness } from "@/lib/orchestrator/stream-events";

export type { ProviderReadiness } from "@/lib/orchestrator/stream-events";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  FAL_KEY: z.string().optional(),
  PIONEER_API_URL: z.string().url().optional(),
  PIONEER_API_KEY: z.string().optional(),
  SLNG_API_KEY: z.string().optional(),
  SLNG_API_BASE_URL: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof envSchema> & {
  mode: "development" | "production" | "test";
};

function readRawEnv(): Record<string, string | undefined> {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    FAL_KEY: process.env.FAL_KEY,
    PIONEER_API_URL: process.env.PIONEER_API_URL,
    PIONEER_API_KEY: process.env.PIONEER_API_KEY,
    SLNG_API_KEY: process.env.SLNG_API_KEY,
    SLNG_API_BASE_URL: process.env.SLNG_API_BASE_URL,
  };
}

export function getAppEnv(): AppEnv {
  const parsed = envSchema.safeParse(readRawEnv());
  const base = parsed.success ? parsed.data : {};
  return {
    ...base,
    mode:
      process.env.NODE_ENV === "production"
        ? "production"
        : process.env.NODE_ENV === "test"
          ? "test"
          : "development",
  };
}

export function getProviderReadiness(
  env: AppEnv = getAppEnv()
): ProviderReadiness {
  return {
    llm: Boolean(env.OPENAI_API_KEY),
    tavily: Boolean(env.TAVILY_API_KEY),
    fal: Boolean(env.FAL_KEY),
    pioneer: Boolean(env.PIONEER_API_URL),
    slng: Boolean(env.SLNG_API_KEY && env.SLNG_API_BASE_URL),
  };
}
