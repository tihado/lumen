import { StudioClient } from "./studio-client";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ lessonId?: string | string[] }>;
}) {
  const { lessonId } = await searchParams;
  const initialLessonId = Array.isArray(lessonId) ? lessonId[0] : lessonId;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_12%_14%,oklch(0.92_0.12_55/0.78),transparent_30%),radial-gradient(circle_at_84%_10%,oklch(0.86_0.11_190/0.7),transparent_28%),radial-gradient(circle_at_70%_88%,oklch(0.91_0.11_332/0.55),transparent_34%),linear-gradient(135deg,oklch(0.99_0.025_105),oklch(0.975_0.04_171)_48%,oklch(0.985_0.038_215))]">
      <StudioClient initialLessonId={initialLessonId} />
    </div>
  );
}
