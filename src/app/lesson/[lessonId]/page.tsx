import Link from "next/link";
import { FloatingLessonVoiceAgent } from "@/components/lesson-runtime/FloatingLessonVoiceAgent";
import { SandboxedLessonFrame } from "@/components/lesson-runtime/SandboxedLessonFrame";
import { buttonVariants } from "@/components/ui/button";
import { solarSystemDemoArtifact } from "@/lib/lesson/demo-artifact";
import {
  getLessonWithCurrentVersion,
  type PersistedLessonWithVersion,
} from "@/lib/lesson/repository";
import { readStudioState } from "@/lib/lesson/studio-state";
import {
  contextFromLessonDocument,
  type LessonVoiceAgentContext,
} from "@/lib/lesson/voice-agent-context";
import { cn } from "@/lib/utils";
import { LessonPreviewClient } from "./lesson-preview-client";

export const runtime = "nodejs";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  if (lessonId === "demo") {
    return (
      <div className="relative min-h-screen">
        <SandboxedLessonFrame
          html={solarSystemDemoArtifact.html}
          title={solarSystemDemoArtifact.title}
        />
      </div>
    );
  }

  let persisted: PersistedLessonWithVersion | null = null;
  try {
    persisted = await getLessonWithCurrentVersion(lessonId);
  } catch {
    persisted = null;
  }

  if (persisted?.lesson.renderMode === "sandboxed_html" && persisted.version) {
    const studioState = readStudioState(persisted.version.spec, {
      id: persisted.lesson.id,
      prompt: persisted.lesson.prompt,
      title: persisted.lesson.title,
    });
    const voiceContext: LessonVoiceAgentContext = studioState
      ? contextFromLessonDocument(studioState.lesson, {
          transcript: studioState.transcript,
          demoMode: "sandboxed-lesson-guide",
        })
      : {
          lessonId: persisted.lesson.id,
          lessonTitle: persisted.lesson.title,
          lessonSummary: persisted.lesson.prompt,
          transcript: persisted.lesson.prompt,
          demoMode: "sandboxed-lesson-guide",
        };

    return (
      <div className="relative min-h-screen">
        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "secondary" }),
            "fixed top-4 right-4 z-10 shadow-lg"
          )}
          href={`/studio?lessonId=${encodeURIComponent(lessonId)}`}
        >
          Back to Studio
        </Link>
        <SandboxedLessonFrame
          html={persisted.version.html}
          title={persisted.lesson.title}
        />
        <FloatingLessonVoiceAgent context={voiceContext} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LessonPreviewClient lessonId={lessonId} />
    </div>
  );
}
