import { z } from "zod";
import type { LessonPlan } from "@/lib/orchestrator/providers/llm";

const MAX_HTML_LENGTH = 180_000;
const SOLAR_RUNTIME_SRC = "/lesson-runtime/solar-system.v1.js";
const EMBEDDED_RUNTIME_SCRIPT_ID = "lesson-runtime-script";

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
  surfaceGravity: z.string().optional(),
  gravityComparedToEarth: z.string().optional(),
  gravityNote: z.string().optional(),
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
  quizItems: z
    .array(
      z.object({
        question: z.string(),
        choices: z.array(z.string()),
        answer: z.string(),
        explanation: z.string(),
        funFact: z.string(),
      })
    )
    .optional(),
  studio: z.unknown().optional(),
});

export type SandboxedLessonSpec = z.infer<typeof sandboxedLessonSpecSchema>;

export type SandboxedLessonArtifact = {
  title: string;
  html: string;
  spec: SandboxedLessonSpec;
};

type StaticLessonMediaItem = {
  url: string;
  mime: string;
  alt: string;
  title?: string;
  modality: "image" | "video" | "audio";
  width?: number;
  height?: number;
};

type StaticLessonMedia = {
  assets?: StaticLessonMediaItem[];
  image?: {
    url: string;
    mime: string;
    alt: string;
    width?: number;
    height?: number;
  };
  video?: {
    url: string;
    mime: string;
    alt: string;
  };
  audio?: {
    url: string;
    mime: string;
    alt: string;
  };
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
      "Sunrise on Mercury can appear to stop, reverse, and rise again because of its slow spin and fast orbit.",
    ],
    diameter: "4.879 km",
    distanceFromSun: "57.9 million km",
    orbitalPeriod: "88 days",
    surfaceGravity: "3.7 m/s²",
    gravityComparedToEarth: "0.38 x Earth",
    gravityNote:
      "Mercury is small, so you would weigh much less there even though it is dense for its size.",
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
      "One day on Venus is longer than one Venus year.",
    ],
    diameter: "12.104 km",
    distanceFromSun: "108.2 million km",
    orbitalPeriod: "225 days",
    surfaceGravity: "8.87 m/s²",
    gravityComparedToEarth: "0.90 x Earth",
    gravityNote:
      "Venus is almost Earth's twin in size, so its surface gravity feels surprisingly familiar.",
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
      "Earth's gravity helps hold the atmosphere and oceans that make life possible.",
    ],
    diameter: "12.742 km",
    distanceFromSun: "149.6 million km",
    orbitalPeriod: "365.25 days",
    surfaceGravity: "9.81 m/s²",
    gravityComparedToEarth: "1.00 x Earth",
    gravityNote:
      "Earth is our reference point: one Earth gravity is the pull your body is adapted to every day.",
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
      "Mars has two tiny moons, Phobos and Deimos, that may be captured asteroids.",
    ],
    diameter: "6.779 km",
    distanceFromSun: "227.9 million km",
    orbitalPeriod: "687 days",
    surfaceGravity: "3.71 m/s²",
    gravityComparedToEarth: "0.38 x Earth",
    gravityNote:
      "Mars gravity is close to Mercury's, so jumping and carrying objects would feel much easier than on Earth.",
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
      "Its magnetic field is the strongest of any planet in the solar system.",
    ],
    diameter: "139.820 km",
    distanceFromSun: "778.5 million km",
    orbitalPeriod: "11.86 years",
    surfaceGravity: "24.79 m/s²",
    gravityComparedToEarth: "2.53 x Earth",
    gravityNote:
      "Jupiter's gravity is enormous because it is so massive, even though its visible surface is really cloud tops.",
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
      "Its rings are wide but extremely thin compared with the planet.",
    ],
    diameter: "116.460 km",
    distanceFromSun: "1.43 billion km",
    orbitalPeriod: "29.5 years",
    surfaceGravity: "10.44 m/s²",
    gravityComparedToEarth: "1.06 x Earth",
    gravityNote:
      "Saturn is huge but low-density, so gravity near its cloud tops is only a little stronger than Earth's.",
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
      "Uranus was the first planet discovered with a telescope.",
    ],
    diameter: "50.724 km",
    distanceFromSun: "2.87 billion km",
    orbitalPeriod: "84 years",
    surfaceGravity: "8.69 m/s²",
    gravityComparedToEarth: "0.89 x Earth",
    gravityNote:
      "Uranus is larger than Earth, but its lower density keeps surface gravity slightly weaker than ours.",
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
      "Neptune was predicted mathematically before it was directly observed.",
    ],
    diameter: "49.244 km",
    distanceFromSun: "4.5 billion km",
    orbitalPeriod: "165 years",
    surfaceGravity: "11.15 m/s²",
    gravityComparedToEarth: "1.14 x Earth",
    gravityNote:
      "Neptune is an ice giant with a strong pull, but it is still far gentler than Jupiter.",
  },
];

const solarQuizItems: NonNullable<SandboxedLessonSpec["quizItems"]> = [
  {
    question: "Which planet is currently known to support life?",
    choices: ["Venus", "Earth", "Neptune"],
    answer: "Earth",
    explanation:
      "Earth is the right answer because it has stable liquid water, a protective atmosphere, and ecosystems we can directly observe.",
    funFact:
      "Earth is the only world we know with rain, oceans, clouds, and living things all moving through the same water cycle.",
  },
  {
    question: "What does a planet orbit in our solar system?",
    choices: ["The Sun", "A comet", "Earth's Moon"],
    answer: "The Sun",
    explanation:
      "Planets in the solar system orbit the Sun because the Sun contains almost all of the system's mass and has the strongest gravitational pull.",
    funFact:
      "The Sun holds about 99.8% of the mass in the solar system, so everything else is tiny by comparison.",
  },
  {
    question: "Which force helps keep planets moving in orbit?",
    choices: ["Gravity", "Sound", "Friction"],
    answer: "Gravity",
    explanation:
      "Gravity pulls each planet toward the Sun while the planet's forward motion keeps it from falling straight in.",
    funFact:
      "An orbit is a kind of continuous fall: the planet keeps falling around the Sun instead of into it.",
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

function scriptForHtml(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function isSolarSystemPrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  return lower.includes("solar system");
}

export function createSandboxedLessonArtifact(input: {
  prompt: string;
  plan: LessonPlan;
  runtimeScript?: string;
  media?: StaticLessonMedia;
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
          question: solarQuizItems[0].question,
          choices: solarQuizItems[0].choices,
          answer: solarQuizItems[0].answer,
        },
        quizItems: solarQuizItems,
      }
    : {
        kind: "static-lesson",
        title: input.plan.title,
        prompt: input.prompt,
        summary: input.plan.hookBody,
        durationMinutes: input.plan.durationMinutes,
        language: "en",
        quiz: {
          question: input.plan.quiz.items[0]?.stem ?? input.plan.quiz.title,
          choices: input.plan.quiz.items[0]?.choices ?? [],
          answer: input.plan.quiz.items[0]?.answer ?? "",
        },
      };

  const html =
    spec.kind === "solar-system"
      ? createSolarSystemHtml(spec)
      : createStaticLessonHtml(
          input.plan,
          spec,
          input.runtimeScript,
          input.media
        );
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
    :root { color-scheme: dark; --gold: #ffd166; --amber: #ff9f1c; --cyan: #67e8f9; --rose: #fb7185; --ink: #f8fafc; --muted: #a9b5c8; --panel: rgba(8, 15, 31, .76); --line: rgba(172, 190, 220, .18); }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #020617; color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .page { min-height: 100vh; overflow: hidden; background: radial-gradient(circle at 16% 18%, rgba(103, 232, 249, .16), transparent 24rem), radial-gradient(circle at 72% 8%, rgba(255, 159, 28, .18), transparent 30rem), linear-gradient(135deg, #020617 0%, #08111f 52%, #0d1326 100%); }
    .page::before { content: ""; position: fixed; inset: 0; pointer-events: none; opacity: .34; background-image: linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: 72px 72px; mask-image: radial-gradient(circle at 50% 36%, black, transparent 72%); }
    header { padding: clamp(24px, 4vw, 46px) clamp(18px, 5vw, 64px) 14px; max-width: 1260px; margin: 0 auto; }
    .kicker { color: var(--gold); font-size: 12px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 10px 0 10px; max-width: 840px; font-size: clamp(36px, 6vw, 76px); line-height: .94; letter-spacing: 0; text-wrap: balance; }
    .summary { margin: 0; max-width: 760px; color: #d5deed; font-size: clamp(16px, 1.7vw, 20px); line-height: 1.6; }
    .experience { display: grid; grid-template-columns: minmax(0, 1fr) minmax(304px, 390px); gap: 20px; max-width: 1260px; margin: 0 auto; padding: 18px clamp(18px, 5vw, 64px) 48px; }
    .scene-wrap { position: relative; isolation: isolate; min-height: min(72vh, 720px); overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background-color: rgba(2, 6, 23, .72); background-image: radial-gradient(circle at 48% 43%, rgba(255, 209, 102, .09), transparent 18rem); box-shadow: 0 24px 80px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255,255,255,.06); }
    .scene-wrap::before { content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(circle at 6% 14%, rgba(255,255,255,.95) 0 1px, transparent 1.8px), radial-gradient(circle at 13% 67%, rgba(191,219,254,.7) 0 .9px, transparent 1.7px), radial-gradient(circle at 18% 31%, rgba(255,244,214,.9) 0 1.2px, transparent 2px), radial-gradient(circle at 24% 83%, rgba(255,255,255,.62) 0 .8px, transparent 1.5px), radial-gradient(circle at 31% 18%, rgba(191,219,254,.8) 0 1px, transparent 1.9px), radial-gradient(circle at 37% 72%, rgba(255,255,255,.86) 0 1.1px, transparent 2px), radial-gradient(circle at 42% 9%, rgba(255,244,214,.72) 0 .8px, transparent 1.6px), radial-gradient(circle at 49% 58%, rgba(191,219,254,.55) 0 .7px, transparent 1.4px), radial-gradient(circle at 54% 22%, rgba(255,255,255,.88) 0 1px, transparent 1.8px), radial-gradient(circle at 61% 88%, rgba(255,244,214,.8) 0 1.2px, transparent 2.1px), radial-gradient(circle at 68% 13%, rgba(191,219,254,.66) 0 .9px, transparent 1.7px), radial-gradient(circle at 73% 48%, rgba(255,255,255,.92) 0 1px, transparent 1.9px), radial-gradient(circle at 79% 76%, rgba(191,219,254,.72) 0 .8px, transparent 1.6px), radial-gradient(circle at 86% 27%, rgba(255,244,214,.86) 0 1.1px, transparent 2px), radial-gradient(circle at 92% 63%, rgba(255,255,255,.68) 0 .8px, transparent 1.5px), radial-gradient(circle at 97% 8%, rgba(191,219,254,.78) 0 1px, transparent 1.8px), radial-gradient(circle at 50% 45%, transparent 0 36%, rgba(2, 6, 23, .2) 58%, rgba(2, 6, 23, .78) 100%), linear-gradient(120deg, rgba(103, 232, 249, .12), transparent 32%, rgba(251, 113, 133, .08)); opacity: .82; filter: drop-shadow(0 0 5px rgba(255,255,255,.3)); animation: solar-stars-twinkle 4.8s ease-in-out infinite alternate; }
    .scene-wrap::after { content: ""; position: absolute; inset: 14px; pointer-events: none; border: 1px solid rgba(255,255,255,.06); border-radius: 6px; }
    #solar-canvas { position: relative; z-index: 1; display: block; width: 100%; height: 100%; min-height: min(70vh, 680px); cursor: grab; }
    #solar-canvas:active { cursor: grabbing; }
    .toolbar { position: absolute; left: 26px; right: 26px; bottom: 24px; z-index: 2; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; pointer-events: none; }
    .hint { pointer-events: none; color: #e6f2ff; background: rgba(7, 13, 28, .72); border: 1px solid rgba(168, 184, 214, .22); border-radius: 999px; padding: 9px 13px; font-size: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,.08); backdrop-filter: blur(12px); }
    button { border: 1px solid rgba(255, 255, 255, .16); border-radius: 6px; background: linear-gradient(180deg, rgba(255, 255, 255, .1), rgba(255, 255, 255, .045)); color: var(--ink); padding: 10px 13px; font: inherit; font-size: 13px; font-weight: 760; cursor: pointer; transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease; }
    button:hover, button.active { border-color: rgba(255, 209, 102, .86); color: #fff6d8; background: linear-gradient(180deg, rgba(255, 209, 102, .2), rgba(103, 232, 249, .08)); transform: translateY(-1px); }
    .reset { pointer-events: auto; min-width: 104px; }
    aside { position: relative; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: linear-gradient(180deg, rgba(10, 20, 42, .84), rgba(5, 10, 23, .78)); padding: 26px; min-height: 420px; box-shadow: 0 24px 80px rgba(0, 0, 0, .36), inset 0 1px 0 rgba(255,255,255,.07); backdrop-filter: blur(18px); }
    aside::before { content: ""; position: absolute; top: -90px; right: -120px; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, rgba(103, 232, 249, .18), transparent 62%); pointer-events: none; }
    .planet-title { margin: 0; font-size: clamp(32px, 4vw, 48px); line-height: 1; text-wrap: balance; }
    .planet-description { color: #d5deed; font-size: 16px; line-height: 1.65; margin: 22px 0; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 10px 14px; margin: 20px 0 22px; padding: 16px 0; border-top: 1px solid rgba(172, 190, 220, .14); border-bottom: 1px solid rgba(172, 190, 220, .14); font-size: 13px; }
    dt { color: var(--muted); }
    dd { margin: 0; text-align: right; color: #edf5ff; font-weight: 760; }
    .gravity-panel { display: grid; gap: 8px; margin: -2px 0 22px; padding: 14px; border: 1px solid rgba(103, 232, 249, .2); border-radius: 8px; background: linear-gradient(135deg, rgba(103, 232, 249, .1), rgba(255, 209, 102, .06)); }
    .gravity-panel strong { color: #f8fafc; }
    .gravity-panel p { margin: 0; color: #dbeafe; font-size: 13px; line-height: 1.55; }
    ul { margin: 0; padding-left: 20px; color: #e3efff; line-height: 1.62; }
    li::marker { color: var(--cyan); }
    .planet-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin-top: 22px; }
    .quiz { max-width: 1180px; margin: 0 auto; padding: 0 clamp(18px, 5vw, 64px) 64px; }
    .quiz-card { border: 1px solid var(--line); border-radius: 8px; background: rgba(15, 23, 42, .72); padding: 20px; }
    .quiz-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .quiz-question { display: grid; align-content: start; gap: 12px; min-height: 100%; border: 1px solid rgba(172, 190, 220, .16); border-radius: 8px; background: linear-gradient(180deg, rgba(8, 15, 31, .84), rgba(2, 6, 23, .68)); padding: 16px; }
    .quiz-question h3 { margin: 0; color: #f8fafc; font-size: 17px; line-height: 1.35; }
    .quiz-options { display: grid; gap: 8px; }
    .quiz-feedback { display: none; border-radius: 8px; padding: 12px; color: #dbeafe; background: rgba(103, 232, 249, .08); border: 1px solid rgba(103, 232, 249, .18); font-size: 13px; line-height: 1.55; }
    .quiz-question[data-answered="true"] .quiz-feedback { display: grid; gap: 6px; }
    .quiz-question[data-result="correct"] .quiz-feedback { border-color: rgba(34, 197, 94, .32); background: rgba(34, 197, 94, .1); }
    .quiz-question[data-result="wrong"] .quiz-feedback { border-color: rgba(251, 113, 133, .36); background: rgba(251, 113, 133, .1); }
    .quiz-option.is-correct { border-color: rgba(34, 197, 94, .86); color: #dcfce7; background: linear-gradient(180deg, rgba(34, 197, 94, .24), rgba(34, 197, 94, .09)); }
    .quiz-option.is-wrong { border-color: rgba(251, 113, 133, .86); color: #ffe4e6; background: linear-gradient(180deg, rgba(251, 113, 133, .22), rgba(251, 113, 133, .08)); }
    @keyframes solar-stars-twinkle { 0%, 100% { opacity: .58; filter: brightness(.86) drop-shadow(0 0 2px rgba(255,255,255,.16)); } 45% { opacity: .94; filter: brightness(1.34) drop-shadow(0 0 7px rgba(191,219,254,.4)); } 72% { opacity: .72; filter: brightness(1.05) drop-shadow(0 0 4px rgba(255,244,214,.28)); } }
    @media (max-width: 860px) {
      .experience { grid-template-columns: 1fr; }
      .scene-wrap, #solar-canvas { min-height: 520px; }
      .planet-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .quiz-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      header { padding-top: 24px; }
      .experience { padding-left: 14px; padding-right: 14px; }
      .toolbar { left: 18px; right: 18px; bottom: 18px; }
      .planet-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      aside { padding: 22px; }
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
          <span class="hint">Drag to rotate · Scroll to zoom · Click the Sun or a planet</span>
          <button class="reset" id="reset-view" type="button">Overview</button>
        </div>
      </div>
      <aside>
        <p class="kicker">Selected view</p>
        <h2 class="planet-title" id="planet-name">Overview</h2>
        <p class="planet-description" id="planet-description">Click the Sun or a planet to zoom in and read detailed information.</p>
        <dl>
          <dt>Diameter</dt><dd id="planet-diameter">—</dd>
          <dt>Distance</dt><dd id="planet-distance">—</dd>
          <dt>Orbital period</dt><dd id="planet-period">—</dd>
          <dt>Gravity</dt><dd id="planet-gravity">—</dd>
        </dl>
        <div class="gravity-panel">
          <strong>What is gravity?</strong>
          <p id="gravity-note">Gravity is the attractive force between objects with mass. Bigger and denser worlds usually pull more strongly, so the same student would weigh different amounts on different planets.</p>
        </div>
        <ul id="planet-facts"><li>The solar system includes the Sun, eight planets, and many smaller bodies.</li></ul>
        <div class="planet-list" id="planet-list"></div>
      </aside>
    </section>
    <section class="quiz">
      <div class="quiz-card" data-solar-quiz>
        <p class="kicker">Quick check</p>
        <h2>Test your orbit instincts</h2>
        <p class="summary">Choose an answer to reveal the result, the reason, and a curious detail.</p>
      </div>
    </section>
  </main>
  <script type="application/json" id="lesson-data">${jsonForHtml(spec)}</script>
  <script type="module" src="${SOLAR_RUNTIME_SRC}"></script>
</body>
</html>`;
}

function createStaticLessonHtml(
  plan: LessonPlan,
  spec: SandboxedLessonSpec,
  runtimeScript?: string,
  media?: StaticLessonMedia
) {
  const mediaItems: StaticLessonMediaItem[] =
    media?.assets ??
    [
      media?.image ? { ...media.image, modality: "image" as const } : null,
      media?.video ? { ...media.video, modality: "video" as const } : null,
      media?.audio ? { ...media.audio, modality: "audio" as const } : null,
    ].filter((item) => item !== null);

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
    .lesson-copy { white-space: pre-wrap; line-height: 1.7; }
    .grid-list { display: grid; gap: 12px; padding: 0; list-style: none; }
    .grid-list li { border: 1px solid #dbe3ee; border-radius: 8px; background: #fff; padding: 14px; }
    .media-stack { display: grid; gap: 14px; }
    .media-shell { overflow: hidden; border: 1px solid #dbe3ee; border-radius: 8px; background: #fff; }
    .media-shell img, .media-shell video { display: block; width: 100%; max-height: 460px; object-fit: contain; background: #020617; }
    .media-shell audio { width: 100%; padding: 14px; }
    figcaption { border-top: 1px solid #dbe3ee; padding: 10px 14px; color: #475569; font-size: 13px; }
    .term { display: block; font-weight: 800; color: #0f766e; }
    button { border: 1px solid #94a3b8; border-radius: 6px; background: #fff; color: #0f172a; cursor: pointer; font: inherit; font-weight: 700; padding: 10px 12px; }
    button:hover { border-color: #0f766e; }
    button.selected { border-color: #0f766e; background: #ccfbf1; color: #134e4a; }
    button.correct { border-color: #15803d; background: #dcfce7; color: #14532d; }
    button.wrong { border-color: #b91c1c; background: #fee2e2; color: #7f1d1d; }
    .objective-list { display: grid; gap: 10px; padding: 0; list-style: none; }
    .objective-list li { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; }
    .objective-list button { height: 28px; width: 28px; padding: 0; line-height: 1; }
    .objective-list button.is-complete { background: #0f766e; border-color: #0f766e; color: #fff; }
    .choices { display: flex; flex-wrap: wrap; gap: 10px; }
    [data-quiz-choice].is-correct { border-color: #15803d; background: #dcfce7; color: #14532d; }
    [data-quiz-choice].is-wrong { border-color: #b91c1c; background: #fee2e2; color: #7f1d1d; }
    [data-quiz-feedback] { font-weight: 700; }
    .kicker { color: #0f766e; font-size: 12px; text-transform: uppercase; letter-spacing: .16em; font-weight: 800; }
  </style>
</head>
<body>
  <main data-runtime="static-lesson">
    <p class="kicker">Saved lesson</p>
    <h1>${escapeHtml(spec.title)}</h1>
    <p>${escapeHtml(plan.hookBody)}</p>
    ${
      mediaItems.length
        ? `<section>
      <h2>Watch and listen</h2>
      <div class="media-stack">
        ${mediaItems
          .map((item) => {
            if (item.modality === "image") {
              return `<figure class="media-shell"><img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt)}" loading="lazy" /><figcaption>${escapeHtml(item.title ?? item.alt)}</figcaption></figure>`;
            }
            if (item.modality === "video") {
              return `<figure class="media-shell"><video src="${escapeHtml(item.url)}" controls playsinline preload="metadata"><track kind="captions" /></video><figcaption>${escapeHtml(item.title ?? item.alt)}</figcaption></figure>`;
            }
            return `<figure class="media-shell"><audio src="${escapeHtml(item.url)}" controls preload="none"><track kind="captions" /></audio><figcaption>${escapeHtml(item.title ?? item.alt)}</figcaption></figure>`;
          })
          .join("")}
      </div>
    </section>`
        : ""
    }
    <section>
      <h2>Lecture script</h2>
      <div class="lesson-copy">${escapeHtml(
        plan.lectureScript
          .map(
            (item, index) =>
              `${index + 1}. ${item.title}\nTeacher says: ${item.teacherNarration}\nStudents do: ${item.studentAction}`
          )
          .join("\n\n")
      )}</div>
    </section>
    <section>
      <h2>Learning objectives</h2>
      <ul class="objective-list">${plan.objectives.map((item) => `<li><button type="button" aria-pressed="false" data-objective-toggle>✓</button><span>${escapeHtml(item)}</span></li>`).join("")}</ul>
    </section>
    <section>
      <h2>Key vocabulary</h2>
      <ul class="grid-list">${plan.keyVocabulary.map((item) => `<li><span class="term">${escapeHtml(item.term)}</span>${escapeHtml(item.definition)}</li>`).join("")}</ul>
    </section>
    <section>
      <h2>Explanation</h2>
      ${plan.explanationSections.map((section) => `<article><h3>${escapeHtml(section.title)}</h3><div class="lesson-copy">${escapeHtml(section.body)}</div></article>`).join("")}
    </section>
    <section>
      <h2>${escapeHtml(plan.workedExample.title)}</h2>
      <div class="lesson-copy">${escapeHtml(plan.workedExample.body)}</div>
    </section>
    <section>
      <h2>${escapeHtml(plan.activity.title)}</h2>
      <p>${escapeHtml(plan.activity.instruction)}</p>
      <ul class="grid-list">
        ${[
          ...plan.activity.strongItems.map((item, index) => ({
            id: `strong-${index + 1}`,
            label: item,
            answer: "strong",
          })),
          ...plan.activity.weakItems.map((item, index) => ({
            id: `weak-${index + 1}`,
            label: item,
            answer: "weak",
          })),
        ]
          .map(
            (item) => `<li data-classify-card data-answer="${item.answer}">
              <span class="term">${escapeHtml(item.label)}</span>
              <p>
                <button type="button" data-classify-choice="${item.id}:strong">${escapeHtml(plan.activity.strongFitLabel)}</button>
                <button type="button" data-classify-choice="${item.id}:weak">${escapeHtml(plan.activity.weakFitLabel)}</button>
              </p>
              <p data-classify-result></p>
            </li>`
          )
          .join("")}
      </ul>
    </section>
    <section>
      <h2>${escapeHtml(plan.quiz.title)}</h2>
      ${plan.quiz.items
        .map(
          (item, index) => `<article>
        <h3>Question ${index + 1}</h3>
        <p>${escapeHtml(item.stem)}</p>
        <div class="choices">${item.choices.map((choice) => `<button type="button" data-quiz-choice>${escapeHtml(choice)}</button>`).join("")}</div>
        <p data-quiz-feedback></p>
        <p><strong>Answer:</strong> <span data-quiz-answer>${escapeHtml(item.answer)}</span></p>
        <p>${escapeHtml(item.explanation)}</p>
      </article>`
        )
        .join("")}
    </section>
    <section>
      <h2>Exit ticket</h2>
      <p>${escapeHtml(plan.reflectionPrompt)}</p>
    </section>
    <section>
      <h2>Teacher facilitation notes</h2>
      <ul>${plan.teacherTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul>
    </section>
  </main>
  <script type="module" id="${EMBEDDED_RUNTIME_SCRIPT_ID}">${scriptForHtml(runtimeScript ?? "")}</script>
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
    if (!src && type === "module" && id === EMBEDDED_RUNTIME_SCRIPT_ID) {
      continue;
    }
    if (src === SOLAR_RUNTIME_SRC && type === "module") {
      continue;
    }
    throw new Error("Unsupported script tag in sandboxed lesson HTML.");
  }
}
