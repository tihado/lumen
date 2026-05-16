"use client";

import {
  BookOpenCheck,
  ExternalLink,
  Home,
  LibraryBig,
  Loader2,
  Palette,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type LiveTimelineRow = Omit<StudioTimelineRow, "status"> & {
  status: StudioTimelineRow["status"] | "running";
};

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
  const [timeline, setTimeline] = useState<LiveTimelineRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mediaRetryingId, setMediaRetryingId] = useState<string | null>(null);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);
  const runningTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  );

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

  const clearRunningTimer = useCallback((key: string) => {
    const timer = runningTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      runningTimersRef.current.delete(key);
    }
  }, []);

  const clearRunningTimers = useCallback(() => {
    for (const timer of runningTimersRef.current.values()) {
      clearTimeout(timer);
    }
    runningTimersRef.current.clear();
  }, []);

  const pushTimeline = useCallback((row: LiveTimelineRow) => {
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

  const scheduleRunningTransition = useCallback(
    (key: string) => {
      clearRunningTimer(key);
      const timer = setTimeout(() => {
        runningTimersRef.current.delete(key);
        setTimeline((prev) =>
          prev.map((row) =>
            row.key === key && row.status === "started"
              ? { ...row, status: "running" }
              : row
          )
        );
      }, 450);
      runningTimersRef.current.set(key, timer);
    },
    [clearRunningTimer]
  );

  useEffect(() => clearRunningTimers, [clearRunningTimers]);

  const runGeneration = useCallback(async () => {
    clearRunningTimers();
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
            scheduleRunningTransition(ev.stepId);
          }
          if (ev.type === "provider_completed") {
            clearRunningTimer(ev.stepId);
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
      clearRunningTimers();
      setBusy(false);
    }
  }, [
    clearRunningTimer,
    clearRunningTimers,
    pushTimeline,
    router,
    savedLessonId,
    scheduleRunningTransition,
    transcript,
  ]);

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
          asset: {
            url: string;
            mime: string;
            width?: unknown;
            height?: unknown;
          };
          usedFallback?: boolean;
        };
        const width =
          typeof data.asset.width === "number" ? data.asset.width : undefined;
        const height =
          typeof data.asset.height === "number" ? data.asset.height : undefined;
        const nextNode = {
          ...node,
          status: "ready" as const,
          asset: {
            url: data.asset.url,
            mime: data.asset.mime,
            ...(width === undefined ? {} : { width }),
            ...(height === undefined ? {} : { height }),
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
    <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-5 p-3 sm:p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(oklch(0.35_0.07_185/0.055)_1px,transparent_1px),linear-gradient(90deg,oklch(0.35_0.07_185/0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <div className="pointer-events-none absolute top-20 -left-8 -z-10 size-24 rounded-full border-[18px] border-[oklch(0.82_0.14_76/0.28)]" />
      <div className="pointer-events-none absolute top-7 -right-10 -z-10 size-36 rounded-full border-[22px] border-[oklch(0.82_0.12_201/0.24)]" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/62 px-4 py-4 shadow-[0_24px_80px_oklch(0.42_0.08_180/0.16)] ring-1 ring-foreground/5 backdrop-blur-2xl sm:px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,oklch(0.78_0.17_48),oklch(0.76_0.15_170),oklch(0.78_0.15_330))]" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/">
              <Image
                alt="Lumen - Light any lesson"
                className="h-12 w-auto"
                height={48}
                priority
                src="/logo.png"
                width={120}
              />
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
                Studio
              </h1>
              <p className="max-w-2xl text-muted-foreground text-sm">
                Turn a rough idea into a bright, editable lesson canvas with
                every provider step out in the open.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "gap-2"
              )}
              href="/"
            >
              <Home className="size-3.5" />
              Home
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "gap-2"
              )}
              href="/lessons"
            >
              <LibraryBig className="size-3.5" />
              Saved
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "gap-2 border-white/80 bg-white/70"
              )}
              href="/lesson/demo"
            >
              Sample
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {readinessBadges ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/65 bg-white/48 px-3 py-2 shadow-sm backdrop-blur-xl">
          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
            <Palette className="size-3.5 text-primary" />
            Provider kit
          </span>
          {readinessBadges}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <Card className="border-white/80 bg-white/80 shadow-[0_22px_70px_oklch(0.47_0.09_180/0.14)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <WandSparkles className="size-4 text-primary" />
                Idea spark
              </CardTitle>
              <CardDescription>
                Dictate or type a lesson seed. The server keeps the keys and
                handles the orchestration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <VoiceSessionController
                disabled={busy}
                onTranscriptChange={setTranscript}
                transcript={transcript}
              />
              <Button
                className="h-10 w-full rounded-2xl bg-[linear-gradient(135deg,oklch(0.68_0.14_174),oklch(0.78_0.16_83))] text-sm shadow-[0_16px_34px_oklch(0.58_0.13_150/0.24)] hover:brightness-105"
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
                    Building the lesson...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Make it magical
                  </>
                )}
              </Button>
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="min-h-0 flex-1 overflow-hidden border-white/80 bg-white/78 shadow-[0_22px_70px_oklch(0.47_0.09_180/0.12)]">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenCheck className="size-4 text-primary" />
                Build trail
              </CardTitle>
              <CardDescription>
                A cheerful trace of who made what.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64 lg:h-[min(50vh,420px)]">
                <div className="space-y-2 p-4">
                  {timeline.length === 0 ? (
                    <div className="rounded-2xl border border-primary/25 border-dashed bg-[linear-gradient(135deg,oklch(0.97_0.04_95/0.82),oklch(0.96_0.035_185/0.7))] p-4 text-sm">
                      <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-white/75 text-primary shadow-sm">
                        <Play className="size-4" />
                      </div>
                      <p className="font-medium">Ready when you are.</p>
                      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                        Run generation to watch Tavily, Pioneer, fal, and the
                        lesson builder light up one by one.
                      </p>
                    </div>
                  ) : (
                    timeline.map((row) => (
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-2xl border px-3 py-2.5 text-xs shadow-sm transition-transform hover:-translate-y-0.5",
                          row.status === "completed"
                            ? "border-primary/18 bg-[linear-gradient(135deg,white,oklch(0.96_0.045_150/0.76))]"
                            : "border-accent/45 bg-[linear-gradient(135deg,white,oklch(0.965_0.055_75/0.72))]"
                        )}
                        key={row.key}
                      >
                        <div className="pointer-events-none absolute -top-5 -right-5 size-14 rounded-full bg-primary/8" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 font-medium">
                            <span
                              className={cn(
                                "size-2.5 rounded-full",
                                row.status === "completed"
                                  ? "bg-primary"
                                  : "bg-accent",
                                row.status === "running" && "studio-pulse"
                              )}
                            />
                            {row.provider}
                          </span>
                          <Badge
                            className={cn(
                              row.status === "running" &&
                                "border-accent/70 bg-accent/15"
                            )}
                            variant={
                              row.status === "completed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {row.status === "running" ? (
                              <Loader2 className="animate-spin" />
                            ) : null}
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
              <ExternalLink className="size-4" />
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
            <Card className="relative flex flex-1 items-center justify-center overflow-hidden border-white/80 bg-white/68 p-8 shadow-[0_22px_70px_oklch(0.47_0.09_180/0.12)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_25%,oklch(0.87_0.14_65/0.42),transparent_24%),radial-gradient(circle_at_75%_70%,oklch(0.85_0.12_193/0.42),transparent_26%)]" />
              <div className="relative max-w-sm text-center">
                <div className="studio-bob mx-auto mb-4 flex size-16 items-center justify-center rounded-[1.35rem] bg-white/80 text-primary shadow-[0_16px_40px_oklch(0.47_0.08_180/0.16)]">
                  <WandSparkles className="size-8" />
                </div>
                <p className="font-semibold text-lg tracking-tight">
                  Your lesson canvas is waiting.
                </p>
                <p className="mt-2 text-muted-foreground text-sm">
                  Add a playful prompt on the left and the generated blocks will
                  land here ready to edit.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
