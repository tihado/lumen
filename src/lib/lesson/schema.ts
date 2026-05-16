import { z } from "zod";

export const nodeIdSchema = z.string().min(1);

export const citationSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  excerpt: z.string(),
  retrievedAt: z.string(),
  provider: z.literal("tavily"),
  nodeIds: z.array(z.string()).optional(),
});

export type Citation = z.infer<typeof citationSchema>;

export const mediaProvenanceSchema = z.object({
  provider: z.enum(["fal", "slng"]),
  model: z.string().optional(),
  jobId: z.string().optional(),
  prompt: z.string().optional(),
  createdAt: z.string(),
});

export type MediaProvenance = z.infer<typeof mediaProvenanceSchema>;

export const textBlockSchema = z.object({
  id: nodeIdSchema,
  type: z.literal("text"),
  title: z.string().optional(),
  format: z.enum(["markdown", "plain"]),
  body: z.string(),
  citationIds: z.array(z.string()).optional(),
});

export type TextBlock = z.infer<typeof textBlockSchema>;

export const mediaBlockSchema = z.object({
  id: nodeIdSchema,
  type: z.literal("media"),
  title: z.string().optional(),
  modality: z.enum(["image", "video", "audio"]),
  alt: z.string(),
  status: z.enum(["pending", "ready", "failed"]),
  asset: z
    .object({
      url: z.string(),
      mime: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  provenance: mediaProvenanceSchema.optional(),
});

export type MediaBlock = z.infer<typeof mediaBlockSchema>;

export const quizItemSchema = z.object({
  id: z.string(),
  stem: z.string(),
  choices: z.array(z.string()).optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
});

export const quizBlockSchema = z.object({
  id: nodeIdSchema,
  type: z.literal("quiz"),
  title: z.string().optional(),
  items: z.array(quizItemSchema),
});

export type QuizBlock = z.infer<typeof quizBlockSchema>;

export const matchingPairSchema = z.object({
  id: z.string(),
  term: z.string(),
  definition: z.string(),
});

export const activityCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const activityItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  categoryId: z.string(),
});

export const activityStepSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const activityBlockSchema = z.object({
  id: nodeIdSchema,
  type: z.literal("activity"),
  title: z.string().optional(),
  kind: z.enum(["matching", "classification", "ordering"]),
  instruction: z.string().optional(),
  pairs: z.array(matchingPairSchema).optional(),
  categories: z.array(activityCategorySchema).optional(),
  items: z.array(activityItemSchema).optional(),
  steps: z.array(activityStepSchema).optional(),
});

export type ActivityBlock = z.infer<typeof activityBlockSchema>;

export const sectionBlockSchema = z.object({
  id: nodeIdSchema,
  type: z.literal("section"),
  title: z.string(),
  summary: z.string().optional(),
  children: z.array(nodeIdSchema),
});

export type SectionBlock = z.infer<typeof sectionBlockSchema>;

export const objectiveBlockSchema = z.object({
  id: nodeIdSchema,
  type: z.literal("objectives"),
  title: z.string().optional(),
  bullets: z.array(z.string()),
});

export type ObjectiveBlock = z.infer<typeof objectiveBlockSchema>;

export const reflectionBlockSchema = z.object({
  id: nodeIdSchema,
  type: z.literal("reflection"),
  title: z.string().optional(),
  prompt: z.string(),
  rubric: z.string().optional(),
});

export type ReflectionBlock = z.infer<typeof reflectionBlockSchema>;

export const lessonNodeSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  mediaBlockSchema,
  quizBlockSchema,
  activityBlockSchema,
  sectionBlockSchema,
  objectiveBlockSchema,
  reflectionBlockSchema,
]);

export type LessonNode = z.infer<typeof lessonNodeSchema>;

export const lessonDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  title: z.string(),
  gradeBand: z.string().optional(),
  durationMinutes: z.number().optional(),
  language: z.string().optional(),
  root: nodeIdSchema,
  nodes: z.record(z.string(), lessonNodeSchema),
  citations: z.array(citationSchema),
});

export type LessonDocument = z.infer<typeof lessonDocumentSchema>;

export const generationRunSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  transcript: z.string().optional(),
  steps: z.array(
    z.object({
      id: z.string(),
      provider: z.enum([
        "llm",
        "tavily",
        "pioneer",
        "fal",
        "slng",
        "orchestrator",
      ]),
      label: z.string(),
      status: z.enum(["started", "completed", "failed"]),
      detail: z.string().optional(),
      startedAt: z.string(),
      finishedAt: z.string().optional(),
    })
  ),
});

export type GenerationRun = z.infer<typeof generationRunSchema>;

export function createEmptyLesson(input: {
  id: string;
  title: string;
  rootId: string;
}): LessonDocument {
  const root: SectionBlock = {
    id: input.rootId,
    type: "section",
    title: "Lesson",
    children: [],
  };
  return {
    schemaVersion: 1,
    id: input.id,
    title: input.title,
    root: root.id,
    nodes: { [root.id]: root },
    citations: [],
  };
}

export function parseLessonDocument(data: unknown): LessonDocument {
  return lessonDocumentSchema.parse(data);
}

export function safeParseLessonDocument(data: unknown) {
  return lessonDocumentSchema.safeParse(data);
}
