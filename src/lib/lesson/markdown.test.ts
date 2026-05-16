import { describe, expect, it } from "vitest";
import { demoLessonFixture } from "@/lib/lesson/fixtures";
import { lessonDocumentToMarkdown } from "@/lib/lesson/markdown";

describe("lesson markdown export", () => {
  it("renders the lesson document as readable markdown", () => {
    const markdown = lessonDocumentToMarkdown(demoLessonFixture);

    expect(markdown).toContain("# Explore the Solar System");
    expect(markdown).toContain("## Lesson");
    expect(markdown).toContain("### Learning objectives");
    expect(markdown).toContain("- Explain why planets orbit the Sun.");
    expect(markdown).toContain("### Wonder moment");
    expect(markdown).toContain(
      "![Illustration of planets orbiting a bright Sun]"
    );
    expect(markdown).toContain("### Check understanding");
    expect(markdown).toContain("Answer: The Sun");
    expect(markdown).toContain("## Citations");
    expect(markdown).toContain("[cit-1] Solar System Exploration");
  });
});
