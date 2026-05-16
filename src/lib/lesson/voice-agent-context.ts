import type { LessonDocument, LessonNode } from "@/lib/lesson/schema";

export type LessonVoiceAgentContext = {
  lessonId: string;
  lessonTitle: string;
  lessonSummary?: string;
  transcript?: string;
  demoMode?: string;
};

function nodeSummary(node: LessonNode) {
  if (node.type === "objectives") {
    return [`Objectives: ${node.bullets.join("; ")}`];
  }
  if (node.type === "text") {
    return [[node.title, node.body].filter(Boolean).join(": ")];
  }
  if (node.type === "media") {
    return [`${node.modality} media: ${node.title ?? node.alt}. ${node.alt}`];
  }
  if (node.type === "quiz") {
    return node.items.map((item) =>
      [`Quiz: ${item.stem}`, item.answer ? `Answer: ${item.answer}` : ""]
        .filter(Boolean)
        .join(" ")
    );
  }
  if (node.type === "activity") {
    return [
      [
        `Activity: ${node.title ?? node.kind}`,
        node.instruction,
        node.pairs
          ?.map((pair) => `${pair.term}: ${pair.definition}`)
          .join("; "),
        node.items?.map((item) => item.label).join(", "),
        node.steps?.map((step) => step.text).join("; "),
      ]
        .filter(Boolean)
        .join(" "),
    ];
  }
  if (node.type === "reflection") {
    return [`Reflection: ${node.prompt}`];
  }
  if (node.type === "section") {
    return [[node.title, node.summary].filter(Boolean).join(": ")];
  }
  return [];
}

export function summarizeLessonForVoiceAgent(doc: LessonDocument) {
  const chunks = Object.values(doc.nodes).flatMap(nodeSummary);
  return chunks.join("\n").replace(/\s+\n/g, "\n").slice(0, 1000);
}

export function contextFromLessonDocument(
  doc: LessonDocument,
  input?: {
    transcript?: string;
    demoMode?: string;
  }
): LessonVoiceAgentContext {
  return {
    lessonId: doc.id,
    lessonTitle: doc.title,
    lessonSummary: summarizeLessonForVoiceAgent(doc),
    transcript:
      input?.transcript ??
      `Current lesson: ${doc.title}. Help the learner ask questions and explain the material clearly.`,
    demoMode: input?.demoMode ?? "lesson-page-guide",
  };
}
