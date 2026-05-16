import { describe, expect, it } from "vitest";
import { demoLessonFixture } from "@/lib/lesson/fixtures";
import { applyLessonPatch, applyLessonPatches } from "@/lib/lesson/patches";
import { createEmptyLesson } from "@/lib/lesson/schema";

describe("applyLessonPatch", () => {
  it("adds a node under a section", () => {
    let doc = createEmptyLesson({ id: "l1", title: "T", rootId: "root" });
    doc = applyLessonPatch(doc, {
      op: "add_node",
      parentId: "root",
      node: {
        id: "t1",
        type: "text",
        format: "plain",
        body: "Hello",
      },
    });
    const root = doc.nodes.root;
    expect(root?.type).toBe("section");
    if (root?.type === "section") {
      expect(root.children).toContain("t1");
    }
    expect(doc.nodes.t1?.type).toBe("text");
  });

  it("deletes subtree", () => {
    const doc = demoLessonFixture;
    const quizId = "quiz-1";
    const next = applyLessonPatch(doc, { op: "delete_node", nodeId: quizId });
    expect(next.nodes[quizId]).toBeUndefined();
  });
});

describe("applyLessonPatches", () => {
  it("chains patches", () => {
    let doc = createEmptyLesson({ id: "l1", title: "T", rootId: "root" });
    doc = applyLessonPatches(doc, [
      {
        op: "add_node",
        parentId: "root",
        node: { id: "a", type: "text", format: "plain", body: "a" },
      },
      {
        op: "add_node",
        parentId: "root",
        node: { id: "b", type: "text", format: "plain", body: "b" },
      },
    ]);
    const root = doc.nodes.root;
    expect(root?.type).toBe("section");
    if (root?.type === "section") {
      expect(root.children).toEqual(["a", "b"]);
    }
  });
});
