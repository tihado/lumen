"use client";

import { BlockRenderer } from "@/components/canvas/BlockRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LessonDocument, LessonNode } from "@/lib/lesson/schema";

type CanvasWorkspaceProps = {
  doc: LessonDocument;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReplaceNode: (node: LessonNode) => void;
  onRetryMedia?: (mediaId: string) => void;
  mediaRetryingId?: string | null;
};

export function CanvasWorkspace({
  doc,
  selectedId,
  onSelect,
  onReplaceNode,
  onRetryMedia,
  mediaRetryingId,
}: CanvasWorkspaceProps) {
  const root = doc.nodes[doc.root];
  const childIds = root?.type === "section" ? root.children : [];

  return (
    <Card className="min-h-0 flex-1 overflow-hidden">
      <CardHeader className="border-border/60 border-b py-3">
        <CardTitle className="text-base">{doc.title}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {doc.gradeBand ? `${doc.gradeBand} · ` : null}
          {doc.durationMinutes ? `${doc.durationMinutes} min · ` : null}
          Lesson id: <code className="rounded bg-muted px-1">{doc.id}</code>
        </p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-[min(70vh,640px)]">
          <div className="space-y-4 p-4">
            {childIds.map((id) => (
              <BlockRenderer
                doc={doc}
                key={id}
                mediaRetryingId={mediaRetryingId}
                nodeId={id}
                onReplaceNode={onReplaceNode}
                onRetryMedia={onRetryMedia}
                onSelect={onSelect}
                selectedId={selectedId}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
