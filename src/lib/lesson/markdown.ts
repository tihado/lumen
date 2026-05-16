import type {
  ActivityBlock,
  LessonDocument,
  LessonNode,
  MediaBlock,
  QuizBlock,
  ReflectionBlock,
  TextBlock,
} from "@/lib/lesson/schema";

function compactLines(lines: string[]) {
  return lines
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function heading(level: number, text: string) {
  return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${text}`;
}

function textBlockToMarkdown(node: TextBlock, level: number) {
  return compactLines([
    node.title ? heading(level, node.title) : "",
    node.body,
    node.citationIds?.length
      ? `Citations: ${node.citationIds.map((id) => `[${id}]`).join(", ")}`
      : "",
  ]);
}

function mediaBlockToMarkdown(node: MediaBlock, level: number) {
  const title = node.title ?? `${node.modality} asset`;
  const asset = node.asset?.url
    ? node.modality === "image"
      ? `![${node.alt}](${node.asset.url})`
      : `[${node.alt}](${node.asset.url})`
    : `_${node.status} ${node.modality}: ${node.alt}_`;

  return compactLines([heading(level, title), asset, node.alt]);
}

function quizBlockToMarkdown(node: QuizBlock, level: number) {
  const lines = [heading(level, node.title ?? "Quiz")];

  for (const [index, item] of node.items.entries()) {
    lines.push("", `${index + 1}. ${item.stem}`);
    for (const choice of item.choices ?? []) {
      lines.push(`   - ${choice}`);
    }
    if (item.answer) {
      lines.push(`   - Answer: ${item.answer}`);
    }
    if (item.explanation) {
      lines.push(`   - Explanation: ${item.explanation}`);
    }
  }

  return compactLines(lines);
}

function activityBlockToMarkdown(node: ActivityBlock, level: number) {
  const lines = [
    heading(level, node.title ?? "Activity"),
    `Type: ${node.kind}`,
    node.instruction ?? "",
  ];

  if (node.pairs?.length) {
    lines.push("", "Pairs:");
    for (const pair of node.pairs) {
      lines.push(`- ${pair.term}: ${pair.definition}`);
    }
  }

  if (node.categories?.length) {
    lines.push("", "Categories:");
    for (const category of node.categories) {
      lines.push(`- ${category.label}`);
    }
  }

  if (node.items?.length) {
    lines.push("", "Items:");
    for (const item of node.items) {
      const category =
        node.categories?.find((candidate) => candidate.id === item.categoryId)
          ?.label ?? item.categoryId;
      lines.push(`- ${item.label}: ${category}`);
    }
  }

  if (node.steps?.length) {
    lines.push("", "Steps:");
    for (const [index, step] of node.steps.entries()) {
      lines.push(`${index + 1}. ${step.text}`);
    }
  }

  return compactLines(lines);
}

function reflectionBlockToMarkdown(node: ReflectionBlock, level: number) {
  return compactLines([
    heading(level, node.title ?? "Reflection"),
    node.prompt,
    node.rubric ? `Rubric: ${node.rubric}` : "",
  ]);
}

function nodeToMarkdown(
  doc: LessonDocument,
  node: LessonNode,
  level: number,
  seen: Set<string>
): string {
  if (seen.has(node.id)) {
    return "";
  }
  seen.add(node.id);

  if (node.type === "section") {
    const childLevel = level + 1;
    const children = node.children
      .map((childId) => {
        const child = doc.nodes[childId];
        return child ? nodeToMarkdown(doc, child, childLevel, seen) : "";
      })
      .filter(Boolean);

    return compactLines([
      heading(level, node.title),
      node.summary ?? "",
      ...children,
    ]);
  }

  if (node.type === "objectives") {
    return compactLines([
      heading(level, node.title ?? "Learning objectives"),
      ...node.bullets.map((bullet) => `- ${bullet}`),
    ]);
  }

  if (node.type === "text") {
    return textBlockToMarkdown(node, level);
  }

  if (node.type === "media") {
    return mediaBlockToMarkdown(node, level);
  }

  if (node.type === "quiz") {
    return quizBlockToMarkdown(node, level);
  }

  if (node.type === "activity") {
    return activityBlockToMarkdown(node, level);
  }

  return reflectionBlockToMarkdown(node, level);
}

export function lessonDocumentToMarkdown(doc: LessonDocument) {
  const root = doc.nodes[doc.root];
  const body = root ? nodeToMarkdown(doc, root, 2, new Set<string>()) : "";
  const metadata = [
    doc.gradeBand ? `Grade band: ${doc.gradeBand}` : "",
    doc.durationMinutes ? `Duration: ${doc.durationMinutes} minutes` : "",
    doc.language ? `Language: ${doc.language}` : "",
  ].filter(Boolean);
  const citations = doc.citations.map((citation) =>
    compactLines([
      `- [${citation.id}] ${citation.title ?? citation.url}`,
      `  ${citation.url}`,
      `  ${citation.excerpt}`,
    ])
  );

  return compactLines([
    heading(1, doc.title),
    metadata.length ? metadata.join("\n") : "",
    body,
    citations.length ? heading(2, "Citations") : "",
    ...citations,
  ]);
}
