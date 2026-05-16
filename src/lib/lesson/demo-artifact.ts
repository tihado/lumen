import type { LessonPlan } from "@/lib/orchestrator/providers/llm";
import { createSandboxedLessonArtifact } from "./html-artifact";

const solarSystemDemoPlan = {
  title: "Explore the Solar System",
  gradeBand: "General audience",
  durationMinutes: 20,
  objectives: [
    "Explain how gravity helps organize the solar system.",
    "Compare planets by distance, size, orbit time, and surface gravity.",
    "Use evidence from an interactive model to answer orbit questions.",
  ],
  hookBody:
    "Start with a simple question: if every planet is moving, why do planets keep circling the Sun instead of flying away?",
  keyVocabulary: [
    {
      term: "Orbit",
      definition: "A curved path one object follows around another object.",
    },
    {
      term: "Planet",
      definition: "A large round world that orbits a star and clears its path.",
    },
    {
      term: "Gravity",
      definition:
        "The attractive force between objects with mass, such as the Sun and planets.",
    },
  ],
  explanationSections: [
    {
      title: "The Sun anchors the system",
      body: "The Sun contains almost all of the mass in the solar system, so its gravity strongly shapes the paths of planets and smaller bodies.",
    },
    {
      title: "Planets follow orbits",
      body: "Each planet moves forward while gravity pulls it toward the Sun. Together, those motions create an orbit.",
    },
    {
      title: "Distance changes conditions",
      body: "A planet's distance from the Sun affects light, temperature, orbit length, and the way we compare worlds.",
    },
  ],
  workedExample: {
    title: "Compare Earth and Mars",
    body: "Earth and Mars are both rocky planets, but Earth has stronger surface gravity, stable liquid water, and conditions that support life.",
  },
  lectureScript: [
    {
      segment: "hook",
      title: "Start with motion",
      teacherNarration:
        "Ask students why moving planets do not simply fly away from the Sun.",
      studentAction: "Students make a first claim before exploring the model.",
    },
    {
      segment: "explain",
      title: "Name the system",
      teacherNarration:
        "Use the model to show how the Sun, planets, gravity, and forward motion work together.",
      studentAction:
        "Students click two planets and compare the evidence shown in the panel.",
    },
    {
      segment: "example",
      title: "Compare two planets",
      teacherNarration:
        "Model a comparison between Earth and Mars using distance, period, and gravity.",
      studentAction: "Students write one evidence-based comparison sentence.",
    },
    {
      segment: "quiz",
      title: "Check orbit instincts",
      teacherNarration:
        "Have students answer the quick check and use feedback to revise their reasoning.",
      studentAction:
        "Students select answers, read feedback, and name one new fact.",
    },
  ],
  mediaPlan: {
    imagePrompt:
      "Create a clear solar system diagram for middle school learners.",
    imageAlt: "Diagram of the Sun and planets in order.",
    videoPrompt:
      "Show planets orbiting the Sun in a short classroom-safe animation.",
    videoAlt: "Planets orbiting the Sun.",
    assets: [
      {
        placement: "hook",
        modality: "image",
        title: "Solar system anchor",
        prompt:
          "Create a clear solar system diagram for middle school learners.",
        alt: "Diagram of the Sun and planets in order.",
        teachingPurpose: "Introduce the main objects in the model.",
      },
      {
        placement: "explain",
        modality: "video",
        title: "Orbit motion",
        prompt:
          "Show planets orbiting the Sun in a short classroom-safe animation.",
        alt: "Planets orbiting the Sun.",
        teachingPurpose: "Make orbital motion visible.",
      },
      {
        placement: "practice",
        modality: "image",
        title: "Planet comparison cards",
        prompt: "Show classroom cards comparing rocky planets and gas giants.",
        alt: "Planet comparison cards.",
        teachingPurpose: "Support evidence-based comparison practice.",
      },
    ],
  },
  explanationBody:
    "The solar system includes the Sun, eight planets, and many smaller bodies. Gravity pulls planets toward the Sun while their forward motion keeps them moving in orbit.",
  activity: {
    title: "Sort solar system examples",
    instruction:
      "Sort each example, then explain one choice with evidence from the model.",
    strongFitLabel: "Planet",
    weakFitLabel: "Not a planet",
    strongItems: ["Earth", "Mars", "Neptune"],
    weakItems: ["The Sun", "A classroom globe"],
  },
  quiz: {
    title: "Quick check",
    items: [
      {
        stem: "Which planet is currently known to support life?",
        choices: ["Venus", "Earth", "Neptune"],
        answer: "Earth",
        explanation:
          "Earth has stable liquid water, a protective atmosphere, and ecosystems we can directly observe.",
      },
      {
        stem: "What does a planet orbit in our solar system?",
        choices: ["The Sun", "A comet", "Earth's Moon"],
        answer: "The Sun",
        explanation:
          "Planets orbit the Sun because the Sun has the strongest gravitational pull in the solar system.",
      },
      {
        stem: "Which force helps keep planets moving in orbit?",
        choices: ["Gravity", "Sound", "Friction"],
        answer: "Gravity",
        explanation:
          "Gravity pulls planets toward the Sun while forward motion keeps them from falling straight in.",
      },
    ],
  },
  reflectionPrompt:
    "Which planet would you investigate next, and what evidence from the model would you use first?",
  teacherTips: [
    "Pause after the model loads and ask students what they notice before naming terms.",
    "Have students compare two planets before answering the quiz.",
    "Use wrong answers to revisit gravity, orbit, and evidence.",
  ],
} satisfies LessonPlan;

export const solarSystemDemoArtifact = createSandboxedLessonArtifact({
  prompt: "I want to learn about the solar system",
  plan: solarSystemDemoPlan,
});
