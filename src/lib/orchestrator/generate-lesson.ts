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
    const secPractice = "sec-practice";
    const quizId = "quiz-main";
    const reflId = "refl-main";
    const mediaId = "media-cover";
    const videoId = "media-video";
    const audioId = "media-audio";

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
        parentId: secHook,
        node: {
          id: videoId,
          type: "media",
          title: "Motion preview",
          modality: "video",
          alt: `Short classroom-safe video related to ${topic}`,
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

    yield providerCompleted(s4, "orchestrator", "Lesson nodes materialized");

    const s5 = step();
    yield providerStarted(s5, "fal", "Generative cover image (fal)");
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
    const storedImage = await mirrorRemoteAssetToS3({
      asset: image,
      lessonId,
      nodeId: mediaId,
      env: input.env,
    }).catch(() => image);
    const readyMedia = {
      id: mediaId,
      type: "media" as const,
      title: "Cover visual",
      modality: "image" as const,
      alt: `Illustration related to ${topic}`,
      status: "ready" as const,
      asset: {
        url: storedImage.url,
        mime: storedImage.mime,
        width: storedImage.width,
        height: storedImage.height,
      },
      provenance: {
        provider: "fal" as const,
        model: input.env.FAL_IMAGE_MODEL ?? "fal-ai/flux/schnell",
        prompt,
        createdAt: new Date().toISOString(),
      },
    };
    const mediaPatch: LessonPatchOp = { op: "replace_node", node: readyMedia };
    doc = applyLessonPatch(doc, mediaPatch);
    yield { type: "lesson_patch", runId, patch: mediaPatch };
    yield { type: "lesson_snapshot", runId, lesson: doc };
    yield providerCompleted(s5, "fal", storedImage.url, falUsedFallback);

    const s6 = step();
    yield providerStarted(s6, "fal", "Generative lesson video (fal)");
    const videoPrompt = `Create a short educational video for lesson: ${topic}. Show motion that clarifies the concept for students. No on-screen text, classroom-safe, calm narration-style audio if the model supports audio.`;
    let falVideoUsedFallback = !input.readiness.fal;
    let video = fallbackFalVideo(topic);
    if (input.readiness.fal) {
      try {
        video = await falGenerateVideo(videoPrompt, input.env);
        falVideoUsedFallback = false;
      } catch {
        video = fallbackFalVideo(topic);
        falVideoUsedFallback = true;
      }
    }
    const storedVideo = await mirrorRemoteAssetToS3({
      asset: video,
      lessonId,
      nodeId: videoId,
      env: input.env,
    }).catch(() => video);
    const readyVideo = {
      id: videoId,
      type: "media" as const,
      title: "Motion preview",
      modality: "video" as const,
      alt: `Short classroom-safe video related to ${topic}`,
      status: "ready" as const,
      asset: {
        url: storedVideo.url,
        mime: storedVideo.mime,
      },
      provenance: {
        provider: "fal" as const,
        model: input.env.FAL_VIDEO_MODEL ?? "fal-ai/veo3.1/fast",
        prompt: videoPrompt,
        createdAt: new Date().toISOString(),
      },
    };
    const videoPatch: LessonPatchOp = { op: "replace_node", node: readyVideo };
    doc = applyLessonPatch(doc, videoPatch);
    yield { type: "lesson_patch", runId, patch: videoPatch };
    yield { type: "lesson_snapshot", runId, lesson: doc };
    yield providerCompleted(s6, "fal", storedVideo.url, falVideoUsedFallback);

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
    const artifact = createSandboxedLessonArtifact({
      prompt: input.transcript,
      plan: lessonPlan,
      runtimeScript,
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
