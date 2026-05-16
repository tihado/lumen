import type { LessonDocument } from "./schema";

/** Stable fixture for UI dev and `/lesson/demo`. */
export const demoLessonFixture: LessonDocument = {
  schemaVersion: 1,
  id: "demo",
  title: "Explore the Solar System — Grade 6",
  gradeBand: "Grade 6",
  durationMinutes: 20,
  language: "en",
  root: "sec-root",
  citations: [
    {
      id: "cit-1",
      url: "https://science.nasa.gov/solar-system/",
      title: "Solar System Exploration - NASA Science",
      excerpt:
        "Our solar system includes the Sun, eight planets, dwarf planets, moons, asteroids, and comets.",
      retrievedAt: new Date().toISOString(),
      provider: "tavily",
      nodeIds: ["txt-hook"],
    },
  ],
  nodes: {
    "sec-root": {
      id: "sec-root",
      type: "section",
      title: "Lesson",
      children: [
        "obj-1",
        "sec-hook",
        "sec-explain",
        "sec-practice",
        "quiz-1",
        "refl-1",
      ],
    },
    "obj-1": {
      id: "obj-1",
      type: "objectives",
      title: "Learning objectives",
      bullets: [
        "Explain why planets orbit the Sun.",
        "Compare inner rocky planets with outer gas and ice giants.",
        "Use scale clues to describe why space in the solar system is mostly empty.",
      ],
    },
    "sec-hook": {
      id: "sec-hook",
      type: "section",
      title: "Hook",
      children: ["txt-hook", "media-cover"],
    },
    "txt-hook": {
      id: "txt-hook",
      type: "text",
      title: "Wonder moment",
      format: "markdown",
      body: "If the Sun suddenly disappeared, would Earth fly away immediately, keep circling, or do something stranger? Make a prediction, then explain what gravity has to do with it.",
      citationIds: ["cit-1"],
    },
    "media-cover": {
      id: "media-cover",
      type: "media",
      title: "Cover visual",
      modality: "image",
      alt: "Illustration of planets orbiting a bright Sun",
      status: "ready",
      asset: {
        url: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=900&q=80",
        mime: "image/jpeg",
      },
      provenance: {
        provider: "fal",
        model: "fixture",
        createdAt: new Date().toISOString(),
      },
    },
    "sec-explain": {
      id: "sec-explain",
      type: "section",
      title: "Explain",
      children: ["txt-explain-1", "txt-explain-2"],
    },
    "txt-explain-1": {
      id: "txt-explain-1",
      type: "text",
      format: "markdown",
      title: "The Sun is the anchor",
      body: "The **Sun** holds almost all the mass in the solar system, so its gravity acts like the anchor for planets, dwarf planets, asteroids, and comets.",
    },
    "txt-explain-2": {
      id: "txt-explain-2",
      type: "text",
      format: "markdown",
      title: "Two planet neighborhoods",
      body: "The inner planets are mostly **rocky**: Mercury, Venus, Earth, and Mars. The outer planets are much larger **gas or ice giants**: Jupiter, Saturn, Uranus, and Neptune.",
    },
    "sec-practice": {
      id: "sec-practice",
      type: "section",
      title: "Orbit lab",
      children: ["act-1"],
    },
    "act-1": {
      id: "act-1",
      type: "activity",
      title: "Classify planet neighborhoods",
      kind: "classification",
      instruction:
        "Sort each planet into the inner rocky planets or the outer giants.",
      categories: [
        { id: "inner", label: "Inner rocky planets" },
        { id: "outer", label: "Outer giants" },
      ],
      items: [
        { id: "i1", label: "Mercury", categoryId: "inner" },
        { id: "i2", label: "Mars", categoryId: "inner" },
        { id: "i3", label: "Jupiter", categoryId: "outer" },
        { id: "i4", label: "Neptune", categoryId: "outer" },
      ],
    },
    "quiz-1": {
      id: "quiz-1",
      type: "quiz",
      title: "Check understanding",
      items: [
        {
          id: "q1",
          stem: "What does every planet in our solar system orbit?",
          choices: ["Earth", "The Sun", "The Moon"],
          answer: "The Sun",
          explanation:
            "The Sun has the strongest gravitational pull in the solar system because it contains almost all of the system's mass.",
        },
      ],
    },
    "refl-1": {
      id: "refl-1",
      type: "reflection",
      title: "Exit ticket",
      prompt:
        "Choose one planet and explain how its place in the solar system affects what it is like.",
    },
  },
};
