import { nanoid } from "nanoid";
import type { AppEnv, ProviderReadiness } from "@/lib/env";
import type { LessonPatchOp } from "@/lib/lesson/patches";
import { applyLessonPatch } from "@/lib/lesson/patches";
import type { Citation } from "@/lib/lesson/schema";
import { createEmptyLesson } from "@/lib/lesson/schema";
import { isSafeHttpsUrl } from "@/lib/url";
import { falGenerateImage, fallbackFalImage } from "./providers/fal";
import { fallbackLessonPlan, generateLessonPlan } from "./providers/llm";
import {
  type ExtractedEntity,
  heuristicExtract,
  pioneerExtract,
} from "./providers/pioneer";
import { describeSlngClientSetup } from "./providers/slng";
import { fallbackTavilyResults, tavilySearch } from "./providers/tavily";
import type { StreamEvent } from "./stream-events";

export type { StreamEvent } from "./stream-events";

function step() {
  return nanoid(8);
}

function topicFromTranscript(transcript: string): string {
  const t = transcript.trim();
  if (!t) {
    return "Untitled lesson";
  }
  const line = t.split("\n").find((l) => l.trim().length > 0) ?? t;
  return line.slice(0, 160).trim();
}

function citationsFromTavily(
  results: { title?: string; url: string; content: string }[],
  nodeHint: string
): Citation[] {
  const now = new Date().toISOString();
  return results
    .filter((r) => isSafeHttpsUrl(r.url))
    .slice(0, 6)
    .map((r, i) => ({
      id: `cit-${nanoid(6)}`,
      url: r.url,
      title: r.title,
      excerpt: r.content.slice(0, 420),
      retrievedAt: now,
      provider: "tavily" as const,
      nodeIds: i === 0 ? [nodeHint] : undefined,
    }));
}

export async function* generateLessonStream(input: {
  transcript: string;
  lessonId?: string;
  env: AppEnv;
  readiness: ProviderReadiness;
}): AsyncGenerator<StreamEvent> {
  const runId = nanoid(12);
  const lessonId = input.lessonId ?? nanoid(10);
  const topic = topicFromTranscript(input.transcript);

  yield {
    type: "run_started",
    runId,
    lessonId,
    readiness: input.readiness,
  };

  try {
    let doc = createEmptyLesson({
      id: lessonId,
      title: topic,
      rootId: "root",
    });
    doc = applyLessonPatch(doc, {
      op: "set_meta",
      title: topic,
      gradeBand: "General audience",
      durationMinutes: 20,
    });

    const slngHint = describeSlngClientSetup(input.env);
    const s0 = step();
    yield {
      type: "provider_started",
      runId,
      stepId: s0,
      provider: "slng",
      label: "Voice / transcript intake",
    };
    yield {
      type: "provider_completed",
      runId,
      stepId: s0,
      provider: "slng",
      detail: slngHint.hint,
      usedFallback: !slngHint.ready,
    };

    const s1 = step();
    yield {
      type: "provider_started",
      runId,
      stepId: s1,
      provider: "tavily",
      label: "Web-aware research (Tavily)",
    };
    let tavilyUsedFallback = !input.readiness.tavily;
    let searchResults = fallbackTavilyResults(topic);
    if (input.readiness.tavily) {
      try {
        const queries = [
          `${topic} classroom explanation`,
          `${topic} common misconceptions students`,
        ];
        const merged: typeof searchResults = [];
        for (const q of queries) {
          const part = await tavilySearch(q, input.env);
          merged.push(...part);
        }
        const seen = new Set<string>();
        searchResults = merged.filter((r) => {
          if (seen.has(r.url)) {
            return false;
          }
          seen.add(r.url);
          return true;
        });
        if (searchResults.length === 0) {
          searchResults = fallbackTavilyResults(topic);
          tavilyUsedFallback = true;
        }
      } catch {
        searchResults = fallbackTavilyResults(topic);
        tavilyUsedFallback = true;
      }
    }
    yield {
      type: "provider_completed",
      runId,
      stepId: s1,
      provider: "tavily",
      detail: `${searchResults.length} source cards`,
      usedFallback: tavilyUsedFallback,
    };

    const hookTextId = "txt-hook";
    const citations = citationsFromTavily(searchResults, hookTextId);
    doc = applyLessonPatch(doc, { op: "set_citations", citations });

    const s2 = step();
    yield {
      type: "provider_started",
      runId,
      stepId: s2,
      provider: "pioneer",
      label: "Structured extraction (Pioneer / GLiNER2)",
    };
    const extractInput =
      `${input.transcript}\n\n---\n\n${searchResults.map((r) => r.content).join("\n\n")}`.slice(
        0,
        8000
      );
    let entities: ExtractedEntity[] = [];
    let pioneerFallback = !input.readiness.pioneer;
    if (input.readiness.pioneer) {
      try {
        entities = await pioneerExtract(extractInput, input.env);
        if (entities.length === 0) {
          entities = heuristicExtract(topic);
          pioneerFallback = true;
        }
      } catch {
        entities = heuristicExtract(topic);
        pioneerFallback = true;
      }
    } else {
      entities = heuristicExtract(topic);
    }
    yield {
      type: "provider_completed",
      runId,
      stepId: s2,
      provider: "pioneer",
      detail: `${entities.length} extracted slots`,
      usedFallback: pioneerFallback,
    };

    const s3 = step();
    yield {
      type: "provider_started",
      runId,
      stepId: s3,
      provider: "llm",
      label: "AI lesson composition (AI SDK)",
    };

    let llmUsedFallback = !input.readiness.llm;
    let lessonPlan = fallbackLessonPlan({ topic, entities });
    let lessonModel = input.env.OPENAI_MODEL ?? "gpt-5";
    if (input.readiness.llm) {
      try {
        const generated = await generateLessonPlan({
          transcript: input.transcript,
          topic,
          searchExcerpts: searchResults.map((r) => r.content),
          entities,
          env: input.env,
        });
        lessonPlan = generated.plan;
        lessonModel = generated.model;
        llmUsedFallback = false;
      } catch {
        lessonPlan = fallbackLessonPlan({ topic, entities });
        llmUsedFallback = true;
      }
    }
    yield {
      type: "provider_completed",
      runId,
      stepId: s3,
      provider: "llm",
      detail: llmUsedFallback
        ? "Deterministic lesson fallback"
        : `Structured plan via OpenAI ${lessonModel}`,
      usedFallback: llmUsedFallback,
    };

    const s4 = step();
    yield {
      type: "provider_started",
      runId,
      stepId: s4,
      provider: "orchestrator",
      label: "Materialize lesson patches",
    };

    const objId = "obj-main";
    const secHook = "sec-hook";
    const secExplain = "sec-explain";
    const secPractice = "sec-practice";
    const quizId = "quiz-main";
    const reflId = "refl-main";
    const mediaId = "media-cover";

    const patches: LessonPatchOp[] = [
      {
        op: "set_meta",
        title: lessonPlan.title,
        gradeBand: lessonPlan.gradeBand,
        durationMinutes: lessonPlan.durationMinutes,
      },
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: objId,
          type: "objectives",
          title: "Learning objectives",
          bullets: lessonPlan.objectives,
        },
      },
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: secHook,
          type: "section",
          title: "Hook",
          children: [],
        },
      },
      {
        op: "add_node",
        parentId: secHook,
        node: {
          id: hookTextId,
          type: "text",
          title: "Wonder moment",
          format: "markdown",
          body: lessonPlan.hookBody,
          citationIds: citations[0] ? [citations[0].id] : undefined,
        },
      },
      {
        op: "add_node",
        parentId: secHook,
        node: {
          id: mediaId,
          type: "media",
          title: "Cover visual",
          modality: "image",
          alt: `Illustration related to ${topic}`,
          status: "pending",
        },
      },
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: secExplain,
          type: "section",
          title: "Explain",
          children: [],
        },
      },
      {
        op: "add_node",
        parentId: secExplain,
        node: {
          id: "txt-e1",
          type: "text",
          format: "markdown",
          body: lessonPlan.explanationBody,
        },
      },
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: secPractice,
          type: "section",
          title: "Quick check",
          children: [],
        },
      },
      {
        op: "add_node",
        parentId: secPractice,
        node: {
          id: "act-classify",
          type: "activity",
          title: lessonPlan.activity.title,
          kind: "classification",
          instruction: lessonPlan.activity.instruction,
          categories: [
            { id: "c1", label: lessonPlan.activity.strongFitLabel },
            { id: "c2", label: lessonPlan.activity.weakFitLabel },
          ],
          items: [
            {
              id: "a1",
              label: lessonPlan.activity.strongItems[0],
              categoryId: "c1",
            },
            { id: "a2", label: lessonPlan.activity.weakItem, categoryId: "c2" },
            {
              id: "a3",
              label: lessonPlan.activity.strongItems[1],
              categoryId: "c1",
            },
          ],
        },
      },
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: quizId,
          type: "quiz",
          title: lessonPlan.quiz.title,
          items: [
            {
              id: "q1",
              stem: lessonPlan.quiz.stem,
              choices: lessonPlan.quiz.choices,
              answer: lessonPlan.quiz.answer,
              explanation: lessonPlan.quiz.explanation,
            },
          ],
        },
      },
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: reflId,
          type: "reflection",
          title: "Exit ticket",
          prompt: lessonPlan.reflectionPrompt,
        },
      },
    ];

    for (const p of patches) {
      doc = applyLessonPatch(doc, p);
      yield { type: "lesson_patch", runId, patch: p };
      yield { type: "lesson_snapshot", runId, lesson: doc };
    }

    yield {
      type: "provider_completed",
      runId,
      stepId: s3,
      provider: "orchestrator",
      detail: "Lesson nodes materialized",
    };

    const s5 = step();
    yield {
      type: "provider_started",
      runId,
      stepId: s5,
      provider: "fal",
      label: "Generative cover image (fal)",
    };
    const prompt = `Educational cover illustration for lesson: ${topic}. Clean vector-like shapes, readable labels, classroom-safe, no text overlay.`;
    let falUsedFallback = !input.readiness.fal;
    let image = fallbackFalImage(topic);
    if (input.readiness.fal) {
      try {
        image = await falGenerateImage(prompt, input.env);
        falUsedFallback = false;
      } catch {
        image = fallbackFalImage(topic);
        falUsedFallback = true;
      }
    }
    const readyMedia = {
      id: mediaId,
      type: "media" as const,
      title: "Cover visual",
      modality: "image" as const,
      alt: `Illustration related to ${topic}`,
      status: "ready" as const,
      asset: {
        url: image.url,
        mime: image.mime,
        width: image.width,
        height: image.height,
      },
      provenance: {
        provider: "fal" as const,
        model: process.env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell",
        prompt,
        createdAt: new Date().toISOString(),
      },
    };
    const mediaPatch: LessonPatchOp = { op: "replace_node", node: readyMedia };
    doc = applyLessonPatch(doc, mediaPatch);
    yield { type: "lesson_patch", runId, patch: mediaPatch };
    yield { type: "lesson_snapshot", runId, lesson: doc };
    yield {
      type: "provider_completed",
      runId,
      stepId: s5,
      provider: "fal",
      detail: image.url,
      usedFallback: falUsedFallback,
    };

    yield { type: "run_completed", runId, lessonId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    yield { type: "run_failed", runId, message };
  }
}
