import type { AppEnv } from "@/lib/env";

/** Server-side SLNG is optional; studio uses client + typed fallback. */
export function describeSlngClientSetup(env: AppEnv): {
  ready: boolean;
  hint: string;
} {
  const ready = Boolean(env.SLNG_API_KEY && env.SLNG_API_BASE_URL);
  return {
    ready,
    hint: ready
      ? "SLNG env present — wire client SDK in VoiceSessionController."
      : "Set SLNG_API_KEY and SLNG_API_BASE_URL for live voice, or use typed transcript.",
  };
}
