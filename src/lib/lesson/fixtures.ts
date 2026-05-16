import type { LessonDocument } from "./schema";

/** Stable fixture for UI dev and `/lesson/demo`. */
export const demoLessonFixture: LessonDocument = {
  schemaVersion: 1,
  id: "demo",
  title: "Photosynthesis — Grade 6",
  gradeBand: "Grade 6",
  durationMinutes: 20,
  language: "en",
  root: "sec-root",
  citations: [
    {
      id: "cit-1",
      url: "https://example.edu/photosynthesis-overview",
      title: "Photosynthesis overview (example)",
      excerpt:
        "Plants use sunlight, water, and carbon dioxide to make sugar and oxygen.",
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
        "Explain what plants need for photosynthesis.",
        "Describe what the plant makes and what it releases.",
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
      body: "If you held your breath in a sealed jar of only plants, what do you think would happen over time—and **why**?",
      citationIds: ["cit-1"],
    },
    "media-cover": {
      id: "media-cover",
      type: "media",
      title: "Cover visual",
      modality: "image",
      alt: "Stylized leaf with sunlight rays",
      status: "ready",
      asset: {
        url: "https://images.unsplash.com/photo-1465146633011-14f18e953b20?w=800&q=80",
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
      body: "**Photosynthesis** is how plants turn light energy into chemical energy (sugar) they can use to grow.",
    },
    "txt-explain-2": {
      id: "txt-explain-2",
      type: "text",
      format: "markdown",
      body: "Inputs: **sunlight**, **water**, **CO₂**. Outputs: **sugar (glucose)** and **oxygen**.",
    },
    "sec-practice": {
      id: "sec-practice",
      type: "section",
      title: "Quick check",
      children: ["act-1"],
    },
    "act-1": {
      id: "act-1",
      type: "activity",
      title: "Classify inputs vs outputs",
      kind: "classification",
      instruction:
        "Drag each label into Inputs or Outputs (tap to select in this demo).",
      categories: [
        { id: "in", label: "Inputs" },
        { id: "out", label: "Outputs" },
      ],
      items: [
        { id: "i1", label: "Sunlight", categoryId: "in" },
        { id: "i2", label: "Oxygen", categoryId: "out" },
        { id: "i3", label: "Carbon dioxide", categoryId: "in" },
        { id: "i4", label: "Sugar (glucose)", categoryId: "out" },
      ],
    },
    "quiz-1": {
      id: "quiz-1",
      type: "quiz",
      title: "Check understanding",
      items: [
        {
          id: "q1",
          stem: "Which gas do plants release during photosynthesis?",
          choices: ["Carbon dioxide", "Oxygen", "Nitrogen"],
          answer: "Oxygen",
          explanation:
            "Oxygen is a byproduct when plants split water using light energy.",
        },
      ],
    },
    "refl-1": {
      id: "refl-1",
      type: "reflection",
      title: "Exit ticket",
      prompt:
        "Where could you see photosynthesis happening in your everyday life?",
    },
  },
};
