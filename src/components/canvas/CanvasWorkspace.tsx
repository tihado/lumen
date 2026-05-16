"use client";

import { BookMarked } from "lucide-react";
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
    <Card className="min-h-0 flex-1 overflow-hidden border-white/80 bg-white/78 py-0 shadow-[0_22px_70px_oklch(0.47_0.09_180/0.13)]">
      <CardHeader className="border-white/70 border-b bg-[linear-gradient(135deg,white,oklch(0.965_0.04_165/0.72))] py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookMarked className="size-4" />
          </span>
          <span className="min-w-0 truncate">{doc.title}</span>
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          {doc.gradeBand ? `${doc.gradeBand} · ` : null}
          {doc.durationMinutes ? `${doc.durationMinutes} min · ` : null}
          Lesson id: <code className="rounded bg-muted px-1">{doc.id}</code>
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <ScrollArea className="min-h-0 flex-1">
          <div className="min-h-full space-y-4 bg-[radial-gradient(circle_at_20%_18%,oklch(0.9_0.1_73/0.26),transparent_22%),radial-gradient(circle_at_82%_35%,oklch(0.88_0.1_190/0.2),transparent_24%),linear-gradient(oklch(0.42_0.05_180/0.04)_1px,transparent_1px),linear-gradient(90deg,oklch(0.42_0.05_180/0.035)_1px,transparent_1px)] bg-[size:auto,auto,32px_32px,32px_32px] p-4 pb-8">
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
