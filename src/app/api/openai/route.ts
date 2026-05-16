import { getAppEnv, getProviderReadiness } from "@/lib/env";
import {
  generateOpenAICode,
  generateOpenAIJson,
  generateOpenAIText,
} from "@/lib/orchestrator/providers/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

type OpenAIMode = "text" | "json" | "code";

export async function POST(request: Request) {
  let mode: OpenAIMode = "text";
  let prompt = "";
  try {
    const body = (await request.json()) as {
      mode?: OpenAIMode;
      prompt?: string;
    };
    mode =
      body.mode === "json" || body.mode === "code" || body.mode === "text"
        ? body.mode
        : "text";
    prompt = String(body.prompt ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!prompt) {
    return Response.json({ error: "prompt required" }, { status: 400 });
  }

  const env = getAppEnv();
  const readiness = getProviderReadiness(env);
  if (!readiness.llm) {
    return Response.json(
      { error: "OPENAI_API_KEY missing", usedFallback: true },
      { status: 503 }
    );
  }

  try {
    if (mode === "json") {
      const result = await generateOpenAIJson({ prompt, env });
      return Response.json({ mode, usedFallback: false, ...result });
    }
    const result =
      mode === "code"
        ? await generateOpenAICode({ prompt, env })
        : await generateOpenAIText({ prompt, env });
    return Response.json({ mode, usedFallback: false, ...result });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
