import { describe, expect, it } from "vitest";
import type { LessonPlan } from "@/lib/orchestrator/providers/llm";
import {
  createSandboxedLessonArtifact,
  validateSandboxedLessonHtml,
} from "./html-artifact";
import { slugifyLessonTitle } from "./slug";

const plan: LessonPlan = {
  title: "Explore the Solar System",
  gradeBand: "General audience",
  durationMinutes: 20,
  objectives: [
    "Explain the solar system",
    "Compare planets",
    "Use evidence from the model",
  ],
  hookBody: "Look up at the night sky.",
  keyVocabulary: [
    { term: "Orbit", definition: "A path one object follows around another." },
    { term: "Planet", definition: "A large body orbiting a star." },
    { term: "Gravity", definition: "The force that pulls objects together." },
  ],
  explanationSections: [
    {
      title: "The Sun anchors the system",
      body: "The Sun is the central star and the main source of gravity.",
    },
    {
      title: "Planets follow orbits",
      body: "Planets move around the Sun in paths called orbits.",
    },
    {
      title: "Distance changes conditions",
      body: "A planet's distance from the Sun affects light and temperature.",
    },
  ],
  workedExample: {
    title: "Compare Earth and Mars",
    body: "Earth and Mars are rocky planets, but Earth has stable liquid water.",
  },
  lectureScript: [
    {
      segment: "hook",
      title: "Look up",
      teacherNarration: "Ask students what they notice in the night sky.",
      studentAction: "Share one observation.",
    },
    {
      segment: "explain",
      title: "Name the system",
      teacherNarration: "Explain how planets orbit the Sun.",
      studentAction: "Point to evidence in the model.",
    },
    {
      segment: "example",
      title: "Compare planets",
      teacherNarration: "Model a comparison between Earth and Mars.",
      studentAction: "Write one comparison.",
    },
    {
      segment: "practice",
      title: "Sort cards",
      teacherNarration: "Ask students to sort examples and non-examples.",
      studentAction: "Classify every card.",
    },
  ],
  mediaPlan: {
    imagePrompt: "Create a clear solar system diagram for middle school.",
    imageAlt: "Diagram of the Sun and planets.",
    videoPrompt: "Show planets orbiting the Sun in a short educational video.",
    videoAlt: "Planets orbiting the Sun.",
    assets: [
      {
        placement: "hook",
        modality: "image",
        title: "Solar system anchor",
        prompt: "Create a clear solar system diagram for middle school.",
        alt: "Diagram of the Sun and planets.",
        teachingPurpose: "Introduce the main objects.",
      },
      {
        placement: "explain",
        modality: "video",
        title: "Orbit motion",
        prompt: "Show planets orbiting the Sun in a short educational video.",
        alt: "Planets orbiting the Sun.",
        teachingPurpose: "Show orbital motion.",
      },
      {
        placement: "practice",
        modality: "image",
        title: "Sort examples",
        prompt: "Show planet and non-planet examples.",
        alt: "Examples for sorting.",
        teachingPurpose: "Support classification practice.",
      },
    ],
  },
  explanationBody: "The solar system has the Sun and orbiting bodies.",
  activity: {
    title: "Sort planets",
    instruction: "Sort examples.",
    strongFitLabel: "Planet",
    weakFitLabel: "Not planet",
    strongItems: ["Earth", "Mars", "Neptune"],
    weakItems: ["Cloud"],
  },
  quiz: {
    title: "Quick check",
    items: [
      {
        stem: "Which planet has known life?",
        choices: ["Venus", "Earth", "Neptune"],
        answer: "Earth",
        explanation: "Earth has liquid water and life.",
      },
      {
        stem: "What does a planet orbit?",
        choices: ["A star", "A cloud", "A textbook"],
        answer: "A star",
        explanation: "Planets orbit stars such as the Sun.",
      },
      {
        stem: "What force helps keep planets in orbit?",
        choices: ["Gravity", "Friction", "Sound"],
        answer: "Gravity",
        explanation: "Gravity pulls objects toward each other.",
      },
    ],
  },
  reflectionPrompt: "What would you explore next?",
  teacherTips: [
    "Pause after the model loads and ask students what they notice.",
    "Have students compare two planets before answering the quiz.",
    "Use wrong answers to revisit vocabulary.",
  ],
};

describe("sandboxed lesson HTML", () => {
  it("creates a solar-system artifact with data and bundled runtime", () => {
    const artifact = createSandboxedLessonArtifact({
      prompt: "I want to learn about the solar system",
      plan,
    });

    expect(artifact.spec.kind).toBe("solar-system");
    expect(artifact.html).toContain('data-runtime="solar-system"');
    expect(artifact.html).toContain('id="lesson-data"');
    expect(artifact.html).toContain("/lesson-runtime/solar-system.v1.js");
    expect(artifact.html).toContain("Click the Sun or a planet");
    expect(artifact.html).toContain("data-solar-quiz");
    expect(artifact.html).toContain("Test your orbit instincts");
    expect(artifact.html).not.toContain("Answer: <span");
    expect(artifact.html).toContain("Earth");
    expect(artifact.html).toContain("What is gravity?");
    expect(artifact.html).toContain("9.81 m/s²");
    expect(artifact.spec.quizItems).toHaveLength(3);
    expect(
      artifact.spec.planets?.find((planet) => planet.id === "jupiter")
    ).toMatchObject({
      surfaceGravity: "24.79 m/s²",
      gravityComparedToEarth: "2.53 x Earth",
    });
  });

  it("embeds generated JavaScript for static lessons", () => {
    const artifact = createSandboxedLessonArtifact({
      prompt: "I want to learn about photosynthesis",
      plan: { ...plan, title: "Photosynthesis" },
      media: {
        assets: [
          {
            url: "https://example.com/photosynthesis.png",
            mime: "image/png",
            alt: "Leaf diagram showing photosynthesis.",
            title: "Leaf diagram",
            modality: "image",
          },
          {
            url: "https://example.com/photosynthesis.mp4",
            mime: "video/mp4",
            alt: "Animation showing photosynthesis over time.",
            title: "Photosynthesis animation",
            modality: "video",
          },
        ],
        image: {
          url: "https://example.com/photosynthesis.png",
          mime: "image/png",
          alt: "Leaf diagram showing photosynthesis.",
        },
        video: {
          url: "https://example.com/photosynthesis.mp4",
          mime: "video/mp4",
          alt: "Animation showing photosynthesis over time.",
        },
      },
      runtimeScript:
        "document.querySelector('[data-quiz-feedback]').textContent = 'Ready';",
    });

    expect(artifact.spec.kind).toBe("static-lesson");
    expect(artifact.html).toContain('data-runtime="static-lesson"');
    expect(artifact.html).toContain('id="lesson-runtime-script"');
    expect(artifact.html).toContain("data-quiz-choice");
    expect(artifact.html).toContain("data-classify-choice");
    expect(artifact.html).toContain("photosynthesis.png");
    expect(artifact.html).toContain("photosynthesis.mp4");
    expect(artifact.html).toContain("Ready");
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

  it("creates stable slugs for punctuated lesson titles", () => {
    expect(slugifyLessonTitle("Intro to AI: Part 1")).toBe(
      "intro-to-ai-part-1"
    );
  });
});
