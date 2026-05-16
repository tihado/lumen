import type { AppEnv } from "@/lib/env";

export type ExtractedEntity = {
  label: string;
  kind: "concept" | "term" | "misconception" | "other";
  span?: string;
};

const DEFAULT_PIONEER_MODEL = "fastino/gliner2-base-v1";
const PIONEER_ENTITY_LABELS = ["concept", "term", "misconception"];

function normalizeKind(value: unknown): ExtractedEntity["kind"] {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("misconception")) {
    return "misconception";
  }
  if (normalized.includes("concept")) {
    return "concept";
  }
  if (normalized.includes("term") || normalized.includes("vocabulary")) {
    return "term";
  }
  return "other";
}

function entityFromRecord(
  value: Record<string, unknown>,
  fallbackKind?: string
): ExtractedEntity | null {
  const label =
    typeof value.text === "string"
      ? value.text
      : typeof value.label === "string"
        ? value.label
        : typeof value.entity === "string"
          ? value.entity
          : typeof value.value === "string"
            ? value.value
            : typeof value.name === "string"
              ? value.name
              : undefined;
  const trimmed = label?.trim();
  if (!trimmed) {
    return null;
  }
  const kindSource =
    typeof value.type === "string"
      ? value.type
      : typeof value.kind === "string"
        ? value.kind
        : typeof value.entity_type === "string"
          ? value.entity_type
          : typeof value.category === "string"
            ? value.category
            : fallbackKind;
  const span =
    typeof value.span === "string"
      ? value.span
      : typeof value.text === "string" && value.text !== trimmed
        ? value.text
        : undefined;
  return {
    label: trimmed,
    kind: normalizeKind(kindSource),
    ...(span ? { span } : {}),
  };
}

function collectEntities(
  value: unknown,
  fallbackKind?: string
): ExtractedEntity[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    const label = value.trim();
    return label ? [{ label, kind: normalizeKind(fallbackKind) }] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectEntities(item, fallbackKind));
  }
  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const direct = entityFromRecord(record, fallbackKind);
  if (direct) {
    return [direct];
  }

  if (record.entities) {
    return collectEntities(record.entities, fallbackKind);
  }
  if (record.output) {
    return collectEntities(record.output, fallbackKind);
  }
  if (record.result) {
    return collectEntities(record.result, fallbackKind);
  }
  if (record.data) {
    return collectEntities(record.data, fallbackKind);
  }

  return Object.entries(record).flatMap(([kind, nested]) =>
    PIONEER_ENTITY_LABELS.includes(kind) ? collectEntities(nested, kind) : []
  );
}

function dedupeEntities(entities: ExtractedEntity[]) {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = `${entity.kind}:${entity.label.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

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
    headers["X-API-Key"] = env.PIONEER_API_KEY;
  }
  const res = await fetch(`${base.replace(/\/+$/, "")}/inference`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model_id: env.PIONEER_MODEL_ID ?? DEFAULT_PIONEER_MODEL,
      text: text.slice(0, 12_000),
      schema: {
        entities: PIONEER_ENTITY_LABELS,
      },
      threshold: 0.35,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Pioneer HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return dedupeEntities(collectEntities(await res.json())).slice(0, 24);
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
