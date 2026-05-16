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
  generateLessonPlan,
  generateLessonRuntimeScript,
  type LessonPlan,
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
    usedFallback?: boolean
  ): StreamEvent => {
    const existing = studioTimeline.find((row) => row.key === stepId);
    if (existing) {
      existing.status = "completed";
      existing.detail = detail;
      existing.usedFallback = usedFallback;
    } else {
      studioTimeline.push({
        key: stepId,
        provider,
        label: "",
        status: "completed",
        detail,
        usedFallback,
      });
    }
    return {
      type: "provider_completed",
      runId,
      stepId,
      provider,
      detail,
      usedFallback,
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
    yield providerCompleted(s0, "slng", slngHint.hint, !slngHint.ready);

    const s1 = step();
    yield providerStarted(s1, "tavily", "Web-aware research (Tavily)");
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
    yield providerCompleted(
      s1,
      "tavily",
      `${searchResults.length} source cards`,
      tavilyUsedFallback
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
    yield providerCompleted(
      s2,
      "pioneer",
      `${entities.length} extracted slots`,
      pioneerFallback
    );

    const s3 = step();
    yield providerStarted(s3, "llm", "AI lesson composition (AI SDK)");

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
    yield providerCompleted(
      s3,
      "llm",
      llmUsedFallback
        ? "Deterministic lesson fallback"
        : `Structured plan via OpenAI ${lessonModel}`,
      llmUsedFallback
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

        return { node, usedFallback, url: stored.url };
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
      generatedMedia.some((item) => item.usedFallback)
    );

    const s7 = step();
    yield providerStarted(s7, "slng", "Narration audio (SLNG)");
    const narrationText = lessonPlan.explanationBody.slice(0, 900);
    let audioUsedFallback = !input.readiness.slng;
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
      } catch {
        readyAudio = {
          ...readyAudio,
          status: "failed",
          asset: undefined,
        };
        audioUsedFallback = true;
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
      audioUsedFallback
    );

    const s8 = step();
    yield providerStarted(s8, "llm", "Generate lesson JavaScript");
    let runtimeScript: string | undefined;
    let runtimeScriptDetail = "Solar system uses bundled runtime";
    let runtimeScriptUsedFallback = false;
    if (!input.transcript.toLowerCase().includes("solar system")) {
      if (input.readiness.llm) {
        try {
          const generatedScript = await generateLessonRuntimeScript({
            prompt: input.transcript,
            plan: lessonPlan,
            env: input.env,
          });
          runtimeScript = generatedScript.code;
          runtimeScriptDetail = generatedScript.usedFallback
            ? `Validated fallback after OpenAI ${generatedScript.model}`
            : `Generated inline JS via OpenAI ${generatedScript.model}`;
          runtimeScriptUsedFallback = generatedScript.usedFallback;
        } catch {
          runtimeScript = fallbackLessonRuntimeScript();
          runtimeScriptDetail = "Fallback inline JS";
          runtimeScriptUsedFallback = true;
        }
      } else {
        runtimeScript = fallbackLessonRuntimeScript();
        runtimeScriptDetail = "Fallback inline JS";
        runtimeScriptUsedFallback = true;
      }
    }
    yield providerCompleted(
      s8,
      "llm",
      runtimeScriptDetail,
      runtimeScriptUsedFallback
    );

    const s9 = step();
    yield providerStarted(s9, "orchestrator", "Persist sandboxed HTML lesson");
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
    });
    const persistCompleted = providerCompleted(
      s9,
      "orchestrator",
      "Saved HTML lesson version to Postgres"
    );
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
    yield persistCompleted;

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
