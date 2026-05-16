import { z } from "zod";
import type { LessonPlan } from "@/lib/orchestrator/providers/llm";

const MAX_HTML_LENGTH = 180_000;
const SOLAR_RUNTIME_SRC = "/lesson-runtime/solar-system.v1.js";

const planetSchema = z.object({
  id: z.string(),
  name: z.string(),
  radius: z.number(),
  orbitRadius: z.number(),
  orbitSpeed: z.number(),
  color: z.string(),
  description: z.string(),
  facts: z.array(z.string()),
  diameter: z.string(),
  distanceFromSun: z.string(),
  orbitalPeriod: z.string(),
});

export const sandboxedLessonSpecSchema = z.object({
  kind: z.enum(["solar-system", "static-lesson"]),
  title: z.string(),
  prompt: z.string(),
  summary: z.string(),
  durationMinutes: z.number().optional(),
  language: z.string().optional(),
  planets: z.array(planetSchema).optional(),
  quiz: z
    .object({
      question: z.string(),
      choices: z.array(z.string()),
      answer: z.string(),
    })
    .optional(),
});

export type SandboxedLessonSpec = z.infer<typeof sandboxedLessonSpecSchema>;

export type SandboxedLessonArtifact = {
  title: string;
  html: string;
  spec: SandboxedLessonSpec;
};

const solarPlanets: NonNullable<SandboxedLessonSpec["planets"]> = [
  {
    id: "mercury",
    name: "Mercury",
    radius: 0.38,
    orbitRadius: 4,
    orbitSpeed: 0.024,
    color: "#b7aaa0",
    description:
      "The closest planet to the Sun, with a heavily cratered surface and extreme temperature swings.",
    facts: [
      "A year on Mercury lasts about 88 Earth days.",
      "Mercury has almost no thick atmosphere to trap heat.",
    ],
    diameter: "4.879 km",
    distanceFromSun: "57.9 million km",
    orbitalPeriod: "88 days",
  },
  {
    id: "venus",
    name: "Venus",
    radius: 0.95,
    orbitRadius: 5.7,
    orbitSpeed: 0.018,
    color: "#d8b46a",
    description:
      "The hottest planet in the solar system because its CO2-rich atmosphere creates a powerful greenhouse effect.",
    facts: [
      "Venus rotates very slowly and spins backward compared with most planets.",
      "Sulfuric acid clouds make its surface difficult to observe directly.",
    ],
    diameter: "12.104 km",
    distanceFromSun: "108.2 million km",
    orbitalPeriod: "225 days",
  },
  {
    id: "earth",
    name: "Earth",
    radius: 1,
    orbitRadius: 7.6,
    orbitSpeed: 0.014,
    color: "#3b82f6",
    description:
      "The only planet currently known to support life, with stable liquid water on its surface.",
    facts: [
      "About 71% of Earth's surface is covered by water.",
      "Earth's magnetic field helps protect the biosphere from the solar wind.",
    ],
    diameter: "12.742 km",
    distanceFromSun: "149.6 million km",
    orbitalPeriod: "365.25 days",
  },
  {
    id: "mars",
    name: "Mars",
    radius: 0.53,
    orbitRadius: 9.7,
    orbitSpeed: 0.011,
    color: "#c85835",
    description:
      "The red planet has iron oxide dust, enormous volcanoes, and traces of ancient water.",
    facts: [
      "Olympus Mons on Mars is the largest known volcano in the solar system.",
      "Rovers have found evidence of environments that once held water.",
    ],
    diameter: "6.779 km",
    distanceFromSun: "227.9 million km",
    orbitalPeriod: "687 days",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radius: 2.1,
    orbitRadius: 13,
    orbitSpeed: 0.006,
    color: "#d8a16f",
    description:
      "The largest planet, a gas giant with the Great Red Spot, a long-lived storm.",
    facts: [
      "Jupiter has more mass than all the other planets combined.",
      "Many of Jupiter's moons, such as Europa, are targets in the search for potential life.",
    ],
    diameter: "139.820 km",
    distanceFromSun: "778.5 million km",
    orbitalPeriod: "11.86 years",
  },
  {
    id: "saturn",
    name: "Saturn",
    radius: 1.75,
    orbitRadius: 16.5,
    orbitSpeed: 0.0045,
    color: "#e4c77f",
    description:
      "Known for its broad ring system, made mostly of ice, rock, and fine dust.",
    facts: [
      "Saturn's average density is lower than water.",
      "Its moon Titan has a thick atmosphere and lakes of liquid methane.",
    ],
    diameter: "116.460 km",
    distanceFromSun: "1.43 billion km",
    orbitalPeriod: "29.5 years",
  },
  {
    id: "uranus",
    name: "Uranus",
    radius: 1.35,
    orbitRadius: 19.7,
    orbitSpeed: 0.0032,
    color: "#7dd3fc",
    description:
      "An ice giant that rotates almost sideways relative to its orbital plane.",
    facts: [
      "Its axial tilt of about 98 degrees creates very long seasons.",
      "Its blue-green color comes from methane in the atmosphere.",
    ],
    diameter: "50.724 km",
    distanceFromSun: "2.87 billion km",
    orbitalPeriod: "84 years",
  },
  {
    id: "neptune",
    name: "Neptune",
    radius: 1.32,
    orbitRadius: 22.8,
    orbitSpeed: 0.0026,
    color: "#2563eb",
    description:
      "The farthest of the eight planets, with powerful winds and a deep blue color.",
    facts: [
      "Winds on Neptune can reach supersonic speeds.",
      "A year on Neptune lasts about 165 Earth years.",
    ],
    diameter: "49.244 km",
    distanceFromSun: "4.5 billion km",
    orbitalPeriod: "165 years",
  },
];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function isSolarSystemPrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  return lower.includes("solar system");
}

export function createSandboxedLessonArtifact(input: {
  prompt: string;
  plan: LessonPlan;
}): SandboxedLessonArtifact {
  const spec: SandboxedLessonSpec = isSolarSystemPrompt(input.prompt)
    ? {
        kind: "solar-system",
        title: "Explore the Solar System",
        prompt: input.prompt,
        summary:
          "Observe the Sun and eight planets, then zoom in on each planet to learn its defining features.",
        durationMinutes: input.plan.durationMinutes,
        language: "en",
        planets: solarPlanets,
        quiz: {
          question: "Which planet is currently known to support life?",
          choices: ["Venus", "Earth", "Neptune"],
          answer: "Earth",
        },
      }
    : {
        kind: "static-lesson",
        title: input.plan.title,
        prompt: input.prompt,
        summary: input.plan.hookBody,
        durationMinutes: input.plan.durationMinutes,
        language: "en",
        quiz: {
          question: input.plan.quiz.stem,
          choices: input.plan.quiz.choices,
          answer: input.plan.quiz.answer,
        },
      };

  const html =
    spec.kind === "solar-system"
      ? createSolarSystemHtml(spec)
      : createStaticLessonHtml(input.plan, spec);
  validateSandboxedLessonHtml(html);
  return { title: spec.title, html, spec };
}

function createSolarSystemHtml(spec: SandboxedLessonSpec) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(spec.title)}</title>
  <style>
    :root { color-scheme: dark; --gold: #ffd166; --ink: #f8fafc; --muted: #9aa8bd; --panel: rgba(8, 14, 28, .78); }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #020617; color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .page { min-height: 100vh; background: radial-gradient(circle at 50% 0%, rgba(255, 209, 102, .2), transparent 32rem), linear-gradient(180deg, #030712 0%, #08111f 100%); }
    header { padding: clamp(28px, 5vw, 56px) clamp(18px, 5vw, 64px) 18px; max-width: 1180px; margin: 0 auto; }
    .kicker { color: var(--gold); font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 10px 0 10px; max-width: 840px; font-size: clamp(34px, 7vw, 78px); line-height: .95; letter-spacing: 0; }
    .summary { margin: 0; max-width: 760px; color: #cbd5e1; font-size: clamp(16px, 2vw, 20px); line-height: 1.6; }
    .experience { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); gap: 18px; max-width: 1180px; margin: 0 auto; padding: 18px clamp(18px, 5vw, 64px) 48px; }
    .scene-wrap { position: relative; min-height: min(70vh, 680px); overflow: hidden; border: 1px solid rgba(148, 163, 184, .18); background: rgba(2, 6, 23, .72); }
    #solar-canvas { display: block; width: 100%; height: 100%; min-height: min(70vh, 680px); cursor: grab; }
    #solar-canvas:active { cursor: grabbing; }
    .toolbar { position: absolute; left: 14px; right: 14px; bottom: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; pointer-events: none; }
    .hint { pointer-events: none; color: #dbeafe; background: rgba(15, 23, 42, .68); border: 1px solid rgba(148, 163, 184, .18); padding: 8px 10px; font-size: 12px; }
    button { border: 1px solid rgba(255, 255, 255, .18); background: rgba(255, 255, 255, .08); color: var(--ink); padding: 9px 12px; font: inherit; font-size: 13px; cursor: pointer; }
    button:hover, button.active { border-color: rgba(255, 209, 102, .8); color: var(--gold); }
    .reset { pointer-events: auto; }
    aside { border: 1px solid rgba(148, 163, 184, .18); background: var(--panel); padding: 18px; min-height: 420px; }
    .planet-title { margin: 0; font-size: 28px; line-height: 1.05; }
    .planet-description { color: #cbd5e1; line-height: 1.55; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; margin: 18px 0; font-size: 13px; }
    dt { color: var(--muted); }
    dd { margin: 0; text-align: right; }
    ul { margin: 0; padding-left: 18px; color: #dbeafe; line-height: 1.55; }
    .planet-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
    .quiz { max-width: 1180px; margin: 0 auto; padding: 0 clamp(18px, 5vw, 64px) 64px; }
    .quiz-card { border: 1px solid rgba(148, 163, 184, .18); background: rgba(15, 23, 42, .72); padding: 20px; }
    .answer { color: var(--gold); font-weight: 700; }
    @media (max-width: 860px) {
      .experience { grid-template-columns: 1fr; }
      .scene-wrap, #solar-canvas { min-height: 520px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div class="kicker">Interactive lesson</div>
      <h1>${escapeHtml(spec.title)}</h1>
      <p class="summary">${escapeHtml(spec.summary)}</p>
    </header>
    <section class="experience">
      <div class="scene-wrap" data-runtime="solar-system">
        <canvas id="solar-canvas" aria-label="3D solar system simulation"></canvas>
        <div class="toolbar">
          <span class="hint">Drag to rotate · Scroll to zoom · Click a planet</span>
          <button class="reset" id="reset-view" type="button">Overview</button>
        </div>
      </div>
      <aside>
        <p class="kicker">Selected view</p>
        <h2 class="planet-title" id="planet-name">Overview</h2>
        <p class="planet-description" id="planet-description">Click a planet to zoom in and read detailed information.</p>
        <dl>
          <dt>Diameter</dt><dd id="planet-diameter">—</dd>
          <dt>Distance</dt><dd id="planet-distance">—</dd>
          <dt>Orbital period</dt><dd id="planet-period">—</dd>
        </dl>
        <ul id="planet-facts"><li>The solar system includes the Sun, eight planets, and many smaller bodies.</li></ul>
        <div class="planet-list" id="planet-list"></div>
      </aside>
    </section>
    <section class="quiz">
      <div class="quiz-card">
        <p class="kicker">Quick check</p>
        <h2>${escapeHtml(spec.quiz?.question ?? "What do you remember most?")}</h2>
        <p>${(spec.quiz?.choices ?? []).map((choice) => `<button type="button">${escapeHtml(choice)}</button>`).join(" ")}</p>
        <p>Answer: <span class="answer">${escapeHtml(spec.quiz?.answer ?? "")}</span></p>
      </div>
    </section>
  </main>
  <script type="application/json" id="lesson-data">${jsonForHtml(spec)}</script>
  <script type="module" src="${SOLAR_RUNTIME_SRC}"></script>
</body>
</html>`;
}

function createStaticLessonHtml(plan: LessonPlan, spec: SandboxedLessonSpec) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(spec.title)}</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 860px; margin: 0 auto; padding: 56px 20px; }
    h1 { font-size: clamp(34px, 6vw, 64px); line-height: 1; letter-spacing: 0; margin: 0 0 18px; }
    section { border-top: 1px solid #cbd5e1; padding: 26px 0; }
    p, li { line-height: 1.65; }
    .kicker { color: #0f766e; font-size: 12px; text-transform: uppercase; letter-spacing: .16em; font-weight: 800; }
  </style>
</head>
<body>
  <main data-runtime="static-lesson">
    <p class="kicker">Saved lesson</p>
    <h1>${escapeHtml(spec.title)}</h1>
    <p>${escapeHtml(plan.hookBody)}</p>
    <section>
      <h2>Learning objectives</h2>
      <ul>${plan.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section>
      <h2>Explanation</h2>
      <p>${escapeHtml(plan.explanationBody)}</p>
    </section>
    <section>
      <h2>${escapeHtml(plan.quiz.title)}</h2>
      <p>${escapeHtml(plan.quiz.stem)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(plan.quiz.answer)}</p>
    </section>
  </main>
</body>
</html>`;
}

export function validateSandboxedLessonHtml(html: string) {
  if (
    !(html.startsWith("<!doctype html>") || html.startsWith("<!DOCTYPE html>"))
  ) {
    throw new Error("Sandboxed lesson HTML must be a full HTML document.");
  }
  if (html.length > MAX_HTML_LENGTH) {
    throw new Error("Sandboxed lesson HTML is too large.");
  }
  if (!/data-runtime="(solar-system|static-lesson)"/.test(html)) {
    throw new Error(
      "Sandboxed lesson HTML is missing a supported runtime marker."
    );
  }
  if (/\son[a-z]+\s*=/i.test(html)) {
    throw new Error("Inline event handlers are not allowed in sandboxed HTML.");
  }
  if (
    /<iframe\b/i.test(html) ||
    /<object\b/i.test(html) ||
    /<embed\b/i.test(html)
  ) {
    throw new Error("Nested active embeds are not allowed in sandboxed HTML.");
  }

  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  for (const tag of scriptTags) {
    const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
    const type = tag.match(/\stype=["']([^"']+)["']/i)?.[1];
    const id = tag.match(/\sid=["']([^"']+)["']/i)?.[1];
    if (!src && type === "application/json" && id === "lesson-data") {
      continue;
    }
    if (src === SOLAR_RUNTIME_SRC && type === "module") {
      continue;
    }
    throw new Error("Unsupported script tag in sandboxed lesson HTML.");
  }
}
