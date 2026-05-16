import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { AppEnv } from "@/lib/env";
import type { ExtractedEntity } from "./pioneer";

const DEFAULT_LESSON_MODEL = "gpt-5";

const lessonPlanSchema = z.object({
  title: z.string().min(1).max(120),
  gradeBand: z.string().min(1).max(80),
  durationMinutes: z.number().int().min(5).max(120),
  objectives: z.array(z.string().min(1).max(180)).min(2).max(4),
  hookBody: z.string().min(1).max(700),
  explanationBody: z.string().min(1).max(1200),
  activity: z.object({
    title: z.string().min(1).max(100),
    instruction: z.string().min(1).max(220),
    strongFitLabel: z.string().min(1).max(80),
    weakFitLabel: z.string().min(1).max(80),
    strongItems: z.array(z.string().min(1).max(100)).min(2).max(2),
    weakItem: z.string().min(1).max(100),
  }),
  quiz: z.object({
    title: z.string().min(1).max(100),
    stem: z.string().min(1).max(220),
    choices: z.array(z.string().min(1).max(140)).min(3).max(3),
    answer: z.string().min(1).max(140),
    explanation: z.string().min(1).max(260),
  }),
  reflectionPrompt: z.string().min(1).max(220),
});

export type LessonPlan = z.infer<typeof lessonPlanSchema>;

const openAIUtilityJsonSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(600),
  steps: z.array(z.string().min(1).max(220)).min(1).max(8),
});

export type OpenAIUtilityJson = z.infer<typeof openAIUtilityJsonSchema>;

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
      ...input.entities
        .filter((e) => e.kind === "concept" || e.kind === "term")
        .slice(0, 2)
        .map((e) => `Use or define the term **${e.label}** appropriately.`),
    ].slice(0, 4),
    hookBody: `Let's explore **${input.topic}**. What do you already notice in the world around you that might connect?`,
    explanationBody: `Here is a concise explanation you can tighten after generation:\n\n- **Core idea:** connect ${input.topic} to a concrete example students recognize.\n- **Vocabulary:** ${terms}.`,
    activity: {
      title: "Classification warm-up",
      instruction: "Which examples fit the topic best? (Demo interaction.)",
      strongFitLabel: "Strong fit",
      weakFitLabel: "Weak fit",
      strongItems: [
        `Everyday observation about ${input.topic}`,
        "A question students might ask",
      ],
      weakItem: "Unrelated trivia",
    },
    quiz: {
      title: "Check understanding",
      stem: `Which statement best reflects the main idea of ${input.topic}?`,
      choices: [
        "It only matters in advanced courses.",
        "It helps explain patterns we can observe.",
        "It is unrelated to other subjects.",
      ],
      answer: "It helps explain patterns we can observe.",
      explanation: "Good lessons tie abstract ideas to observable patterns.",
    },
    reflectionPrompt: `Where would you notice ${input.topic} outside the classroom?`,
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
    output: Output.object({
      schema: lessonPlanSchema,
      name: "lesson_plan",
      description: "A concise classroom lesson plan for the canvas renderer.",
    }),
    system:
      "You create editable, classroom-ready lessons. Use markdown only in body fields. Keep content concise, accurate, age-appropriate, and grounded in the supplied transcript and sources.",
    prompt: [
      `Teacher transcript:\n${input.transcript}`,
      `Topic: ${input.topic}`,
      `Extracted entities: ${entityList}`,
      `Research excerpts:\n${input.searchExcerpts.slice(0, 6).join("\n\n")}`,
      "Return one lesson plan. The quiz answer must exactly match one of the choices.",
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
}): Promise<{ text: string; model: string }> {
  return generateOpenAIText({
    env: input.env,
    prompt: input.prompt,
    system:
      "You write production-minded code. Return only the requested code and essential inline comments.",
  });
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
