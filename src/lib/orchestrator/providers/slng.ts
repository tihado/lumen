import type { AppEnv } from "@/lib/env";

const DEFAULT_SLNG_BASE_URL = "https://api.slng.ai";
const DEFAULT_SLNG_TTS_MODEL = "slng/deepgram/aura:2";
const DEFAULT_SLNG_STT_MODEL = "slng/deepgram/nova:3";

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

function slngBaseUrl(env: AppEnv) {
  return (env.SLNG_API_BASE_URL ?? DEFAULT_SLNG_BASE_URL).replace(/\/+$/, "");
}

export function slngTtsModel(env: AppEnv) {
  return env.SLNG_TTS_MODEL ?? DEFAULT_SLNG_TTS_MODEL;
}

export function slngSttModel(env: AppEnv) {
  return env.SLNG_STT_MODEL ?? DEFAULT_SLNG_STT_MODEL;
}

export async function slngTextToSpeech(input: {
  text: string;
  env: AppEnv;
}): Promise<{ bytes: ArrayBuffer; mime: string; model: string }> {
  const key = input.env.SLNG_API_KEY;
  if (!key) {
    throw new Error("SLNG_API_KEY missing");
  }
  const model = slngTtsModel(input.env);
  const res = await fetch(`${slngBaseUrl(input.env)}/v1/tts/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: input.text }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SLNG TTS HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return {
    bytes: await res.arrayBuffer(),
    mime: res.headers.get("content-type") ?? "audio/wav",
    model,
  };
}

export async function slngSpeechToText(input: {
  audio: Blob;
  language?: string;
  env: AppEnv;
}): Promise<{
  text: string;
  transcript?: string;
  confidence?: number;
  duration?: number;
  language?: string;
  model: string;
}> {
  const key = input.env.SLNG_API_KEY;
  if (!key) {
    throw new Error("SLNG_API_KEY missing");
  }
  const model = slngSttModel(input.env);
  const body = new FormData();
  body.set("audio", input.audio, "audio.webm");
  if (input.language) {
    body.set("language", input.language);
  }
  const res = await fetch(`${slngBaseUrl(input.env)}/v1/stt/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SLNG STT HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    text?: string;
    transcript?: string;
    confidence?: number;
    duration?: number;
    language?: string;
  };
  return {
    text: data.text ?? data.transcript ?? "",
    transcript: data.transcript,
    confidence: data.confidence,
    duration: data.duration,
    language: data.language,
    model,
  };
}
