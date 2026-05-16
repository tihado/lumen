import { LessonPreviewClient } from "./lesson-preview-client";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  return (
    <div className="min-h-screen bg-background">
      <LessonPreviewClient lessonId={lessonId} />
    </div>
  );
}
