import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { AppEnv } from "@/lib/env";
import {
  reviewSandboxedLessonArtifact,
  type SandboxDemoReview,
  type SandboxedLessonArtifact,
  validateSandboxedLessonThemeCss,
} from "@/lib/lesson/html-artifact";
import type { ExtractedEntity } from "./pioneer";

const DEFAULT_LESSON_MODEL = "gpt-5";
const DEFAULT_CODE_MODEL = "gpt-5.2-codex";

const lessonScriptSchema = z.object({
  segment: z
    .enum(["hook", "explain", "example", "practice", "quiz", "reflection"])
    .describe("Where this script beat belongs in the lesson flow."),
  title: z.string().min(1).max(100),
  teacherNarration: z
    .string()
    .min(1)
    .max(900)
    .describe("Teacher-ready spoken script for this part of the lesson."),
  studentAction: z
    .string()
    .min(1)
    .max(360)
    .describe("What students should do, notice, discuss, sort, or answer."),
});

const mediaAssetPlanSchema = z.object({
  placement: z
    .enum(["hook", "explain", "example", "practice"])
    .describe("Lesson section where this generated media should appear."),
  modality: z.enum(["image", "video"]),
  title: z.string().min(1).max(100),
  prompt: z
    .string()
    .min(1)
    .max(900)
    .describe("Provider-ready fal prompt for this specific lesson moment."),
  alt: z.string().min(1).max(220),
  teachingPurpose: z
    .string()
    .min(1)
    .max(260)
    .describe("Why this media helps learning at this exact point."),
});

const lessonPlanSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(120)
    .describe("Specific lesson title, not a generic topic label."),
  gradeBand: z
    .string()
    .min(1)
    .max(80)
    .describe("Target learner level inferred from the transcript."),
  durationMinutes: z.number().int().min(5).max(120),
  objectives: z
    .array(z.string().min(1).max(220))
    .min(3)
    .max(5)
    .describe("Measurable student outcomes for the whole lesson."),
  hookBody: z
    .string()
    .min(1)
    .max(1600)
    .describe(
      "Opening classroom moment with a vivid question, scenario, and transition into the lesson."
    ),
  keyVocabulary: z
    .array(
      z.object({
        term: z.string().min(1).max(80),
        definition: z.string().min(1).max(220),
      })
    )
    .min(3)
    .max(8),
  explanationSections: z
    .array(
      z.object({
        title: z.string().min(1).max(90),
        body: z.string().min(1).max(1800),
      })
    )
    .min(3)
    .max(5)
    .describe(
      "A sequenced mini-lecture: concept foundation, mechanism/process, example, misconception or synthesis."
    ),
  workedExample: z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(1600),
  }),
  lectureScript: z
    .array(lessonScriptSchema)
    .min(4)
    .max(6)
    .describe(
      "The planned teaching script, in lesson order, created before media generation."
    ),
  mediaPlan: z.object({
    imagePrompt: z
      .string()
      .min(1)
      .max(900)
      .describe(
        "Specific prompt for an educational cover image or diagram that directly teaches the topic."
      ),
    imageAlt: z
      .string()
      .min(1)
      .max(220)
      .describe("Accessible description of the planned image."),
    videoPrompt: z
      .string()
      .min(1)
      .max(900)
      .describe(
        "Specific prompt for a short educational video showing motion, process, contrast, or sequence."
      ),
    videoAlt: z
      .string()
      .min(1)
      .max(220)
      .describe("Accessible description of the planned video."),
    assets: z
      .array(mediaAssetPlanSchema)
      .min(3)
      .max(4)
      .describe(
        "Storyboarded fal media assets for individual lesson parts. Include at least one image and one video."
      ),
  }),
  explanationBody: z
    .string()
    .min(1)
    .max(5000)
    .describe(
      "Teacher-ready narrative summary combining the explanation sections and worked example."
    ),
  activity: z.object({
    title: z.string().min(1).max(100),
    instruction: z.string().min(1).max(600),
    strongFitLabel: z.string().min(1).max(80),
    weakFitLabel: z.string().min(1).max(80),
    strongItems: z.array(z.string().min(1).max(140)).min(3).max(5),
    weakItems: z.array(z.string().min(1).max(140)).min(1).max(3),
  }),
  quiz: z.object({
    title: z.string().min(1).max(100),
    items: z
      .array(
        z.object({
          stem: z.string().min(1).max(260),
          choices: z.array(z.string().min(1).max(160)).min(3).max(4),
          answer: z.string().min(1).max(160),
          explanation: z.string().min(1).max(360),
        })
      )
      .min(3)
      .max(5),
  }),
  reflectionPrompt: z.string().min(1).max(520),
  teacherTips: z.array(z.string().min(1).max(260)).min(3).max(5),
});

export type LessonPlan = z.infer<typeof lessonPlanSchema>;

const openAIUtilityJsonSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(600),
  steps: z.array(z.string().min(1).max(220)).min(1).max(8),
});

export type OpenAIUtilityJson = z.infer<typeof openAIUtilityJsonSchema>;

const sandboxDemoReviewSchema = z.object({
  passed: z.boolean(),
  summary: z.string().min(1).max(420),
  strengths: z.array(z.string().min(1).max(180)).max(5),
  concerns: z.array(z.string().min(1).max(180)).max(5),
});

export function fallbackLessonPlan(input: {
  topic: string;
  entities: ExtractedEntity[];
}): LessonPlan {
  const terms =
    input.entities
      .slice(0, 5)
      .map((e) => `**${e.label}**`)
      .join(", ") || "_add vocabulary during edit_";

  return {
    title: input.topic,
    gradeBand: "General audience",
    durationMinutes: 20,
    objectives: [
      `Describe the core ideas of **${input.topic}** in student-friendly language.`,
      "Connect the topic to a real-world observation or classroom example.",
      "Apply the idea in a short practice task and explain the reasoning.",
      ...input.entities
        .filter((e) => e.kind === "concept" || e.kind === "term")
        .slice(0, 2)
        .map((e) => `Use or define the term **${e.label}** appropriately.`),
    ].slice(0, 5),
    hookBody: `Start with a quick notice-and-wonder: where have students seen **${input.topic}** outside school? Ask for two observations, then tell students the lesson will turn those observations into a usable explanation.`,
    keyVocabulary: [
      {
        term: "Core idea",
        definition: `The central pattern or rule that helps explain ${input.topic}.`,
      },
      {
        term: "Evidence",
        definition:
          "A detail, observation, or source students can use to support an explanation.",
      },
      {
        term: "Misconception",
        definition:
          "A common first thought that sounds plausible but misses an important part of the idea.",
      },
    ],
    explanationSections: [
      {
        title: "Build the idea",
        body: `Introduce **${input.topic}** through a concrete classroom example. Name the key parts students can observe first, then connect those parts to the larger concept.`,
      },
      {
        title: "Make the mechanism visible",
        body: `Walk through the process step by step. Pause after each step and ask students what changed, what stayed the same, and what evidence supports the next move. Useful vocabulary for this lesson includes ${terms}.`,
      },
      {
        title: "Address a common misconception",
        body: `Students may treat ${input.topic} as an isolated fact. Reframe it as a pattern that helps explain several examples, then compare one strong example with one weak example.`,
      },
    ],
    workedExample: {
      title: "Worked classroom example",
      body: `Model a short response: "I think this connects to ${input.topic} because I can see a pattern, name the evidence, and explain why the pattern matters." Then invite students to adapt the sentence with their own example.`,
    },
    lectureScript: [
      {
        segment: "hook",
        title: "Open with a notice-and-wonder",
        teacherNarration: `Start by asking students where they have seen ${input.topic} outside school. Collect two observations and name the lesson question.`,
        studentAction:
          "Students share one observation and one question before seeing the explanation.",
      },
      {
        segment: "explain",
        title: "Build the concept",
        teacherNarration: `Walk through ${input.topic} step by step, naming the observable evidence and connecting each part to the core idea.`,
        studentAction:
          "Students point to the evidence that supports each step of the explanation.",
      },
      {
        segment: "example",
        title: "Model one response",
        teacherNarration:
          "Use the worked example to show how to make a claim, cite evidence, and explain why it fits.",
        studentAction:
          "Students adapt the model sentence to a nearby or familiar example.",
      },
      {
        segment: "practice",
        title: "Sort and justify",
        teacherNarration:
          "Ask students to classify each card, then defend one choice with evidence.",
        studentAction:
          "Students sort every card and revise after checking feedback.",
      },
    ],
    mediaPlan: {
      imagePrompt: `Create a clean educational diagram for ${input.topic}. Show the main parts, use classroom-safe imagery, avoid tiny unreadable labels, and make the visual useful for explaining the concept.`,
      imageAlt: `Educational diagram showing the main parts of ${input.topic}.`,
      videoPrompt: `Create a short educational video for ${input.topic}. Show the process or comparison changing over time so students can see cause and effect. No on-screen text.`,
      videoAlt: `Short educational video showing how ${input.topic} works over time.`,
      assets: [
        {
          placement: "hook",
          modality: "image",
          title: "Opening anchor visual",
          prompt: `Create a clean educational anchor image for ${input.topic}. Show the main observable parts students should notice first. Classroom-safe, uncluttered, no unreadable text.`,
          alt: `Anchor visual introducing ${input.topic}.`,
          teachingPurpose:
            "Give students a concrete visual reference before the explanation.",
        },
        {
          placement: "explain",
          modality: "video",
          title: "Process motion",
          prompt: `Create a short educational video for ${input.topic}. Show the process, sequence, or cause-and-effect change over time. No on-screen text.`,
          alt: `Video showing how ${input.topic} changes or works over time.`,
          teachingPurpose:
            "Make the central process visible rather than only described in text.",
        },
        {
          placement: "practice",
          modality: "image",
          title: "Practice sorting visual",
          prompt: `Create a simple classroom-safe visual with examples and non-examples related to ${input.topic}. Make it useful for a sorting activity. Avoid tiny text.`,
          alt: `Visual examples for practicing ${input.topic}.`,
          teachingPurpose:
            "Support the interactive classification task with concrete examples.",
        },
      ],
    },
    explanationBody: `**Core idea:** ${input.topic} helps explain patterns students can observe.\n\n**Step-by-step teaching path:** start with an everyday example, identify the important parts, connect those parts to the concept, then test the idea against a second example.\n\n**Vocabulary:** ${terms}.\n\n**Misconception check:** if students only memorize a definition, ask them to explain what they would expect to see in a new example and why.`,
    activity: {
      title: "Classification warm-up",
      instruction:
        "Sort each card, then explain one choice with evidence from the lesson.",
      strongFitLabel: "Strong fit",
      weakFitLabel: "Weak fit",
      strongItems: [
        `Everyday observation about ${input.topic}`,
        "A question students might ask",
        "A source detail that supports the explanation",
      ],
      weakItems: ["Unrelated trivia"],
    },
    quiz: {
      title: "Check understanding",
      items: [
        {
          stem: `Which statement best reflects the main idea of ${input.topic}?`,
          choices: [
            "It only matters in advanced courses.",
            "It helps explain patterns we can observe.",
            "It is unrelated to other subjects.",
          ],
          answer: "It helps explain patterns we can observe.",
          explanation:
            "Good lessons tie abstract ideas to observable patterns.",
        },
        {
          stem: "What should students use to support an explanation?",
          choices: ["Evidence", "A longer title", "Unrelated trivia"],
          answer: "Evidence",
          explanation:
            "Evidence connects the claim to something observable or source-backed.",
        },
        {
          stem: "What is the purpose of the practice activity?",
          choices: [
            "To sort examples and explain reasoning",
            "To copy definitions only",
            "To skip the lesson summary",
          ],
          answer: "To sort examples and explain reasoning",
          explanation:
            "The activity asks students to apply the concept, not only recall it.",
        },
      ],
    },
    reflectionPrompt: `Where would you notice ${input.topic} outside the classroom?`,
    teacherTips: [
      "Ask students to justify answers with one observation or source detail.",
      "Treat incorrect answers as a chance to surface misconceptions.",
      "End by having students transfer the idea to a new everyday example.",
    ],
  };
}

export async function generateLessonPlan(input: {
  transcript: string;
  topic: string;
  searchExcerpts: string[];
  entities: ExtractedEntity[];
  env: AppEnv;
}): Promise<{ plan: LessonPlan; model: string }> {
  const model = input.env.OPENAI_MODEL ?? DEFAULT_LESSON_MODEL;
  const openai = createOpenAI({ apiKey: input.env.OPENAI_API_KEY });
  const entityList =
    input.entities
      .slice(0, 12)
      .map((e) => `${e.label} (${e.kind})`)
      .join(", ") || "none";

  const { output } = await generateText({
    model: openai(model),
    temperature: 0,
    output: Output.object({
      schema: lessonPlanSchema,
      name: "lesson_plan",
      description:
        "A complete classroom lesson plan for an editable multimedia lesson renderer.",
    }),
    system:
      "You are a senior curriculum designer creating complete, classroom-ready lessons for an editable multimedia lesson canvas. Match the depth of a polished demo lesson: a vivid hook, explicit objectives, key vocabulary, sequenced explanation, worked example, misconception check, hands-on practice, multi-question quiz, reflection, and teacher facilitation tips. Use markdown only in body fields. Be accurate, age-appropriate, concrete, and grounded in the supplied transcript, extracted entities, and research excerpts. Prefer teachable details over generic encouragement.",
    prompt: [
      `Teacher transcript:\n${input.transcript}`,
      `Topic: ${input.topic}`,
      `Extracted entities: ${entityList}`,
      `Research excerpts:\n${input.searchExcerpts.slice(0, 6).join("\n\n")}`,
      [
        "Return one complete lesson plan.",
        "Make the lesson usable by a teacher without further prompting.",
        "First plan the lecture script: what the teacher says, what students do, and where media appears.",
        "Explanation sections should form a coherent mini-lecture, not separate trivia cards.",
        "The media plan must be a storyboard for fal generation. Each asset must map to a lesson part and teach something specific: image as diagram/anchor/practice visual, video as process/sequence/motion.",
        "Use assets that can be generated independently so the orchestrator can run media jobs in parallel.",
        "Each quiz answer must exactly match one of that item's choices.",
        "The activity should be specific to the topic, interactive for students, and should reveal student reasoning.",
      ].join(" "),
    ].join("\n\n---\n\n"),
  });

  return { plan: output, model };
}

export async function generateOpenAIText(input: {
  prompt: string;
  env: AppEnv;
  system?: string;
}): Promise<{ text: string; model: string }> {
  const model = input.env.OPENAI_MODEL ?? DEFAULT_LESSON_MODEL;
  const openai = createOpenAI({ apiKey: input.env.OPENAI_API_KEY });
  const { text } = await generateText({
    model: openai(model),
    system:
      input.system ??
      "You write concise, useful educational product content for teachers.",
    prompt: input.prompt,
  });
  return { text, model };
}

export async function generateOpenAICode(input: {
  prompt: string;
  env: AppEnv;
  system?: string;
}): Promise<{ text: string; model: string }> {
  const model = input.env.OPENAI_CODE_MODEL ?? DEFAULT_CODE_MODEL;
  const openai = createOpenAI({ apiKey: input.env.OPENAI_API_KEY });
  const { text } = await generateText({
    model: openai(model),
    system:
      input.system ??
      "You write production-minded browser JavaScript. Return only the requested JavaScript code, with no Markdown fences and no explanations.",
    prompt: input.prompt,
  });
  return { text, model };
}

function stripCodeFence(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(
    /^```(?:javascript|js|css)?\s*([\s\S]*?)\s*```$/i
  );
  return (fenced?.[1] ?? trimmed).trim();
}

function isUnsafeBrowserRuntimeScript(code: string) {
  return (
    /<\/script\b/i.test(code) ||
    /\beval\s*\(/i.test(code) ||
    /\bFunction\s*\(/.test(code) ||
    /\.innerHTML\b/i.test(code) ||
    /\.outerHTML\b/i.test(code) ||
    /\binsertAdjacentHTML\s*\(/i.test(code) ||
    /\bdocument\.write\s*\(/i.test(code) ||
    /\bfetch\s*\(/i.test(code) ||
    /\bXMLHttpRequest\b/i.test(code) ||
    /\bimport\s*(?:\(|[\s{*])/i.test(code) ||
    /\b(?:localStorage|sessionStorage)\b/i.test(code) ||
    /\bwindow\.location\b/i.test(code)
  );
}

export function fallbackLessonRuntimeScript() {
  return `
const root = document.querySelector("[data-runtime='static-lesson']");
if (root) {
  root.querySelectorAll("[data-objective-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const pressed = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!pressed));
      button.classList.toggle("is-complete", !pressed);
    });
  });

  root.querySelectorAll("[data-quiz-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.closest("article") ?? root;
      const answer = scope.querySelector("[data-quiz-answer]");
      const feedback = scope.querySelector("[data-quiz-feedback]");
      const isCorrect = button.textContent?.trim() === answer?.textContent?.trim();
      scope.querySelectorAll("[data-quiz-choice]").forEach((choice) => {
        choice.classList.remove("is-correct", "is-wrong");
      });
      button.classList.add(isCorrect ? "is-correct" : "is-wrong");
      if (feedback) {
        feedback.textContent = isCorrect ? "Correct. Nice reasoning." : "Try again, then compare with the answer.";
      }
    });
  });

  root.querySelectorAll("[data-classify-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-classify-card]");
      if (!card) return;
      const picked = button.getAttribute("data-classify-choice")?.split(":").pop();
      const answer = card.getAttribute("data-answer");
      const result = card.querySelector("[data-classify-result]");
      card.querySelectorAll("[data-classify-choice]").forEach((choice) => {
        choice.classList.remove("selected", "correct", "wrong");
      });
      button.classList.add("selected", picked === answer ? "correct" : "wrong");
      if (result) {
        result.textContent = picked === answer ? "Correct. Explain why this card fits." : "Try the other category, then explain the difference.";
      }
    });
  });
}
`.trim();
}

type LessonRuntimeInput = {
  prompt: string;
  plan: LessonPlan;
  entities?: ExtractedEntity[];
  env: AppEnv;
};

function entitySummary(entities?: ExtractedEntity[]) {
  return (
    entities
      ?.slice(0, 24)
      .map((e) => `${e.label} (${e.kind})`)
      .join(", ") || "none"
  );
}

function studentPresentationData(plan: LessonPlan) {
  return {
    title: plan.title,
    gradeBand: plan.gradeBand,
    durationMinutes: plan.durationMinutes,
    hook: plan.hookBody,
    objectives: plan.objectives,
    keyVocabulary: plan.keyVocabulary,
    explanationSections: plan.explanationSections,
    workedExample: plan.workedExample,
    exploreSteps: plan.lectureScript.map((item) => ({
      segment: item.segment,
      title: item.title,
      action: item.studentAction,
    })),
    activity: plan.activity,
    quiz: plan.quiz,
    reflectionPrompt: plan.reflectionPrompt,
  };
}

function topicPalette(input: Pick<LessonRuntimeInput, "prompt" | "plan">) {
  const text = `${input.prompt} ${input.plan.title}`.toLowerCase();
  if (/(ocean|water|river|weather|cycle|marine|rain|cloud)/.test(text)) {
    return {
      name: "aqua discovery",
      page: "#e6fbff",
      ink: "#123047",
      accent: "#0087a7",
      accent2: "#ffb84d",
      panel: "#f8fdff",
    };
  }
  if (
    /(plant|photosynthesis|animal|body|biology|cell|ecosystem|food)/.test(text)
  ) {
    return {
      name: "garden lab",
      page: "#f0f9e8",
      ink: "#1d3322",
      accent: "#2f8f46",
      accent2: "#e85d75",
      panel: "#fffef4",
    };
  }
  if (/(space|planet|solar|star|moon|gravity|orbit)/.test(text)) {
    return {
      name: "cosmic classroom",
      page: "#ecf3ff",
      ink: "#18233f",
      accent: "#5b5ce2",
      accent2: "#ffb23f",
      panel: "#fbfcff",
    };
  }
  if (/(history|ancient|civilization|war|revolution|culture|map)/.test(text)) {
    return {
      name: "museum quest",
      page: "#fff4df",
      ink: "#372817",
      accent: "#b85c38",
      accent2: "#267c87",
      panel: "#fffaf0",
    };
  }
  if (/(math|fraction|geometry|number|algebra|measure|pattern)/.test(text)) {
    return {
      name: "math arcade",
      page: "#f5f0ff",
      ink: "#27213f",
      accent: "#7c3aed",
      accent2: "#14a58b",
      panel: "#fffaff",
    };
  }
  return {
    name: "maker studio",
    page: "#fff8e8",
    ink: "#243042",
    accent: "#0f8b8d",
    accent2: "#f25f5c",
    panel: "#fffff7",
  };
}

export function fallbackLessonThemeCss(
  input: Pick<LessonRuntimeInput, "prompt" | "plan">
) {
  const palette = topicPalette(input);
  return `
:root {
  --demo-page: ${palette.page};
  --demo-ink: ${palette.ink};
  --demo-accent: ${palette.accent};
  --demo-accent-2: ${palette.accent2};
  --demo-panel: ${palette.panel};
}
.lesson-page {
  color: var(--demo-ink);
  background:
    radial-gradient(circle at 16% 14%, color-mix(in srgb, var(--demo-accent) 20%, transparent), transparent 24rem),
    radial-gradient(circle at 84% 10%, color-mix(in srgb, var(--demo-accent-2) 28%, transparent), transparent 22rem),
    linear-gradient(135deg, var(--demo-page), #ffffff 72%);
}
.lesson-hero::before,
.hero-panel,
.quiz-card,
.activity-card,
.explore-beat,
.explain-step,
.vocab-panel,
.reflection-panel {
  border-color: color-mix(in srgb, var(--demo-accent) 24%, transparent);
  box-shadow: 0 20px 58px rgba(31, 41, 55, .14);
}
.lesson-hero::before {
  background:
    linear-gradient(132deg, rgba(255,255,255,.78), rgba(255,255,255,.36)),
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--demo-accent) 14%, transparent) 0 3px, transparent 3px 22px);
}
.kicker,
.term,
.step-tag {
  color: var(--demo-accent);
}
.beat-number,
.next-challenge,
.example-panel {
  background: linear-gradient(135deg, var(--demo-ink), color-mix(in srgb, var(--demo-accent) 38%, #111827));
}
[data-quiz-choice],
[data-classify-choice],
[data-objective-toggle] {
  min-height: 58px;
  border-width: 2px;
  border-color: color-mix(in srgb, var(--demo-accent) 26%, transparent);
  background: linear-gradient(180deg, #ffffff, color-mix(in srgb, var(--demo-panel) 88%, var(--demo-accent-2)));
}
.quiz-card,
.activity-card {
  min-height: 250px;
  background:
    radial-gradient(circle at 12% 14%, color-mix(in srgb, var(--demo-accent-2) 20%, transparent), transparent 9rem),
    linear-gradient(180deg, var(--demo-panel), #ffffff);
}
.quiz-card:hover,
.activity-card:hover,
[data-quiz-choice]:hover,
[data-classify-choice]:hover {
  transform: translateY(-2px);
  border-color: var(--demo-accent);
}
`.trim();
}

export async function generateLessonRuntimeThemeCss(
  input: LessonRuntimeInput
): Promise<{ css: string; model: string; usedFallback: boolean }> {
  const fallbackCss = fallbackLessonThemeCss(input);
  const result = await generateOpenAICode({
    env: input.env,
    system:
      "You write safe, expressive CSS for a sandboxed children-facing lesson page. Return only CSS, with no Markdown fences and no explanations.",
    prompt: [
      "Create topic-specific CSS for an embedded sandboxed HTML lesson page.",
      "The CSS will be placed after the base styles, so it should override and enrich the existing shell rather than replace it.",
      "Make the page colorful, playful, readable, and suitable for a live student-facing teaching demo with children. Avoid a generic white-card dashboard look.",
      "The sandbox is the student presentation, not the teacher guide. Do not style or introduce teacher-facing sections such as teacher notes, teacher narration, facilitation moves, or lesson-planning cards.",
      "Make interactive areas large and obvious: [data-quiz-choice], [data-classify-choice], [data-objective-toggle], .quiz-card, and .activity-card need generous min-height, padding, and clear hover/focus states.",
      "Use the lesson topic to choose a visual language: colors, gradients, section accents, soft patterns, and motion should feel specialized to the subject.",
      "Allowed selectors include :root, .lesson-page, .lesson-hero, .hero-copy, .hero-panel, .lesson-band, .media-showcase, .explore-track, .concept-grid, .explain-timeline, .activity-grid, .quiz-grid, .reflection-grid, .next-challenge, .quiz-card, .activity-card, .explore-beat, .explain-step, .vocab-panel, .example-panel, .reflection-panel, button, [data-quiz-choice], [data-classify-choice], [data-objective-toggle], and pseudo-elements on those selectors.",
      "Do not use @import, url(), external assets, position: fixed, CSS that hides main content, tiny text, or page-wide overlays. Keep it under 220 lines.",
      `Teacher transcript:\n${input.prompt}`,
      `Extracted schema entities:\n${entitySummary(input.entities)}`,
      `Student presentation data:\n${JSON.stringify(studentPresentationData(input.plan))}`,
    ].join("\n\n---\n\n"),
  });
  const css = stripCodeFence(result.text);
  try {
    validateSandboxedLessonThemeCss(css);
  } catch {
    return { css: fallbackCss, model: result.model, usedFallback: true };
  }
  return { css, model: result.model, usedFallback: false };
}

export async function generateLessonRuntimeScript(input: {
  prompt: string;
  plan: LessonPlan;
  entities?: ExtractedEntity[];
  env: AppEnv;
}): Promise<{ code: string; model: string; usedFallback: boolean }> {
  const result = await generateOpenAICode({
    env: input.env,
    prompt: [
      "Create vanilla browser JavaScript for an embedded sandboxed lesson page.",
      "Target the quality bar of the bundled solar system demo in this repository: polished visual hierarchy, topic-specific interaction, responsive layout, meaningful motion, clear feedback, and classroom-safe copy.",
      "The HTML already contains [data-runtime='static-lesson'], [data-objective-toggle], [data-quiz-choice], [data-quiz-answer], [data-quiz-feedback], [data-classify-card], [data-classify-choice], and [data-classify-result]. It also contains <script type='application/json' id='lesson-data'> with { student, media, schemaData }.",
      "The base sandbox is already arranged as a colorful student presentation with .lesson-hero, .media-showcase, .explore-track, .concept-grid, .explain-timeline, .activity-grid, .quiz-grid, .reflection-grid, and .next-challenge. Enhance those regions or insert one high-value student-facing interactive module near the relevant section; do not flatten the page into generic white cards or repeated rows.",
      "This sandbox is for students, not the teacher canvas. Do not render teacherNarration, teacherTips, teacher notes, facilitation moves, or lesson-planning instructions.",
      "You may enhance the static lesson by creating additional sandbox HTML with document.createElement, CSS injected through a <style> element, SVG elements, Canvas 2D, timers, requestAnimationFrame, and DOM event listeners.",
      "Use Pioneer / GLiNER2 schemaData entities when they help build a concept map, process simulator, timeline, sorting lab, vocabulary hotspot, measurement comparison, or relationship visualization.",
      "Keep the existing objective toggles, quiz choices, and classification cards working. There may be multiple quiz article elements; compare a choice only with the [data-quiz-answer] inside the closest article.",
      "For classification, compare the picked value after ':' in data-classify-choice with the closest card's data-answer and write feedback into that card's [data-classify-result].",
      "Requirements: no imports, no network calls, no storage, no eval, no Function constructor, no document.write, no innerHTML/outerHTML/insertAdjacentHTML. Use DOM APIs and textContent. Keep it under 360 lines.",
      `Teacher transcript:\n${input.prompt}`,
      `Extracted schema entities:\n${entitySummary(input.entities)}`,
      `Student presentation data:\n${JSON.stringify(studentPresentationData(input.plan))}`,
    ].join("\n\n---\n\n"),
  });
  const code = stripCodeFence(result.text);
  if (code.length > 40_000 || isUnsafeBrowserRuntimeScript(code)) {
    return {
      code: fallbackLessonRuntimeScript(),
      model: result.model,
      usedFallback: true,
    };
  }
  return { code, model: result.model, usedFallback: false };
}

export async function generateLessonRuntimeEnhancement(
  input: LessonRuntimeInput
): Promise<{
  css: string;
  code: string;
  model: string;
  usedFallback: boolean;
  cssUsedFallback: boolean;
  codeUsedFallback: boolean;
}> {
  const [themeResult, scriptResult] = await Promise.allSettled([
    generateLessonRuntimeThemeCss(input),
    generateLessonRuntimeScript(input),
  ]);
  const theme =
    themeResult.status === "fulfilled"
      ? themeResult.value
      : {
          css: fallbackLessonThemeCss(input),
          model: input.env.OPENAI_CODE_MODEL ?? DEFAULT_CODE_MODEL,
          usedFallback: true,
        };
  const script =
    scriptResult.status === "fulfilled"
      ? scriptResult.value
      : {
          code: fallbackLessonRuntimeScript(),
          model: input.env.OPENAI_CODE_MODEL ?? DEFAULT_CODE_MODEL,
          usedFallback: true,
        };
  const model =
    theme.model === script.model
      ? theme.model
      : `${theme.model} / ${script.model}`;
  return {
    css: theme.css,
    code: script.code,
    model,
    usedFallback: theme.usedFallback || script.usedFallback,
    cssUsedFallback: theme.usedFallback,
    codeUsedFallback: script.usedFallback,
  };
}

export async function reviewSandboxedLessonWithCodeModel(input: {
  artifact: SandboxedLessonArtifact;
  prompt: string;
  plan: LessonPlan;
  env: AppEnv;
}): Promise<SandboxDemoReview & { model: string; usedFallback: boolean }> {
  const baseline = reviewSandboxedLessonArtifact(input.artifact);
  const model = input.env.OPENAI_CODE_MODEL ?? DEFAULT_CODE_MODEL;
  const openai = createOpenAI({ apiKey: input.env.OPENAI_API_KEY });
  try {
    const { output } = await generateText({
      model: openai(model),
      output: Output.object({
        schema: sandboxDemoReviewSchema,
        name: "sandbox_demo_review",
        description:
          "A compact CODE_MODEL review of a generated children-facing sandbox lesson page.",
      }),
      system:
        "You are a rigorous demo reviewer for children-facing educational sandbox HTML. Return schema-valid JSON only.",
      prompt: [
        "Review whether this sandbox page is playful, colorful, readable, and suitable for a live teaching demonstration for children.",
        "Focus on topic-specific visual theme, large interactive areas, clear feedback, and whether the page feels more like an engaging lesson than a generic dashboard.",
        "The sandbox is meant for students. Penalize visible teacher-facing guide content such as teacher notes, teacher narration, facilitation moves, or canvas planning cards.",
        "Do not require external assets or browser execution. Judge from the HTML, embedded CSS, data hooks, and script structure.",
        `Teacher transcript:\n${input.prompt}`,
        `Student presentation data:\n${JSON.stringify(studentPresentationData(input.plan))}`,
        `Deterministic checks:\n${JSON.stringify(baseline.checks)}`,
        `HTML excerpt:\n${input.artifact.html.replace(/\s+/g, " ").slice(0, 14_000)}`,
      ].join("\n\n---\n\n"),
    });
    const checks = [
      ...baseline.checks,
      {
        label: `CODE_MODEL demo review (${model})`,
        passed: output.passed,
      },
    ];
    const passed = baseline.passed && output.passed;
    return {
      passed,
      checks,
      model,
      usedFallback: false,
      detail: passed
        ? `CODE_MODEL ${model} review passed: ${output.summary}`
        : `CODE_MODEL ${model} review flagged demo concerns: ${
            output.concerns.join("; ") || output.summary
          }`,
    };
  } catch {
    return {
      ...baseline,
      model,
      usedFallback: true,
      detail: `CODE_MODEL ${model} review unavailable; deterministic fallback used. ${baseline.detail}`,
    };
  }
}

export async function generateOpenAIJson(input: {
  prompt: string;
  env: AppEnv;
}): Promise<{ output: OpenAIUtilityJson; model: string }> {
  const model = input.env.OPENAI_MODEL ?? DEFAULT_LESSON_MODEL;
  const openai = createOpenAI({ apiKey: input.env.OPENAI_API_KEY });
  const { output } = await generateText({
    model: openai(model),
    output: Output.object({
      schema: openAIUtilityJsonSchema,
      name: "teacher_utility_json",
      description: "A compact structured response for the teacher workflow.",
    }),
    system:
      "Return schema-valid JSON only. Keep fields concise and useful for a teacher authoring workflow.",
    prompt: input.prompt,
  });
  return { output, model };
}
