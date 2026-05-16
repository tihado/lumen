import { describe, expect, it } from "vitest";
import type { LessonPlan } from "@/lib/orchestrator/providers/llm";
import {
  createSandboxedLessonArtifact,
  validateSandboxedLessonHtml,
} from "./html-artifact";
import { slugifyLessonTitle } from "./slug";

const plan: LessonPlan = {
  title: "Khám phá hệ Mặt Trời",
  gradeBand: "General audience",
  durationMinutes: 20,
  objectives: ["Explain the solar system", "Compare planets"],
  hookBody: "Look up at the night sky.",
  explanationBody: "The solar system has the Sun and orbiting bodies.",
  activity: {
    title: "Sort planets",
    instruction: "Sort examples.",
    strongFitLabel: "Planet",
    weakFitLabel: "Not planet",
    strongItems: ["Earth", "Mars"],
    weakItem: "Cloud",
  },
  quiz: {
    title: "Quick check",
    stem: "Which planet has known life?",
    choices: ["Venus", "Earth", "Neptune"],
    answer: "Earth",
    explanation: "Earth has liquid water and life.",
  },
  reflectionPrompt: "What would you explore next?",
};

describe("sandboxed lesson HTML", () => {
  it("creates a solar-system artifact with data and bundled runtime", () => {
    const artifact = createSandboxedLessonArtifact({
      prompt: "tôi muốn tìm hiểu về hệ mặt trời",
      plan,
    });

    expect(artifact.spec.kind).toBe("solar-system");
    expect(artifact.html).toContain('data-runtime="solar-system"');
    expect(artifact.html).toContain('id="lesson-data"');
    expect(artifact.html).toContain("/lesson-runtime/solar-system.v1.js");
    expect(artifact.html).toContain("Trái Đất");
  });

  it("rejects unsupported scripts and inline handlers", () => {
    expect(() =>
      validateSandboxedLessonHtml(
        '<!doctype html><main data-runtime="solar-system"><img onerror="alert(1)"></main>'
      )
    ).toThrow(/Inline event handlers/);

    expect(() =>
      validateSandboxedLessonHtml(
        '<!doctype html><main data-runtime="solar-system"></main><script src="https://example.com/x.js"></script>'
      )
    ).toThrow(/Unsupported script/);
  });

  it("creates stable slugs for Vietnamese lesson titles", () => {
    expect(slugifyLessonTitle("Khám phá hệ Mặt Trời")).toBe(
      "kham-pha-he-mat-troi"
    );
  });
});
