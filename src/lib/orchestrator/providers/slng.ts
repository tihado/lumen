import type { AppEnv } from "@/lib/env";

const DEFAULT_SLNG_BASE_URL = "https://api.slng.ai";
const DEFAULT_SLNG_AGENT_API_BASE_URL = "https://api.agents.slng.ai";
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

function slngAgentApiBaseUrl(env: AppEnv) {
  return (
    env.SLNG_AGENT_API_BASE_URL ?? DEFAULT_SLNG_AGENT_API_BASE_URL
  ).replace(/\/+$/, "");
}

export function slngTtsModel(env: AppEnv) {
  return env.SLNG_TTS_MODEL ?? DEFAULT_SLNG_TTS_MODEL;
}

export function slngSttModel(env: AppEnv) {
  return env.SLNG_STT_MODEL ?? DEFAULT_SLNG_STT_MODEL;
}

export function describeSlngVoiceAgentSetup(env: AppEnv): {
  ready: boolean;
  hint: string;
} {
  const hasKey = Boolean(env.SLNG_API_KEY);
  const hasAgent = Boolean(env.SLNG_AGENT_ID);
  return {
    ready: hasKey && hasAgent,
    hint:
      hasKey && hasAgent
        ? "SLNG Voice Agent ready — create a web session from Studio."
        : "Set SLNG_API_KEY and SLNG_AGENT_ID to start a SLNG Voice Agent web session.",
  };
}

export async function createSlngVoiceAgentWebSession(input: {
  env: AppEnv;
  participantName?: string;
  arguments?: Record<string, string>;
}): Promise<{
  livekitUrl: string;
  livekitToken: string;
  roomName: string;
  callId: string;
  maxSessionSeconds?: number;
}> {
  const key = input.env.SLNG_API_KEY;
  const agentId = input.env.SLNG_AGENT_ID;
  if (!key) {
    throw new Error("SLNG_API_KEY missing");
  }
  if (!agentId) {
    throw new Error("SLNG_AGENT_ID missing");
  }

  const res = await fetch(
    `${slngAgentApiBaseUrl(input.env)}/v1/agents/${agentId}/web-sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participant_name: input.participantName ?? "Lumen teacher",
        arguments: input.arguments ?? {},
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `SLNG Voice Agent HTTP ${res.status}: ${text.slice(0, 240)}`
    );
  }

  const data = (await res.json()) as {
    livekit_url?: string;
    livekit_token?: string;
    room_name?: string;
    call_id?: string;
    max_session_seconds?: number;
  };
  if (
    !(data.livekit_url && data.livekit_token && data.room_name && data.call_id)
  ) {
    throw new Error("SLNG Voice Agent response missing LiveKit session fields");
  }
  return {
    livekitUrl: data.livekit_url,
    livekitToken: data.livekit_token,
    roomName: data.room_name,
    callId: data.call_id,
    maxSessionSeconds: data.max_session_seconds,
  };
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
