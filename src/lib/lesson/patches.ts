import { nanoid } from "nanoid";
import type { LessonDocument, LessonNode } from "./schema";
import { lessonDocumentSchema, lessonNodeSchema } from "./schema";

export type LessonPatchOp =
  | {
      op: "add_node";
      parentId: string;
      node: LessonNode;
      /** Insert before this child id; omit to append */
      beforeChildId?: string;
    }
  | { op: "replace_node"; node: LessonNode }
  | { op: "delete_node"; nodeId: string }
  | {
      op: "move_node";
      nodeId: string;
      newParentId: string;
      beforeChildId?: string;
    }
  | { op: "set_citations"; citations: LessonDocument["citations"] }
  | {
      op: "set_meta";
      title?: string;
      gradeBand?: string;
      durationMinutes?: number;
    };

function isSection(
  n: LessonNode | undefined
): n is Extract<LessonNode, { type: "section" }> {
  return n?.type === "section";
}

function removeChildFromParents(doc: LessonDocument, childId: string) {
  for (const node of Object.values(doc.nodes)) {
    if (node.type === "section" && node.children.includes(childId)) {
      node.children = node.children.filter((c) => c !== childId);
    }
  }
}

function insertChild(
  section: Extract<LessonNode, { type: "section" }>,
  childId: string,
  beforeChildId?: string
) {
  if (!beforeChildId) {
    section.children.push(childId);
    return;
  }
  const i = section.children.indexOf(beforeChildId);
  if (i === -1) {
    section.children.push(childId);
  } else {
    section.children.splice(i, 0, childId);
  }
}

/**
 * Applies a single patch operation immutably (returns a new document).
 */
export function applyLessonPatch(
  doc: LessonDocument,
  patch: LessonPatchOp
): LessonDocument {
  const next: LessonDocument = structuredClone(doc);

  switch (patch.op) {
    case "set_meta": {
      if (patch.title !== undefined) {
        next.title = patch.title;
      }
      if (patch.gradeBand !== undefined) {
        next.gradeBand = patch.gradeBand;
      }
      if (patch.durationMinutes !== undefined) {
        next.durationMinutes = patch.durationMinutes;
      }
      break;
    }
    case "set_citations": {
      next.citations = patch.citations;
      break;
    }
    case "add_node": {
      const parent = next.nodes[patch.parentId];
      if (!isSection(parent)) {
        throw new Error(`Parent ${patch.parentId} is not a section`);
      }
      lessonNodeSchema.parse(patch.node);
      if (next.nodes[patch.node.id]) {
        throw new Error(`Node ${patch.node.id} already exists`);
      }
      next.nodes[patch.node.id] = patch.node;
      insertChild(parent, patch.node.id, patch.beforeChildId);
      break;
    }
    case "replace_node": {
      lessonNodeSchema.parse(patch.node);
      if (!next.nodes[patch.node.id]) {
        throw new Error(`Node ${patch.node.id} not found`);
      }
      next.nodes[patch.node.id] = patch.node;
      break;
    }
    case "delete_node": {
      const id = patch.nodeId;
      if (id === next.root) {
        throw new Error("Cannot delete root node");
      }
      removeChildFromParents(next, id);
      const stack = [id];
      const toDelete = new Set<string>();
      while (stack.length) {
        const cur = stack.pop() as string;
        toDelete.add(cur);
        const n = next.nodes[cur];
        if (n?.type === "section") {
          stack.push(...n.children);
        }
      }
      for (const del of toDelete) {
        delete next.nodes[del];
      }
      break;
    }
    case "move_node": {
      const node = next.nodes[patch.nodeId];
      if (!node) {
        throw new Error(`Node ${patch.nodeId} not found`);
      }
      if (patch.nodeId === next.root) {
        throw new Error("Cannot move root");
      }
      const newParent = next.nodes[patch.newParentId];
      if (!isSection(newParent)) {
        throw new Error(`New parent ${patch.newParentId} is not a section`);
      }
      removeChildFromParents(next, patch.nodeId);
      insertChild(newParent, patch.nodeId, patch.beforeChildId);
      break;
    }
    default: {
      const _exhaustive: never = patch;
      throw new Error(`Unhandled patch: ${JSON.stringify(_exhaustive)}`);
    }
  }

  return lessonDocumentSchema.parse(next);
}

export function applyLessonPatches(
  doc: LessonDocument,
  patches: LessonPatchOp[]
): LessonDocument {
  return patches.reduce((d, p) => applyLessonPatch(d, p), doc);
}

export function newRunStepId() {
  return nanoid(10);
}
