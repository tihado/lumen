"use client";

import { Loader2, MessageCircle, Mic2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { SlngVoiceAgentRoom } from "@/components/voice/SlngVoiceAgentRoom";
import type { LessonVoiceAgentContext } from "@/lib/lesson/voice-agent-context";

type VoiceAgentSession = {
  livekitUrl: string;
  livekitToken: string;
  roomName: string;
  callId: string;
  maxSessionSeconds?: number;
};

export function FloatingLessonVoiceAgent({
  context,
}: {
  context: LessonVoiceAgentContext;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<VoiceAgentSession | null>(null);

  const startSession = useCallback(async () => {
    setOpen(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/voice/agent-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demoMode: context.demoMode,
          lessonId: context.lessonId,
          lessonSummary: context.lessonSummary,
          lessonTitle: context.lessonTitle,
          participantName: "Lesson learner",
          transcript: context.transcript,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | (Partial<VoiceAgentSession> & { error?: string })
        | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? `HTTP ${res.status}`);
      }
      if (
        !(
          payload?.livekitUrl &&
          payload.livekitToken &&
          payload.roomName &&
          payload.callId
        )
      ) {
        throw new Error("SLNG did not return a complete web session.");
      }
      setSession({
        livekitUrl: payload.livekitUrl,
        livekitToken: payload.livekitToken,
        roomName: payload.roomName,
        callId: payload.callId,
        maxSessionSeconds: payload.maxSessionSeconds,
      });
    } catch (e) {
      setSession(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [context]);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {open ? (
        <section className="w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/70 bg-white/92 shadow-[0_24px_90px_oklch(0.24_0.08_230/0.26)] ring-1 ring-foreground/5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 border-border/70 border-b p-4">
            <div className="min-w-0">
              <p className="font-medium text-[11px] text-primary uppercase tracking-wide">
                SLNG voice agent
              </p>
              <h2 className="mt-1 font-semibold text-base leading-tight">
                Ask about this lesson
              </h2>
              <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                The agent has context from “{context.lessonTitle}”.
              </p>
            </div>
            <Button
              aria-label="Close voice agent"
              onClick={() => setOpen(false)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="p-4">
            {session ? (
              <SlngVoiceAgentRoom
                onEnded={() => setSession(null)}
                onError={(message) => setError(message)}
                session={session}
              />
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Speak naturally. Try asking for an explanation, a hint, or a
                  quiz question based on this exact lesson.
                </p>
                <Button
                  className="w-full rounded-2xl"
                  disabled={busy}
                  onClick={() => {
                    startSession().catch(() => {
                      /* errors are handled in component state */
                    });
                  }}
                  type="button"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mic2 className="size-4" />
                  )}
                  Start voice agent
                </Button>
              </div>
            )}
            {error ? (
              <p className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-destructive text-xs leading-relaxed">
                {error}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      <Button
        aria-label="Open lesson voice agent"
        className="h-14 rounded-full bg-[linear-gradient(135deg,oklch(0.68_0.14_174),oklch(0.78_0.16_83))] px-5 text-sm shadow-[0_18px_44px_oklch(0.44_0.12_180/0.28)] hover:brightness-105"
        onClick={() => {
          if (session) {
            setOpen(true);
            return;
          }
          startSession().catch(() => {
            /* errors are handled in component state */
          });
        }}
        type="button"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MessageCircle className="size-4" />
        )}
        Voice
      </Button>
    </div>
  );
}
