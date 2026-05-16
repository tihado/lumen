import type { AppEnv } from "@/lib/env";

export type ExtractedEntity = {
  label: string;
  kind: "concept" | "term" | "misconception" | "other";
  span?: string;
};

export async function pioneerExtract(
  text: string,
  env: AppEnv
): Promise<ExtractedEntity[]> {
  const base = env.PIONEER_API_URL;
  if (!base) {
    throw new Error("PIONEER_API_URL missing");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.PIONEER_API_KEY) {
    headers.Authorization = `Bearer ${env.PIONEER_API_KEY}`;
  }
  const res = await fetch(`${base.replace(/\/$/, "")}/extract`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: text.slice(0, 12_000) }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Pioneer HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { entities?: ExtractedEntity[] };
  return Array.isArray(data.entities) ? data.entities : [];
}

/** Lightweight keyword heuristics when Pioneer is unavailable. */
export function heuristicExtract(topic: string): ExtractedEntity[] {
  const words = topic
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .slice(0, 12);
  const uniq = [...new Set(words)];
  return uniq.slice(0, 8).map((label) => ({
    label,
    kind: "term" as const,
  }));
}
