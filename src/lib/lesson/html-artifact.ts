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
    name: "Sao Thủy",
    radius: 0.38,
    orbitRadius: 4,
    orbitSpeed: 0.024,
    color: "#b7aaa0",
    description:
      "Hành tinh gần Mặt Trời nhất, có bề mặt nhiều hố va chạm và biên độ nhiệt rất lớn.",
    facts: [
      "Một năm trên Sao Thủy chỉ dài khoảng 88 ngày Trái Đất.",
      "Sao Thủy gần như không có khí quyển dày để giữ nhiệt.",
    ],
    diameter: "4.879 km",
    distanceFromSun: "57,9 triệu km",
    orbitalPeriod: "88 ngày",
  },
  {
    id: "venus",
    name: "Sao Kim",
    radius: 0.95,
    orbitRadius: 5.7,
    orbitSpeed: 0.018,
    color: "#d8b46a",
    description:
      "Hành tinh nóng nhất hệ Mặt Trời vì khí quyển giàu CO2 tạo hiệu ứng nhà kính mạnh.",
    facts: [
      "Sao Kim quay rất chậm và quay ngược chiều so với hầu hết hành tinh.",
      "Mây axit sulfuric khiến bề mặt khó quan sát trực tiếp.",
    ],
    diameter: "12.104 km",
    distanceFromSun: "108,2 triệu km",
    orbitalPeriod: "225 ngày",
  },
  {
    id: "earth",
    name: "Trái Đất",
    radius: 1,
    orbitRadius: 7.6,
    orbitSpeed: 0.014,
    color: "#3b82f6",
    description:
      "Hành tinh duy nhất hiện biết có sự sống, có nước lỏng ổn định trên bề mặt.",
    facts: [
      "Khoảng 71% bề mặt Trái Đất được bao phủ bởi nước.",
      "Từ trường giúp bảo vệ sinh quyển khỏi gió Mặt Trời.",
    ],
    diameter: "12.742 km",
    distanceFromSun: "149,6 triệu km",
    orbitalPeriod: "365,25 ngày",
  },
  {
    id: "mars",
    name: "Sao Hỏa",
    radius: 0.53,
    orbitRadius: 9.7,
    orbitSpeed: 0.011,
    color: "#c85835",
    description:
      "Hành tinh đỏ có bụi oxit sắt, núi lửa khổng lồ và dấu vết nước cổ đại.",
    facts: [
      "Olympus Mons trên Sao Hỏa là núi lửa lớn nhất đã biết trong hệ Mặt Trời.",
      "Các robot tự hành đã tìm thấy bằng chứng về môi trường từng có nước.",
    ],
    diameter: "6.779 km",
    distanceFromSun: "227,9 triệu km",
    orbitalPeriod: "687 ngày",
  },
  {
    id: "jupiter",
    name: "Sao Mộc",
    radius: 2.1,
    orbitRadius: 13,
    orbitSpeed: 0.006,
    color: "#d8a16f",
    description:
      "Hành tinh lớn nhất, là khí khổng lồ với Vết Đỏ Lớn - một cơn bão tồn tại rất lâu.",
    facts: [
      "Sao Mộc có khối lượng lớn hơn tất cả hành tinh còn lại cộng lại.",
      "Nhiều vệ tinh của Sao Mộc, như Europa, là mục tiêu nghiên cứu sự sống tiềm năng.",
    ],
    diameter: "139.820 km",
    distanceFromSun: "778,5 triệu km",
    orbitalPeriod: "11,86 năm",
  },
  {
    id: "saturn",
    name: "Sao Thổ",
    radius: 1.75,
    orbitRadius: 16.5,
    orbitSpeed: 0.0045,
    color: "#e4c77f",
    description:
      "Nổi bật với hệ vành đai rộng, chủ yếu gồm băng, đá và bụi nhỏ.",
    facts: [
      "Sao Thổ có mật độ trung bình thấp hơn nước.",
      "Vệ tinh Titan có khí quyển dày và hồ methane lỏng.",
    ],
    diameter: "116.460 km",
    distanceFromSun: "1,43 tỷ km",
    orbitalPeriod: "29,5 năm",
  },
  {
    id: "uranus",
    name: "Sao Thiên Vương",
    radius: 1.35,
    orbitRadius: 19.7,
    orbitSpeed: 0.0032,
    color: "#7dd3fc",
    description:
      "Hành tinh băng khổng lồ quay nghiêng gần như nằm ngang so với mặt phẳng quỹ đạo.",
    facts: [
      "Độ nghiêng trục khoảng 98 độ tạo ra mùa rất dài.",
      "Màu xanh lam đến từ methane trong khí quyển.",
    ],
    diameter: "50.724 km",
    distanceFromSun: "2,87 tỷ km",
    orbitalPeriod: "84 năm",
  },
  {
    id: "neptune",
    name: "Sao Hải Vương",
    radius: 1.32,
    orbitRadius: 22.8,
    orbitSpeed: 0.0026,
    color: "#2563eb",
    description:
      "Hành tinh xa nhất trong nhóm tám hành tinh, có gió cực mạnh và màu xanh sâu.",
    facts: [
      "Gió trên Sao Hải Vương có thể đạt tốc độ siêu âm.",
      "Một năm trên Sao Hải Vương dài khoảng 165 năm Trái Đất.",
    ],
    diameter: "49.244 km",
    distanceFromSun: "4,5 tỷ km",
    orbitalPeriod: "165 năm",
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
  return (
    lower.includes("solar system") ||
    lower.includes("hệ mặt trời") ||
    lower.includes("he mat troi")
  );
}

export function createSandboxedLessonArtifact(input: {
  prompt: string;
  plan: LessonPlan;
}): SandboxedLessonArtifact {
  const spec: SandboxedLessonSpec = isSolarSystemPrompt(input.prompt)
    ? {
        kind: "solar-system",
        title: "Khám phá hệ Mặt Trời",
        prompt: input.prompt,
        summary:
          "Quan sát Mặt Trời và tám hành tinh, phóng to từng hành tinh để tìm hiểu đặc điểm nổi bật.",
        durationMinutes: input.plan.durationMinutes,
        language: "vi",
        planets: solarPlanets,
        quiz: {
          question: "Hành tinh nào hiện được biết là có sự sống?",
          choices: ["Sao Kim", "Trái Đất", "Sao Hải Vương"],
          answer: "Trái Đất",
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
<html lang="vi">
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
      <div class="kicker">Bài giảng tương tác</div>
      <h1>${escapeHtml(spec.title)}</h1>
      <p class="summary">${escapeHtml(spec.summary)}</p>
    </header>
    <section class="experience">
      <div class="scene-wrap" data-runtime="solar-system">
        <canvas id="solar-canvas" aria-label="Mô phỏng hệ Mặt Trời 3D"></canvas>
        <div class="toolbar">
          <span class="hint">Kéo để xoay · Cuộn để zoom · Click một hành tinh</span>
          <button class="reset" id="reset-view" type="button">Toàn cảnh</button>
        </div>
      </div>
      <aside>
        <p class="kicker">Đang chọn</p>
        <h2 class="planet-title" id="planet-name">Toàn cảnh</h2>
        <p class="planet-description" id="planet-description">Click vào một hành tinh để phóng to và đọc thông tin chi tiết.</p>
        <dl>
          <dt>Đường kính</dt><dd id="planet-diameter">—</dd>
          <dt>Khoảng cách</dt><dd id="planet-distance">—</dd>
          <dt>Chu kỳ quỹ đạo</dt><dd id="planet-period">—</dd>
        </dl>
        <ul id="planet-facts"><li>Hệ Mặt Trời gồm Mặt Trời, tám hành tinh và nhiều thiên thể nhỏ.</li></ul>
        <div class="planet-list" id="planet-list"></div>
      </aside>
    </section>
    <section class="quiz">
      <div class="quiz-card">
        <p class="kicker">Câu hỏi nhanh</p>
        <h2>${escapeHtml(spec.quiz?.question ?? "Bạn nhớ điều gì nhất?")}</h2>
        <p>${(spec.quiz?.choices ?? []).map((choice) => `<button type="button">${escapeHtml(choice)}</button>`).join(" ")}</p>
        <p>Đáp án: <span class="answer">${escapeHtml(spec.quiz?.answer ?? "")}</span></p>
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
