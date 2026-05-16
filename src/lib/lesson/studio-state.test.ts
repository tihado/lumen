import { describe, expect, it } from "vitest";
import { demoLessonFixture } from "@/lib/lesson/fixtures";
import { createPersistedStudioSpec, readStudioState } from "./studio-state";

describe("readStudioState", () => {
  it("reads the saved Studio payload when present", () => {
    const state = readStudioState({
      kind: "static-lesson",
      title: "Stored artifact",
      studio: {
        lesson: demoLessonFixture,
        timeline: [
          {
            key: "step-1",
            provider: "orchestrator",
            label: "Persist",
            status: "completed",
          },
        ],
        transcript: "Explain photosynthesis",
      },
    });

    expect(state?.lesson.id).toBe("demo");
    expect(state?.timeline).toHaveLength(1);
    expect(state?.transcript).toBe("Explain photosynthesis");
  });

  it("creates the persisted spec shape used by new generations", () => {
    const spec = createPersistedStudioSpec({
      artifactSpec: {
        kind: "static-lesson",
        title: "Photosynthesis",
        prompt: "Explain photosynthesis",
        summary: "Plants convert light into stored energy.",
      },
      lesson: demoLessonFixture,
      timeline: [
        {
          key: "step-1",
          provider: "orchestrator",
          label: "Persist",
          status: "completed",
        },
      ],
      runId: "run-1",
      transcript: "Explain photosynthesis",
      completedAt: "2026-05-16T12:00:00.000Z",
    });

    expect(spec).toMatchObject({
      kind: "static-lesson",
      studio: {
        lesson: { id: "demo" },
        runId: "run-1",
        transcript: "Explain photosynthesis",
        completedAt: "2026-05-16T12:00:00.000Z",
      },
    });
    expect(readStudioState(spec)?.lesson.id).toBe("demo");
  });

  it("reconstructs a canvas document from older sandboxed specs", () => {
    const state = readStudioState(
      {
        kind: "solar-system",
        title: "Explore the Solar System",
        prompt: "I want to learn about the solar system",
        summary: "Observe the Sun and eight planets.",
        language: "en",
        durationMinutes: 20,
        quiz: {
          question: "Which planet is currently known to support life?",
          choices: ["Venus", "Earth", "Neptune"],
          answer: "Earth",
        },
      },
      {
        id: "rOeuK5OOUD",
        title: "Explore the Solar System",
        prompt: "I want to learn about the solar system",
      }
    );

    expect(state?.lesson.id).toBe("rOeuK5OOUD");
    expect(state?.lesson.title).toBe("Explore the Solar System");
    expect(state?.lesson.nodes["txt-summary"]).toMatchObject({
      type: "text",
      body: "Observe the Sun and eight planets.",
    });
    expect(state?.lesson.nodes["quiz-main"]).toMatchObject({
      type: "quiz",
      items: [
        {
          stem: "Which planet is currently known to support life?",
          choices: ["Venus", "Earth", "Neptune"],
          answer: "Earth",
        },
      ],
    });
    expect(state?.transcript).toBe("I want to learn about the solar system");
  });
});
