import "server-only";

import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { generationRuns, lessons, lessonVersions } from "@/db/schema";
import { slugifyLessonTitle } from "./slug";

export type PersistedLessonWithVersion = {
  lesson: typeof lessons.$inferSelect;
  version: typeof lessonVersions.$inferSelect | null;
};

export async function createGeneratingLesson(input: {
  id: string;
  title: string;
  prompt: string;
}) {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .insert(lessons)
    .values({
      id: input.id,
      title: input.title,
      prompt: input.prompt,
      slug: `${slugifyLessonTitle(input.title)}-${input.id.slice(0, 6)}`,
      status: "generating",
      renderMode: "sandboxed_html",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: lessons.id,
      set: {
        title: input.title,
        prompt: input.prompt,
        status: "generating",
        updatedAt: now,
      },
    })
    .returning();
  return rows[0];
}

export async function createGenerationRun(input: {
  id: string;
  lessonId: string;
  transcript: string;
}) {
  const db = getDb();
  const rows = await db
    .insert(generationRuns)
    .values({
      id: input.id,
      lessonId: input.lessonId,
      status: "running",
      transcript: input.transcript,
      startedAt: new Date(),
    })
    .returning();
  return rows[0];
}

export async function finishGenerationRun(input: {
  id: string;
  status: "completed" | "failed";
  error?: string;
}) {
  const db = getDb();
  await db
    .update(generationRuns)
    .set({
      status: input.status,
      error: input.error,
      finishedAt: new Date(),
    })
    .where(eq(generationRuns.id, input.id));
}

export async function markLessonFailed(input: {
  lessonId: string;
  error?: string;
}) {
  const db = getDb();
  await db
    .update(lessons)
    .set({
      status: "failed",
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, input.lessonId));
}

export async function saveLessonVersion(input: {
  lessonId: string;
  title: string;
  html: string;
  spec: Record<string, unknown>;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ version: lessonVersions.version })
      .from(lessonVersions)
      .where(eq(lessonVersions.lessonId, input.lessonId))
      .orderBy(desc(lessonVersions.version))
      .limit(1);
    const nextVersion = (existing[0]?.version ?? 0) + 1;
    const versionId = nanoid(12);
    const now = new Date();
    const inserted = await tx
      .insert(lessonVersions)
      .values({
        id: versionId,
        lessonId: input.lessonId,
        version: nextVersion,
        html: input.html,
        spec: input.spec,
        createdAt: now,
      })
      .returning();

    await tx
      .update(lessons)
      .set({
        title: input.title,
        status: "ready",
        currentVersionId: versionId,
        updatedAt: now,
      })
      .where(eq(lessons.id, input.lessonId));

    return inserted[0];
  });
}

export async function getLessonWithCurrentVersion(
  lessonId: string
): Promise<PersistedLessonWithVersion | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  const lesson = rows[0];
  if (!lesson) {
    return null;
  }
  const versionRows = lesson.currentVersionId
    ? await db
        .select()
        .from(lessonVersions)
        .where(eq(lessonVersions.id, lesson.currentVersionId))
        .limit(1)
    : [];
  return { lesson, version: versionRows[0] ?? null };
}

export async function listLessons() {
  const db = getDb();
  return db.select().from(lessons).orderBy(desc(lessons.createdAt)).limit(50);
}

export async function deleteLesson(lessonId: string) {
  const db = getDb();
  const rows = await db
    .delete(lessons)
    .where(eq(lessons.id, lessonId))
    .returning({ id: lessons.id });
  return rows[0] ?? null;
}
