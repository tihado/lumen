import { nanoid } from "nanoid";
import type { AppEnv, ProviderReadiness } from "@/lib/env";
import type { LessonPatchOp } from "@/lib/lesson/patches";
import { applyLessonPatch } from "@/lib/lesson/patches";
import type { Citation } from "@/lib/lesson/schema";
import { createEmptyLesson } from "@/lib/lesson/schema";
import {
  mirrorRemoteAssetToS3,
  uploadGeneratedBytesToS3,
} from "@/lib/media/s3-storage";
import { isSafeHttpsUrl } from "@/lib/url";
import { createSandboxedLessonArtifact } from "../lesson/html-artifact";
import {
  createGeneratingLesson,
  createGenerationRun,
  finishGenerationRun,
  markLessonFailed,
  saveLessonVersion,
} from "../lesson/repository";
import { createPersistedStudioSpec } from "../lesson/studio-state";
import {
  falGenerateImage,
  falGenerateVideo,
  fallbackFalImage,
  fallbackFalVideo,
} from "./providers/fal";
import {
  fallbackLessonPlan,
  fallbackLessonRuntimeScript,
  fallbackLessonThemeCss,
  generateLessonPlan,
  generateLessonRuntimeEnhancement,
  type LessonPlan,
  reviewSandboxedLessonWithCodeModel,
} from "./providers/llm";
import {
  type ExtractedEntity,
  heuristicExtract,
  pioneerExtract,
} from "./providers/pioneer";
import {
  describeSlngClientSetup,
  slngTextToSpeech,
  slngTtsModel,
} from "./providers/slng";
import { fallbackTavilyResults, tavilySearch } from "./providers/tavily";
import type {
  ProviderId,
  StreamEvent,
  StudioTimelineRow,
} from "./stream-events";

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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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

type SandboxEntityNode = {
  label: string;
  kind: ExtractedEntity["kind"];
  span?: string;
  summary?: string;
  children?: SandboxEntityNode[];
};

const MAX_SANDBOX_ENTITY_NESTING_LEVEL = 5;

function compactSummary(value: string | undefined, maxLength = 190) {
  const compact = value?.replace(/\s+/g, " ").trim();
  if (!compact) {
    return;
  }
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 3).trimEnd()}...`
    : compact;
}

function normalizedEntityLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function textMentionsEntity(text: string | undefined, label: string) {
  const normalizedText = normalizedEntityLabel(text ?? "");
  const normalizedLabel = normalizedEntityLabel(label);
  return (
    normalizedLabel.length > 0 &&
    ` ${normalizedText} `.includes(` ${normalizedLabel} `)
  );
}

function dedupeSandboxEntityNodes(nodes: SandboxEntityNode[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key = `${node.kind}:${normalizedEntityLabel(node.label)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function limitSandboxEntityNodes(
  nodes: SandboxEntityNode[],
  level = 1
): SandboxEntityNode[] {
  return nodes.map((node) => {
    const children =
      level < MAX_SANDBOX_ENTITY_NESTING_LEVEL && node.children
        ? limitSandboxEntityNodes(node.children, level + 1)
        : [];
    return {
      label: node.label,
      kind: node.kind,
      ...(node.span ? { span: node.span } : {}),
      ...(node.summary ? { summary: node.summary } : {}),
      ...(children.length > 0 ? { children } : {}),
    };
  });
}

function sandboxEntityExtractionText(input: {
  transcript: string;
  searchResults: { title?: string; content: string }[];
  plan: LessonPlan;
}) {
  const planSummary = {
    title: input.plan.title,
    objectives: input.plan.objectives,
    keyVocabulary: input.plan.keyVocabulary,
    explanationSections: input.plan.explanationSections,
    workedExample: input.plan.workedExample,
    activity: input.plan.activity,
    quiz: input.plan.quiz,
    reflectionPrompt: input.plan.reflectionPrompt,
  };
  return [
    input.transcript,
    input.searchResults
      .map((result) => `${result.title ?? "Source"}\n${result.content}`)
      .join("\n\n"),
    JSON.stringify(planSummary),
  ]
    .join("\n\n---\n\n")
    .slice(0, 12_000);
}

function buildSandboxPresentationEntities(input: {
  topic: string;
  entities: ExtractedEntity[];
  plan: LessonPlan;
  searchResults: { title?: string; content: string }[];
}): SandboxEntityNode[] {
  const seededEntities: ExtractedEntity[] = [...input.entities];
  const seen = new Set(
    seededEntities.map((entity) => normalizedEntityLabel(entity.label))
  );

  for (const item of input.plan.keyVocabulary) {
    const key = normalizedEntityLabel(item.term);
    if (!seen.has(key)) {
      seen.add(key);
      seededEntities.push({
        label: item.term,
        kind: "term",
        span: item.definition,
      });
    }
  }

  if (seededEntities.length === 0) {
    seededEntities.push({
      label: input.topic,
      kind: "concept",
      span: input.plan.hookBody,
    });
  }

  const nodes = seededEntities.slice(0, 18).map((entity): SandboxEntityNode => {
    const vocabulary = input.plan.keyVocabulary.find((item) =>
      textMentionsEntity(item.term, entity.label)
    );
    const explanationMatches = input.plan.explanationSections
      .filter(
        (section) =>
          textMentionsEntity(section.title, entity.label) ||
          textMentionsEntity(section.body, entity.label)
      )
      .slice(0, 2);
    const sourceMatches = input.searchResults
      .filter((result) => textMentionsEntity(result.content, entity.label))
      .slice(0, 2);
    const practiceItems = [
      ...input.plan.activity.strongItems,
      ...input.plan.activity.weakItems,
    ]
      .filter((item) => textMentionsEntity(item, entity.label))
      .slice(0, 2);

    const children = dedupeSandboxEntityNodes([
      ...(vocabulary
        ? [
            {
              label: `Meaning of ${vocabulary.term}`,
              kind: "term" as const,
              summary: compactSummary(vocabulary.definition),
            },
          ]
        : []),
      ...explanationMatches.map((section) => ({
        label: section.title,
        kind: "relationship" as const,
        summary: compactSummary(section.body),
      })),
      ...sourceMatches.map((result, index) => ({
        label: result.title ?? `Tavily source ${index + 1}`,
        kind: "relationship" as const,
        summary: compactSummary(result.content),
      })),
      ...practiceItems.map((item) => ({
        label: item,
        kind: "object" as const,
        summary: compactSummary(
          `${item} appears in the practice lab for ${input.plan.activity.title}.`
        ),
      })),
    ]);

    const summary =
      compactSummary(vocabulary?.definition) ??
      compactSummary(entity.span) ??
      compactSummary(sourceMatches[0]?.content) ??
      compactSummary(
        `${entity.label} is a ${entity.kind} extracted for ${input.plan.title}.`
      );

    return {
      label: entity.label,
      kind: entity.kind,
      ...(entity.span ? { span: entity.span } : {}),
      ...(summary ? { summary } : {}),
      ...(children.length > 0 ? { children } : {}),
    };
  });

  return limitSandboxEntityNodes(dedupeSandboxEntityNodes(nodes));
}

type PlannedMediaAsset = LessonPlan["mediaPlan"]["assets"][number] & {
  nodeId: string;
  parentId: string;
};

function plannedMediaAssets(
  plan: LessonPlan,
  sectionIds: {
    hook: string;
    explain: string;
    example: string;
    practice: string;
  }
): PlannedMediaAsset[] {
  const assets = [...plan.mediaPlan.assets];

  if (!assets.some((asset) => asset.modality === "image")) {
    assets.unshift({
      placement: "hook",
      modality: "image",
      title: "Opening anchor visual",
      prompt: plan.mediaPlan.imagePrompt,
      alt: plan.mediaPlan.imageAlt,
      teachingPurpose: "Give students a concrete anchor for the lesson.",
    });
  }

  if (!assets.some((asset) => asset.modality === "video")) {
    assets.push({
      placement: "explain",
      modality: "video",
      title: "Process motion",
      prompt: plan.mediaPlan.videoPrompt,
      alt: plan.mediaPlan.videoAlt,
      teachingPurpose:
        "Show motion, sequence, or cause and effect for the main concept.",
    });
  }

  let imageCount = 0;
  let videoCount = 0;

  return assets.slice(0, 4).map((asset) => {
    const nodeId =
      asset.modality === "image"
        ? imageCount++ === 0
          ? "media-cover"
          : `media-image-${imageCount}`
        : videoCount++ === 0
          ? "media-video"
          : `media-video-${videoCount}`;

    return {
      ...asset,
      nodeId,
      parentId: sectionIds[asset.placement],
    };
  });
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
  let generationRunCreated = false;
  const studioTimeline: StudioTimelineRow[] = [];

  const providerStarted = (
    stepId: string,
    provider: ProviderId,
    label: string
  ): StreamEvent => {
    studioTimeline.push({
      key: stepId,
      provider,
      label,
      status: "started",
    });
    return { type: "provider_started", runId, stepId, provider, label };
  };

  const providerCompleted = (
    stepId: string,
    provider: ProviderId,
    detail?: string,
    usedFallback?: boolean,
    problem?: string
  ): StreamEvent => {
    const existing = studioTimeline.find((row) => row.key === stepId);
    if (existing) {
      existing.status = "completed";
      existing.detail = detail;
      existing.usedFallback = usedFallback;
      existing.problem = problem;
    } else {
      studioTimeline.push({
        key: stepId,
        provider,
        label: "",
        status: "completed",
        detail,
        usedFallback,
        problem,
      });
    }
    return {
      type: "provider_completed",
      runId,
      stepId,
      provider,
      detail,
      usedFallback,
      problem,
    };
  };

  yield {
    type: "run_started",
    runId,
    lessonId,
    readiness: input.readiness,
  };

  try {
    await createGeneratingLesson({
      id: lessonId,
      title: topic,
      prompt: input.transcript,
    });
    await createGenerationRun({
      id: runId,
      lessonId,
      transcript: input.transcript,
    });
    generationRunCreated = true;

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
    yield providerStarted(s0, "slng", "Voice / transcript intake");
    yield providerCompleted(
      s0,
      "slng",
      slngHint.hint,
      !slngHint.ready,
      slngHint.ready
        ? undefined
        : "SLNG_API_KEY and SLNG_API_BASE_URL are not configured; using the typed or browser transcript path."
    );

    const s1 = step();
    yield providerStarted(s1, "tavily", "Web-aware research (Tavily)");
    let tavilyUsedFallback = !input.readiness.tavily;
    let tavilyProblem = tavilyUsedFallback
      ? "TAVILY_API_KEY is missing; using curated demo source cards."
      : undefined;
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
          tavilyProblem =
            "Tavily returned no source cards; using curated demo source cards.";
        }
      } catch (error) {
        searchResults = fallbackTavilyResults(topic);
        tavilyUsedFallback = true;
        tavilyProblem = `Tavily search failed: ${errorMessage(error)}`;
      }
    }
    yield providerCompleted(
      s1,
      "tavily",
      `${searchResults.length} source cards`,
      tavilyUsedFallback,
      tavilyProblem
    );

    const hookTextId = "txt-hook";
    const citations = citationsFromTavily(searchResults, hookTextId);
    doc = applyLessonPatch(doc, { op: "set_citations", citations });

    const s2 = step();
    yield providerStarted(
      s2,
      "pioneer",
      "Structured extraction (Pioneer / GLiNER2)"
    );
    const extractInput =
      `${input.transcript}\n\n---\n\n${searchResults.map((r) => r.content).join("\n\n")}`.slice(
        0,
        8000
      );
    let entities: ExtractedEntity[] = [];
    let pioneerFallback = !input.readiness.pioneer;
    let pioneerProblem = pioneerFallback
      ? "PIONEER_API_URL or PIONEER_API_KEY is missing; using heuristic entity extraction."
      : undefined;
    if (input.readiness.pioneer) {
      try {
        entities = await pioneerExtract(extractInput, input.env);
        if (entities.length === 0) {
          entities = heuristicExtract(topic);
          pioneerFallback = true;
          pioneerProblem =
            "Pioneer / GLiNER2 returned no entities; using heuristic entity extraction.";
        }
      } catch (error) {
        entities = heuristicExtract(topic);
        pioneerFallback = true;
        pioneerProblem = `Pioneer / GLiNER2 extraction failed: ${errorMessage(error)}`;
      }
    } else {
      entities = heuristicExtract(topic);
    }
    let schemaDataProvider = pioneerFallback
      ? ("heuristic" as const)
      : ("pioneer-gliner2" as const);
    yield providerCompleted(
      s2,
      "pioneer",
      `${entities.length} extracted schema entities`,
      pioneerFallback,
      pioneerProblem
    );

    const s3 = step();
    yield providerStarted(s3, "llm", "AI lesson composition (AI SDK)");

    let llmUsedFallback = !input.readiness.llm;
    let llmProblem = llmUsedFallback
      ? "OPENAI_API_KEY is missing; using the deterministic lesson planner."
      : undefined;
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
      } catch (error) {
        lessonPlan = fallbackLessonPlan({ topic, entities });
        llmUsedFallback = true;
        llmProblem = `OpenAI lesson planning failed: ${errorMessage(error)}`;
      }
    }
    yield providerCompleted(
      s3,
      "llm",
      llmUsedFallback
        ? "Deterministic lesson fallback"
        : `Structured plan via OpenAI ${lessonModel}`,
      llmUsedFallback,
      llmProblem
    );

    const sSchema = step();
    yield providerStarted(
      sSchema,
      "pioneer",
      "Build nested sandbox entity JSON"
    );
    let sandboxEntities = entities;
    let sandboxSchemaUsedFallback = pioneerFallback;
    let sandboxSchemaProblem = pioneerFallback ? pioneerProblem : undefined;
    if (input.readiness.pioneer) {
      try {
        const refinedEntities = await pioneerExtract(
          sandboxEntityExtractionText({
            transcript: input.transcript,
            searchResults,
            plan: lessonPlan,
          }),
          input.env
        );
        if (refinedEntities.length > 0) {
          sandboxEntities = refinedEntities;
          schemaDataProvider = "pioneer-gliner2";
          sandboxSchemaUsedFallback = false;
          sandboxSchemaProblem = undefined;
        } else {
          sandboxSchemaUsedFallback = true;
          sandboxSchemaProblem =
            "Pioneer / GLiNER2 returned no post-plan entities; using earlier extraction and lesson-plan vocabulary.";
        }
      } catch (error) {
        sandboxSchemaUsedFallback = true;
        sandboxSchemaProblem = `Post-plan Pioneer / GLiNER2 extraction failed: ${errorMessage(error)}`;
      }
    }
    const sandboxPresentationEntities = buildSandboxPresentationEntities({
      topic,
      entities: sandboxEntities,
      plan: lessonPlan,
      searchResults,
    });
    yield providerCompleted(
      sSchema,
      "pioneer",
      `${sandboxPresentationEntities.length} top-level sandbox entity nodes`,
      sandboxSchemaUsedFallback,
      sandboxSchemaProblem
    );

    const s4 = step();
    yield providerStarted(s4, "orchestrator", "Materialize lesson patches");

    const objId = "obj-main";
    const secHook = "sec-hook";
    const secExplain = "sec-explain";
    const secVocab = "sec-vocab";
    const secScript = "sec-script";
    const secExample = "sec-example";
    const secPractice = "sec-practice";
    const secTeacherTips = "sec-teacher-tips";
    const quizId = "quiz-main";
    const reflId = "refl-main";
    const audioId = "media-audio";
    const mediaAssets = plannedMediaAssets(lessonPlan, {
      hook: secHook,
      explain: secExplain,
      example: secExample,
      practice: secPractice,
    });

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
        parentId: "root",
        node: {
          id: secScript,
          type: "section",
          title: "Lecture script",
          children: [],
        },
      },
      {
        op: "add_node",
        parentId: secScript,
        node: {
          id: "txt-lecture-script",
          type: "text",
          title: "Teacher talk track and student actions",
          format: "markdown",
          body: lessonPlan.lectureScript
            .map(
              (item, index) =>
                `### ${index + 1}. ${item.title}\n**Teacher says:** ${item.teacherNarration}\n\n**Students do:** ${item.studentAction}`
            )
            .join("\n\n"),
        },
      },
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: secVocab,
          type: "section",
          title: "Key vocabulary",
          children: [],
        },
      },
      {
        op: "add_node",
        parentId: secVocab,
        node: {
          id: "txt-vocab",
          type: "text",
          title: "Terms students will use",
          format: "markdown",
          body: lessonPlan.keyVocabulary
            .map((item) => `- **${item.term}:** ${item.definition}`)
            .join("\n"),
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
      ...lessonPlan.explanationSections.map(
        (section, index): LessonPatchOp => ({
          op: "add_node",
          parentId: secExplain,
          node: {
            id: `txt-explain-${index + 1}`,
            type: "text",
            title: section.title,
            format: "markdown",
            body: section.body,
          },
        })
      ),
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: secExample,
          type: "section",
          title: "Worked example",
          children: [],
        },
      },
      {
        op: "add_node",
        parentId: secExample,
        node: {
          id: "txt-worked-example",
          type: "text",
          title: lessonPlan.workedExample.title,
          format: "markdown",
          body: lessonPlan.workedExample.body,
        },
      },
      {
        op: "add_node",
        parentId: secExplain,
        node: {
          id: audioId,
          type: "media",
          title: "Narration audio",
          modality: "audio",
          alt: `Narration summary for ${topic}`,
          status: input.readiness.slng ? "pending" : "failed",
          provenance: {
            provider: "slng",
            model: slngTtsModel(input.env),
            prompt: lessonPlan.explanationBody.slice(0, 900),
            createdAt: new Date().toISOString(),
          },
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
            ...lessonPlan.activity.strongItems.map((label, index) => ({
              id: `a-strong-${index + 1}`,
              label,
              categoryId: "c1",
            })),
            ...lessonPlan.activity.weakItems.map((label, index) => ({
              id: `a-weak-${index + 1}`,
              label,
              categoryId: "c2",
            })),
          ],
        },
      },
      ...mediaAssets.map(
        (asset): LessonPatchOp => ({
          op: "add_node",
          parentId: asset.parentId,
          node: {
            id: asset.nodeId,
            type: "media",
            title: asset.title,
            modality: asset.modality,
            alt: asset.alt,
            status: "pending",
            provenance: {
              provider: "fal",
              model:
                asset.modality === "image"
                  ? (input.env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell")
                  : (input.env.FAL_VIDEO_MODEL ?? "fal-ai/veo3.1/fast"),
              prompt: asset.prompt,
              createdAt: new Date().toISOString(),
            },
          },
        })
      ),
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: quizId,
          type: "quiz",
          title: lessonPlan.quiz.title,
          items: lessonPlan.quiz.items.map((item, index) => ({
            id: `q${index + 1}`,
            stem: item.stem,
            choices: item.choices,
            answer: item.answer,
            explanation: item.explanation,
          })),
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
      {
        op: "add_node",
        parentId: "root",
        node: {
          id: secTeacherTips,
          type: "section",
          title: "Teacher facilitation notes",
          children: [],
        },
      },
      {
        op: "add_node",
        parentId: secTeacherTips,
        node: {
          id: "txt-teacher-tips",
          type: "text",
          title: "How to run this lesson",
          format: "markdown",
          body: lessonPlan.teacherTips.map((tip) => `- ${tip}`).join("\n"),
        },
      },
    ];

    for (const p of patches) {
      doc = applyLessonPatch(doc, p);
      yield { type: "lesson_patch", runId, patch: p };
      yield { type: "lesson_snapshot", runId, lesson: doc };
    }

    yield providerCompleted(s4, "orchestrator", "Lesson nodes materialized");

    const s5 = step();
    yield providerStarted(
      s5,
      "fal",
      `Parallel fal media generation (${mediaAssets.length} storyboard assets)`
    );

    const generatedMedia = await Promise.all(
      mediaAssets.map(async (planned) => {
        const prompt =
          planned.modality === "image"
            ? [
                planned.prompt,
                "Style: clear educational diagram or anchor visual, uncluttered composition, classroom-safe, no decorative filler, no unreadable text overlay.",
                `Teaching purpose: ${planned.teachingPurpose}`,
              ].join(" ")
            : [
                planned.prompt,
                "Show visible motion, sequence, or cause and effect that clarifies the concept for students. Classroom-safe, no on-screen text, calm narration-style audio if supported.",
                `Teaching purpose: ${planned.teachingPurpose}`,
              ].join(" ");

        let usedFallback = !input.readiness.fal;
        let problem = usedFallback
          ? "FAL_KEY or FAL_API_KEY is missing; using demo media assets."
          : undefined;
        let generated =
          planned.modality === "image"
            ? fallbackFalImage(`${topic}-${planned.nodeId}`)
            : fallbackFalVideo(`${topic}-${planned.nodeId}`);

        console.info("[generate-lesson] fal storyboard asset requested", {
          lessonId,
          nodeId: planned.nodeId,
          placement: planned.placement,
          modality: planned.modality,
          falReady: input.readiness.fal,
          promptLength: prompt.length,
        });

        if (input.readiness.fal) {
          try {
            generated =
              planned.modality === "image"
                ? await falGenerateImage(prompt, input.env)
                : await falGenerateVideo(prompt, input.env);
            usedFallback = false;
          } catch (error) {
            console.error(
              "[generate-lesson] fal storyboard asset failed, using fallback",
              {
                lessonId,
                nodeId: planned.nodeId,
                modality: planned.modality,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            generated =
              planned.modality === "image"
                ? fallbackFalImage(`${topic}-${planned.nodeId}`)
                : fallbackFalVideo(`${topic}-${planned.nodeId}`);
            usedFallback = true;
            problem = `fal ${planned.modality} generation failed for ${planned.title}: ${errorMessage(error)}`;
          }
        }

        const stored = await mirrorRemoteAssetToS3({
          asset: generated,
          lessonId,
          nodeId: planned.nodeId,
          env: input.env,
        }).catch((error: unknown) => {
          console.warn(
            "[generate-lesson] storyboard media S3 mirror failed, using source URL",
            {
              lessonId,
              nodeId: planned.nodeId,
              usedFallback,
              error: error instanceof Error ? error.message : String(error),
            }
          );
          return generated;
        });

        const width =
          planned.modality === "image" &&
          "width" in stored &&
          typeof stored.width === "number"
            ? stored.width
            : undefined;
        const height =
          planned.modality === "image" &&
          "height" in stored &&
          typeof stored.height === "number"
            ? stored.height
            : undefined;

        const node = {
          id: planned.nodeId,
          type: "media" as const,
          title: planned.title,
          modality: planned.modality,
          alt: planned.alt,
          status: "ready" as const,
          asset: {
            url: stored.url,
            mime: stored.mime,
            ...(width === undefined ? {} : { width }),
            ...(height === undefined ? {} : { height }),
          },
          provenance: {
            provider: "fal" as const,
            model:
              planned.modality === "image"
                ? (input.env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell")
                : (input.env.FAL_VIDEO_MODEL ?? "fal-ai/veo3.1/fast"),
            prompt,
            createdAt: new Date().toISOString(),
          },
        };

        return { node, usedFallback, url: stored.url, problem };
      })
    );

    for (const generated of generatedMedia) {
      const patch: LessonPatchOp = {
        op: "replace_node",
        node: generated.node,
      };
      doc = applyLessonPatch(doc, patch);
      yield { type: "lesson_patch", runId, patch };
      yield { type: "lesson_snapshot", runId, lesson: doc };
    }

    yield providerCompleted(
      s5,
      "fal",
      generatedMedia.map((item) => item.url).join(", "),
      generatedMedia.some((item) => item.usedFallback),
      generatedMedia
        .map((item) => item.problem)
        .filter(Boolean)
        .join(" ")
        .slice(0, 600) || undefined
    );

    const s7 = step();
    yield providerStarted(s7, "slng", "Narration audio (SLNG)");
    const narrationText = lessonPlan.explanationBody.slice(0, 900);
    let audioUsedFallback = !input.readiness.slng;
    let audioProblem = audioUsedFallback
      ? "SLNG API is not configured; narration audio is unavailable."
      : undefined;
    const audioAssetUrl = `/api/audio?text=${encodeURIComponent(narrationText)}`;
    let readyAudio = {
      id: audioId,
      type: "media" as const,
      title: "Narration audio",
      modality: "audio" as const,
      alt: `Narration summary for ${topic}`,
      status: input.readiness.slng ? ("ready" as const) : ("failed" as const),
      asset: input.readiness.slng
        ? {
            url: audioAssetUrl,
            mime: "audio/wav",
          }
        : undefined,
      provenance: {
        provider: "slng" as const,
        model: slngTtsModel(input.env),
        prompt: narrationText,
        createdAt: new Date().toISOString(),
      },
    };
    if (input.readiness.slng) {
      try {
        const audio = await slngTextToSpeech({
          text: narrationText,
          env: input.env,
        });
        const storedAudio = await uploadGeneratedBytesToS3({
          bytes: audio.bytes,
          contentType: audio.mime,
          lessonId,
          nodeId: audioId,
          env: input.env,
        }).catch(() => null);
        readyAudio = {
          ...readyAudio,
          asset: {
            url: storedAudio?.url ?? audioAssetUrl,
            mime: audio.mime,
          },
          provenance: {
            ...readyAudio.provenance,
            model: audio.model,
          },
        };
        audioUsedFallback = false;
        audioProblem = undefined;
      } catch (error) {
        readyAudio = {
          ...readyAudio,
          status: "failed",
          asset: undefined,
        };
        audioUsedFallback = true;
        audioProblem = `SLNG narration generation failed: ${errorMessage(error)}`;
      }
    }
    const audioPatch: LessonPatchOp = { op: "replace_node", node: readyAudio };
    doc = applyLessonPatch(doc, audioPatch);
    yield { type: "lesson_patch", runId, patch: audioPatch };
    yield { type: "lesson_snapshot", runId, lesson: doc };
    yield providerCompleted(
      s7,
      "slng",
      readyAudio.asset?.url ?? "Audio unavailable",
      audioUsedFallback,
      audioProblem
    );

    const s8 = step();
    yield providerStarted(s8, "llm", "Generate sandbox theme and JS runtime");
    let runtimeScript: string | undefined;
    let themeCss: string | undefined;
    let runtimeScriptDetail = "Solar system uses bundled runtime";
    let runtimeScriptUsedFallback = false;
    let runtimeScriptProblem: string | undefined;
    if (!input.transcript.toLowerCase().includes("solar system")) {
      if (input.readiness.llm) {
        try {
          const generatedRuntime = await generateLessonRuntimeEnhancement({
            prompt: input.transcript,
            plan: lessonPlan,
            entities,
            env: input.env,
          });
          runtimeScript = generatedRuntime.code;
          themeCss = generatedRuntime.css;
          runtimeScriptDetail = generatedRuntime.usedFallback
            ? `Generated theme/runtime via OpenAI ${generatedRuntime.model} with fallback: CSS ${generatedRuntime.cssUsedFallback ? "fallback" : "generated"}, JS ${generatedRuntime.codeUsedFallback ? "fallback" : "generated"}`
            : `Generated topic theme and sandbox JS via OpenAI ${generatedRuntime.model}`;
          runtimeScriptUsedFallback = generatedRuntime.usedFallback;
          runtimeScriptProblem = generatedRuntime.problem;
        } catch (error) {
          themeCss = fallbackLessonThemeCss({
            prompt: input.transcript,
            plan: lessonPlan,
          });
          runtimeScript = fallbackLessonRuntimeScript();
          runtimeScriptDetail = "Fallback theme and inline JS";
          runtimeScriptUsedFallback = true;
          runtimeScriptProblem = `OpenAI sandbox runtime generation failed: ${errorMessage(error)}`;
        }
      } else {
        themeCss = fallbackLessonThemeCss({
          prompt: input.transcript,
          plan: lessonPlan,
        });
        runtimeScript = fallbackLessonRuntimeScript();
        runtimeScriptDetail = "Fallback theme and inline JS";
        runtimeScriptUsedFallback = true;
        runtimeScriptProblem =
          "OPENAI_API_KEY is missing; using deterministic sandbox theme and inline JavaScript.";
      }
    }
    yield providerCompleted(
      s8,
      "llm",
      runtimeScriptDetail,
      runtimeScriptUsedFallback,
      runtimeScriptProblem
    );

    const s9 = step();
    yield providerStarted(s9, "orchestrator", "Assemble sandboxed HTML lesson");
    const firstImage = generatedMedia.find(
      (item) => item.node.modality === "image"
    );
    const firstVideo = generatedMedia.find(
      (item) => item.node.modality === "video"
    );
    const artifact = createSandboxedLessonArtifact({
      prompt: input.transcript,
      plan: lessonPlan,
      runtimeScript,
      themeCss,
      media: {
        assets: [
          ...generatedMedia.map((item) => ({
            url: item.node.asset.url,
            mime: item.node.asset.mime,
            alt: item.node.alt,
            title: item.node.title,
            modality: item.node.modality,
            width: item.node.asset.width,
            height: item.node.asset.height,
          })),
          ...(readyAudio.asset
            ? [
                {
                  url: readyAudio.asset.url,
                  mime: readyAudio.asset.mime,
                  alt: readyAudio.alt,
                  title: readyAudio.title,
                  modality: "audio" as const,
                },
              ]
            : []),
        ],
        image: firstImage?.node.asset
          ? {
              url: firstImage.node.asset.url,
              mime: firstImage.node.asset.mime,
              alt: firstImage.node.alt,
              width: firstImage.node.asset.width,
              height: firstImage.node.asset.height,
            }
          : undefined,
        video: firstVideo?.node.asset
          ? {
              url: firstVideo.node.asset.url,
              mime: firstVideo.node.asset.mime,
              alt: firstVideo.node.alt,
            }
          : undefined,
        audio: readyAudio.asset
          ? {
              url: readyAudio.asset.url,
              mime: readyAudio.asset.mime,
              alt: readyAudio.alt,
            }
          : undefined,
      },
      schemaData: {
        provider: schemaDataProvider,
        entities: sandboxPresentationEntities,
      },
    });
    yield providerCompleted(
      s9,
      "orchestrator",
      "Sandboxed HTML assembled and validated"
    );

    const s10 = step();
    yield providerStarted(
      s10,
      "llm",
      "Review sandbox demo quality (CODE_MODEL)"
    );
    const demoReview = input.transcript.toLowerCase().includes("solar system")
      ? {
          passed: true,
          detail: "Solar system uses the source-controlled demo runtime.",
          checks: [],
          model: input.env.OPENAI_CODE_MODEL ?? "CODE_MODEL",
          usedFallback: false,
        }
      : await reviewSandboxedLessonWithCodeModel({
          artifact,
          prompt: input.transcript,
          plan: lessonPlan,
          env: input.env,
        });
    const demoReviewProblem = demoReview.usedFallback
      ? (demoReview.problem ?? demoReview.detail)
      : demoReview.passed
        ? undefined
        : demoReview.detail;
    yield providerCompleted(
      s10,
      "llm",
      demoReview.detail,
      demoReview.usedFallback,
      demoReviewProblem
    );

    const s11 = step();
    yield providerStarted(s11, "orchestrator", "Persist sandboxed lesson");
    await saveLessonVersion({
      lessonId,
      title: artifact.title,
      html: artifact.html,
      spec: createPersistedStudioSpec({
        artifactSpec: artifact.spec,
        lesson: doc,
        timeline: studioTimeline,
        runId,
        transcript: input.transcript,
        completedAt: new Date().toISOString(),
      }),
    });
    await finishGenerationRun({ id: runId, status: "completed" });
    yield providerCompleted(
      s11,
      "orchestrator",
      "Saved sandboxed HTML/JS lesson version to Postgres"
    );

    yield { type: "run_completed", runId, lessonId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (generationRunCreated) {
      try {
        await finishGenerationRun({
          id: runId,
          status: "failed",
          error: message,
        });
        await markLessonFailed({ lessonId, error: message });
      } catch {
        /* keep original generation error */
      }
    }
    yield { type: "run_failed", runId, message };
  }
}
