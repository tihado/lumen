import { z } from "zod";
import type { ProviderReadiness } from "@/lib/orchestrator/stream-events";

export type { ProviderReadiness } from "@/lib/orchestrator/stream-events";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_CODE_MODEL: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  FAL_API_KEY: z.string().optional(),
  FAL_KEY: z.string().optional(),
  FAL_IMAGE_MODEL: z.string().optional(),
  FAL_VIDEO_MODEL: z.string().optional(),
  PIONEER_API_URL: z.string().url().optional(),
  PIONEER_API_KEY: z.string().optional(),
  PIONEER_MODEL_ID: z.string().optional(),
  SLNG_API_KEY: z.string().optional(),
  SLNG_API_BASE_URL: z.string().url().optional(),
  SLNG_AGENT_API_BASE_URL: z.string().url().optional(),
  SLNG_AGENT_ID: z.string().optional(),
  SLNG_TTS_MODEL: z.string().optional(),
  SLNG_STT_MODEL: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SESSION_TOKEN: z.string().optional(),
  S3_ENDPOINT_URL: z.string().url().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
  S3_PREFIX: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema> & {
  mode: "development" | "production" | "test";
};

export type DatabaseAvailability =
  | { configured: true }
  | {
      configured: false;
      code: "database_url_missing";
      message: string;
      action: string;
    };

export const MISSING_DATABASE_URL_MESSAGE =
  "Lesson saving is not configured yet. Add DATABASE_URL to your environment and run the database migrations before generating or opening saved lessons.";

export const MISSING_DATABASE_URL_ACTION =
  "Set DATABASE_URL in .env.local, then run pnpm run db:migrate and restart the dev server.";

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readRawEnv(): Record<string, string | undefined> {
  return {
    OPENAI_API_KEY: optionalEnv(process.env.OPENAI_API_KEY),
    OPENAI_MODEL: optionalEnv(process.env.OPENAI_MODEL),
    OPENAI_CODE_MODEL: optionalEnv(process.env.OPENAI_CODE_MODEL),
    TAVILY_API_KEY: optionalEnv(process.env.TAVILY_API_KEY),
    FAL_API_KEY: optionalEnv(process.env.FAL_API_KEY),
    FAL_KEY: optionalEnv(process.env.FAL_KEY),
    FAL_IMAGE_MODEL: optionalEnv(process.env.FAL_IMAGE_MODEL),
    FAL_VIDEO_MODEL: optionalEnv(process.env.FAL_VIDEO_MODEL),
    PIONEER_API_URL: optionalEnv(process.env.PIONEER_API_URL),
    PIONEER_API_KEY: optionalEnv(process.env.PIONEER_API_KEY),
    PIONEER_MODEL_ID: optionalEnv(process.env.PIONEER_MODEL_ID),
    SLNG_API_KEY: optionalEnv(process.env.SLNG_API_KEY),
    SLNG_API_BASE_URL: optionalEnv(process.env.SLNG_API_BASE_URL),
    SLNG_AGENT_API_BASE_URL: optionalEnv(process.env.SLNG_AGENT_API_BASE_URL),
    SLNG_AGENT_ID: optionalEnv(process.env.SLNG_AGENT_ID),
    SLNG_TTS_MODEL: optionalEnv(process.env.SLNG_TTS_MODEL),
    SLNG_STT_MODEL: optionalEnv(process.env.SLNG_STT_MODEL),
    DATABASE_URL: optionalEnv(process.env.DATABASE_URL),
    S3_BUCKET: optionalEnv(process.env.S3_BUCKET),
    AWS_REGION: optionalEnv(process.env.AWS_REGION),
    AWS_ACCESS_KEY_ID: optionalEnv(process.env.AWS_ACCESS_KEY_ID),
    AWS_SECRET_ACCESS_KEY: optionalEnv(process.env.AWS_SECRET_ACCESS_KEY),
    AWS_SESSION_TOKEN: optionalEnv(process.env.AWS_SESSION_TOKEN),
    S3_ENDPOINT_URL: optionalEnv(process.env.S3_ENDPOINT_URL),
    S3_PUBLIC_BASE_URL: optionalEnv(process.env.S3_PUBLIC_BASE_URL),
    S3_PREFIX: optionalEnv(process.env.S3_PREFIX),
    S3_FORCE_PATH_STYLE: optionalEnv(process.env.S3_FORCE_PATH_STYLE),
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
    fal: Boolean(env.FAL_API_KEY ?? env.FAL_KEY),
    pioneer: Boolean(env.PIONEER_API_URL && env.PIONEER_API_KEY),
    slng: Boolean(env.SLNG_API_KEY && env.SLNG_API_BASE_URL),
  };
}

export function getDatabaseAvailability(
  env: AppEnv = getAppEnv()
): DatabaseAvailability {
  if (env.DATABASE_URL) {
    return { configured: true };
  }

  return {
    configured: false,
    code: "database_url_missing",
    message: MISSING_DATABASE_URL_MESSAGE,
    action: MISSING_DATABASE_URL_ACTION,
  };
}
