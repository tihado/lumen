import { LessonPageShell } from "@/components/lesson-runtime/LessonPageShell";
import { SandboxedLessonFrame } from "@/components/lesson-runtime/SandboxedLessonFrame";
import { demoLessonFixture } from "@/lib/lesson/fixtures";
import {
  getLessonWithCurrentVersion,
  type PersistedLessonWithVersion,
} from "@/lib/lesson/repository";
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
      <div className="min-h-screen bg-background">
        <LessonPageShell doc={demoLessonFixture} />
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
    return (
      <SandboxedLessonFrame
        html={persisted.version.html}
        title={persisted.lesson.title}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LessonPreviewClient lessonId={lessonId} />
    </div>
  );
}
