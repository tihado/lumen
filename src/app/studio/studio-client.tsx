"use client";

import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { SourcesDrawer } from "@/components/canvas/SourcesDrawer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { VoiceSessionController } from "@/components/voice/VoiceSessionController";
import { applyLessonPatch } from "@/lib/lesson/patches";
import type { LessonDocument, LessonNode } from "@/lib/lesson/schema";
import { readStudioState } from "@/lib/lesson/studio-state";
import {
  type ProviderReadiness,
  parseStreamEventLine,
  type StudioTimelineRow,
} from "@/lib/orchestrator/stream-events";
import { cn } from "@/lib/utils";

export function StudioClient({
  initialLessonId,
}: {
  initialLessonId?: string;
}) {
  const router = useRouter();
  const [transcript, setTranscript] = useState(
    "I want to learn about the solar system"
  );
  const [lesson, setLesson] = useState<LessonDocument | null>(null);
  const [readiness, setReadiness] = useState<ProviderReadiness | null>(null);
  const [timeline, setTimeline] = useState<StudioTimelineRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mediaRetryingId, setMediaRetryingId] = useState<string | null>(null);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);

  const readinessBadges = useMemo(() => {
    if (!readiness) {
      return null;
    }
    const entries = Object.entries(readiness) as [
      keyof ProviderReadiness,
      boolean,
    ][];
    return entries.map(([k, v]) => (
      <Badge key={k} variant={v ? "default" : "outline"}>
        {k}: {v ? "live" : "fallback"}
      </Badge>
    ));
  }, [readiness]);

  useEffect(() => {
    if (!initialLessonId) {
      return;
    }
    let cancelled = false;
    async function loadStudioState() {
      setError(null);
      try {
        const res = await fetch(`/api/lessons/${initialLessonId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Could not load lesson ${initialLessonId}`);
        }
        const payload = (await res.json()) as {
          lesson?: { id?: string; title?: string; prompt?: string } | null;
          version?: { spec?: unknown } | null;
        };
        const state = readStudioState(
          payload.version?.spec,
          payload.lesson ?? undefined
        );
        if (!(state && !cancelled)) {
          throw new Error("This lesson does not have saved Studio state yet.");
        }
        setLesson(state.lesson);
        setTimeline(state.timeline);
        setTranscript(state.transcript ?? state.lesson.title);
        setSavedLessonId(payload.lesson?.id ?? state.lesson.id);
        setSelectedId(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }
    loadStudioState().catch(() => {
      /* error state is handled above */
    });
    return () => {
      cancelled = true;
    };
  }, [initialLessonId]);

  const pushTimeline = useCallback((row: StudioTimelineRow) => {
    setTimeline((prev) => {
      const idx = prev.findIndex((r) => r.key === row.key);
      if (idx === -1) {
        return [...prev, row];
      }
      const prevRow = prev[idx];
      const merged = { ...prevRow, ...row };
      if (!(row.label.length > 0) && prevRow.label) {
        merged.label = prevRow.label;
      }
      const next = [...prev];
      next[idx] = merged;
      return next;
    });
  }, []);

  const runGeneration = useCallback(async () => {
    setBusy(true);
    setError(null);
    setTimeline([]);
    setLesson(null);
    setSelectedId(null);
    setSavedLessonId(null);
    let completedLessonId: string | null = null;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, lessonId: savedLessonId }),
      });
      if (!(res.ok && res.body)) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const ev = parseStreamEventLine(line);
          if (!ev) {
            continue;
          }
          if (ev.type === "run_started") {
            setReadiness(ev.readiness);
          }
          if (ev.type === "provider_started") {
            pushTimeline({
              key: ev.stepId,
              provider: ev.provider,
              label: ev.label,
              status: "started",
            });
          }
          if (ev.type === "provider_completed") {
            pushTimeline({
              key: ev.stepId,
              provider: ev.provider,
              label: "",
              status: "completed",
              detail: ev.detail,
              usedFallback: ev.usedFallback,
            });
          }
          if (ev.type === "lesson_snapshot") {
            setLesson(ev.lesson);
          }
          if (ev.type === "run_failed") {
            setError(ev.message);
          }
          if (ev.type === "run_completed") {
            completedLessonId = ev.lessonId;
            setSavedLessonId(ev.lessonId);
          }
        }
      }
      if (completedLessonId) {
        router.push(`/lesson/${completedLessonId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [pushTimeline, router, savedLessonId, transcript]);

  const onReplaceNode = useCallback((node: LessonNode) => {
    setLesson((prev) => {
      if (!prev) {
        return prev;
      }
      try {
        return applyLessonPatch(prev, { op: "replace_node", node });
      } catch {
        return prev;
      }
    });
  }, []);

  const onRetryMedia = useCallback(
    async (mediaId: string) => {
      if (!lesson) {
        return;
      }
      const node = lesson.nodes[mediaId];
      if (node?.type !== "media") {
        return;
      }
      setMediaRetryingId(mediaId);
      try {
        if (node.modality === "audio") {
          const textNode = Object.values(lesson.nodes).find(
            (n) => n.type === "text" && n.body.length > 0
          );
          const narration =
            textNode?.type === "text"
              ? textNode.body.slice(0, 900)
              : `Brief teacher narration for ${lesson.title}.`;
          const nextNode = {
            ...node,
            status: "ready" as const,
            asset: {
              url: `/api/audio?text=${encodeURIComponent(narration)}`,
              mime: "audio/wav",
            },
            provenance: {
              provider: "slng" as const,
              createdAt: new Date().toISOString(),
              prompt: narration,
            },
          };
          setLesson((prev) =>
            prev
              ? applyLessonPatch(prev, { op: "replace_node", node: nextNode })
              : prev
          );
          return;
        }

        const prompt =
          node.modality === "video"
            ? `Short educational video for: ${lesson.title}. Classroom-safe, no on-screen text, show motion that helps students understand.`
            : `Educational illustration for: ${lesson.title}. Clean, classroom-safe, no text in image.`;
        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, modality: node.modality }),
        });
        const data = (await res.json()) as {
          asset: { url: string; mime: string; width?: number; height?: number };
          usedFallback?: boolean;
        };
        const nextNode = {
          ...node,
          status: "ready" as const,
          asset: {
            url: data.asset.url,
            mime: data.asset.mime,
            width: data.asset.width,
            height: data.asset.height,
          },
          provenance: {
            provider: "fal" as const,
            model: data.usedFallback ? "fallback" : `fal-${node.modality}`,
            createdAt: new Date().toISOString(),
            prompt,
          },
        };
        setLesson((prev) =>
          prev
            ? applyLessonPatch(prev, { op: "replace_node", node: nextNode })
            : prev
        );
      } catch {
        /* ignore */
      } finally {
        setMediaRetryingId(null);
      }
    },
    [lesson]
  );

  const openSavedLesson = useCallback(() => {
    if (!savedLessonId) {
      return;
    }
    router.push(`/lesson/${savedLessonId}`);
  }, [router, savedLessonId]);

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(oklch(0.42_0.05_180/0.045)_1px,transparent_1px),linear-gradient(90deg,oklch(0.42_0.05_180/0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/50 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div>
          <h1 className="font-semibold text-primary text-xl tracking-tight">
            Studio
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate with visible provider steps, then publish a student
            preview.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
            href="/"
          >
            Home
          </Link>
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
            href="/lessons"
          >
            Saved lessons
          </Link>
          <Link
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "inline-flex gap-2"
            )}
            href="/lesson/demo"
          >
            Sample lesson
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">{readinessBadges}</div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <Card className="bg-white/82">
            <CardHeader>
              <CardTitle className="text-base">Input</CardTitle>
              <CardDescription>
                Transcript is sent to the server orchestrator (keys never leave
                the server).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <VoiceSessionController
                disabled={busy}
                onTranscriptChange={setTranscript}
                transcript={transcript}
              />
              <Button
                disabled={busy}
                onClick={() => {
                  runGeneration().catch(() => {
                    /* errors handled inside runGeneration */
                  });
                }}
                type="button"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate lesson
                  </>
                )}
              </Button>
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="min-h-0 flex-1 overflow-hidden bg-white/82">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Provider timeline</CardTitle>
              <CardDescription>
                Started vs completed steps for this run.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64 lg:h-[min(50vh,420px)]">
                <div className="space-y-2 p-4">
                  {timeline.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Run generation to see Tavily → Pioneer → fal
                      orchestration.
                    </p>
                  ) : (
                    timeline.map((row) => (
                      <div
                        className="rounded-lg border border-border/70 bg-white/58 px-3 py-2 text-xs shadow-sm"
                        key={row.key}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{row.provider}</span>
                          <Badge
                            variant={
                              row.status === "completed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {row.status}
                          </Badge>
                        </div>
                        {row.label ? (
                          <p className="mt-1 text-muted-foreground">
                            {row.label}
                          </p>
                        ) : null}
                        {row.detail ? (
                          <p className="mt-1 line-clamp-3 text-muted-foreground">
                            {row.detail}
                          </p>
                        ) : null}
                        {row.usedFallback === undefined ? null : (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Mode:{" "}
                            {row.usedFallback
                              ? "fallback / demo"
                              : "live provider"}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {lesson ? <SourcesDrawer doc={lesson} /> : null}
            <Separator className="hidden h-6 lg:block" orientation="vertical" />
            <Button
              disabled={!savedLessonId}
              onClick={openSavedLesson}
              type="button"
              variant="secondary"
            >
              Open saved lesson
            </Button>
          </div>
          {lesson ? (
            <CanvasWorkspace
              doc={lesson}
              mediaRetryingId={mediaRetryingId}
              onReplaceNode={onReplaceNode}
              onRetryMedia={onRetryMedia}
              onSelect={setSelectedId}
              selectedId={selectedId}
            />
          ) : (
            <Card className="flex flex-1 items-center justify-center bg-white/75 p-8">
              <p className="text-center text-muted-foreground text-sm">
                No lesson on canvas yet. Generate from the left panel.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
