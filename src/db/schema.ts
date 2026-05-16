import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type LessonStatus = "generating" | "ready" | "failed";
export type LessonRenderMode = "sandboxed_html";
export type GenerationRunStatus = "running" | "completed" | "failed";

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  slug: text("slug").notNull(),
  status: text("status").$type<LessonStatus>().notNull(),
  renderMode: text("render_mode").$type<LessonRenderMode>().notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  currentVersionId: text("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonVersions = pgTable("lesson_versions", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  html: text("html").notNull(),
  spec: jsonb("spec").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const generationRuns = pgTable("generation_runs", {
  id: text("id").primaryKey(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  status: text("status").$type<GenerationRunStatus>().notNull(),
  transcript: text("transcript").notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const lessonsRelations = relations(lessons, ({ many }) => ({
  versions: many(lessonVersions),
  runs: many(generationRuns),
}));

export const lessonVersionsRelations = relations(lessonVersions, ({ one }) => ({
  lesson: one(lessons, {
    fields: [lessonVersions.lessonId],
    references: [lessons.id],
  }),
}));

export const generationRunsRelations = relations(generationRuns, ({ one }) => ({
  lesson: one(lessons, {
    fields: [generationRuns.lessonId],
    references: [lessons.id],
  }),
}));
