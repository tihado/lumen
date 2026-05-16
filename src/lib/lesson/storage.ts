import { demoLessonFixture } from "@/lib/lesson/fixtures";
import type { LessonDocument } from "@/lib/lesson/schema";
import { lessonDocumentSchema } from "@/lib/lesson/schema";

const KEY_PREFIX = "canvas-teacher-ai:lesson:";

export function lessonStorageKey(lessonId: string) {
  return `${KEY_PREFIX}${lessonId}`;
}

export function saveLessonToLocal(lesson: LessonDocument) {
  if (typeof window === "undefined") {
    return;
  }
  const key = lessonStorageKey(lesson.id);
  window.localStorage.setItem(key, JSON.stringify(lesson));
}

export function loadLessonFromLocal(lessonId: string): LessonDocument | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(lessonStorageKey(lessonId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return lessonDocumentSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function loadLessonForPreview(lessonId: string): LessonDocument | null {
  if (lessonId === "demo") {
    return demoLessonFixture;
  }
  return loadLessonFromLocal(lessonId);
}
