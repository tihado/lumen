"use client";

import { Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LessonDocument, LessonNode } from "@/lib/lesson/schema";
import { cn } from "@/lib/utils";

type BlockRendererProps = {
  doc: LessonDocument;
  nodeId: string;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReplaceNode: (node: LessonNode) => void;
  onRetryMedia?: (mediaId: string) => void;
  mediaRetryingId?: string | null;
};

export function BlockRenderer({
  doc,
  nodeId,
  depth = 0,
  selectedId,
  onSelect,
  onReplaceNode,
  onRetryMedia,
  mediaRetryingId,
}: BlockRendererProps) {
  const node = doc.nodes[nodeId];
  if (!node) {
    return null;
  }

  const selected = selectedId === nodeId;

  if (node.type === "section") {
    return (
      <div
        className={cn(
          "space-y-3",
          depth > 0 && "border-primary/25 border-l pl-3"
        )}
      >
        <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {node.title}
        </div>
        {node.children.map((childId) => (
          <BlockRenderer
            depth={depth + 1}
            doc={doc}
            key={childId}
            mediaRetryingId={mediaRetryingId}
            nodeId={childId}
            onReplaceNode={onReplaceNode}
            onRetryMedia={onRetryMedia}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
      </div>
    );
  }

  if (node.type === "objectives") {
    return (
      <Card
        className={cn("bg-white/86", selected && "ring-2 ring-primary/45")}
        data-node-id={node.id}
        onClick={() => onSelect(node.id)}
        size="sm"
      >
        <CardHeader>
          <CardTitle className="text-base">
            {node.title ?? "Objectives"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {node.bullets.map((b) => (
              <li className="whitespace-pre-wrap" key={b}>
                {b}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  if (node.type === "text") {
    return (
      <Card
        className={cn("bg-white/86", selected && "ring-2 ring-primary/45")}
        data-node-id={node.id}
        onClick={() => onSelect(node.id)}
        size="sm"
      >
        <CardHeader>
          {node.title ? (
            <CardTitle className="text-base">{node.title}</CardTitle>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {selected ? (
            <Textarea
              className="min-h-[120px] font-sans text-sm"
              onChange={(e) =>
                onReplaceNode({
                  ...node,
                  body: e.target.value,
                })
              }
              onClick={(e) => e.stopPropagation()}
              value={node.body}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {node.body}
            </p>
          )}
          {node.citationIds?.length ? (
            <p className="text-muted-foreground text-xs">
              Linked citations: {node.citationIds.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (node.type === "media") {
    return (
      <Card
        className={cn("bg-white/86", selected && "ring-2 ring-primary/45")}
        data-node-id={node.id}
        onClick={() => onSelect(node.id)}
        size="sm"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{node.title ?? "Media"}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{node.status}</Badge>
            {node.provenance?.provider === "fal" ? (
              <Badge variant="secondary">fal</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {node.status === "pending" ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              Generating asset…
            </div>
          ) : null}
          {node.asset?.url && node.modality === "image" ? (
            <Image
              alt={node.alt}
              className="max-h-64 w-full rounded-lg object-cover"
              height={node.asset.height ?? 400}
              src={node.asset.url}
              unoptimized
              width={node.asset.width ?? 800}
            />
          ) : null}
          {node.asset?.url && node.modality === "video" ? (
            <video
              className="max-h-72 w-full rounded-lg bg-black object-cover"
              controls
              playsInline
              preload="metadata"
              src={node.asset.url}
            >
              <track kind="captions" />
            </video>
          ) : null}
          {node.asset?.url && node.modality === "audio" ? (
            <audio
              className="w-full"
              controls
              preload="none"
              src={node.asset.url}
            >
              <track kind="captions" />
            </audio>
          ) : null}
          {selected ? (
            <div className="space-y-2">
              <label className="font-medium text-xs" htmlFor={`alt-${node.id}`}>
                Alt text
              </label>
              <Input
                id={`alt-${node.id}`}
                onChange={(e) =>
                  onReplaceNode({
                    ...node,
                    alt: e.target.value,
                  })
                }
                onClick={(e) => e.stopPropagation()}
                value={node.alt}
              />
              {onRetryMedia ? (
                <Button
                  disabled={mediaRetryingId === node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetryMedia(node.id);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {mediaRetryingId === node.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Retry {node.modality === "video" ? "video" : "cover"}{" "}
                  {node.modality === "audio" ? "(SLNG)" : "(fal)"}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">{node.alt}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (node.type === "quiz") {
    return (
      <Card
        className={cn("bg-white/86", selected && "ring-2 ring-primary/45")}
        data-node-id={node.id}
        onClick={() => onSelect(node.id)}
        size="sm"
      >
        <CardHeader>
          <CardTitle className="text-base">{node.title ?? "Quiz"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {node.items.map((q) => (
            <div
              className="space-y-2 border-border/60 border-b pb-3 last:border-0"
              key={q.id}
            >
              <p className="font-medium text-sm">{q.stem}</p>
              {q.choices?.map((c) => (
                <div className="text-muted-foreground text-sm" key={c}>
                  - {c}
                </div>
              ))}
              {selected ? (
                <Textarea
                  className="min-h-[56px] text-sm"
                  onChange={(e) => {
                    const items = node.items.map((it) =>
                      it.id === q.id
                        ? { ...it, explanation: e.target.value }
                        : it
                    );
                    onReplaceNode({ ...node, items });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Explanation shown after answer"
                  value={q.explanation ?? ""}
                />
              ) : q.explanation ? (
                <p className="text-muted-foreground text-xs">{q.explanation}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (node.type === "activity") {
    return (
      <Card
        className={cn("bg-white/86", selected && "ring-2 ring-primary/45")}
        data-node-id={node.id}
        onClick={() => onSelect(node.id)}
        size="sm"
      >
        <CardHeader>
          <CardTitle className="text-base">
            {node.title ?? "Activity"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Badge variant="outline">{node.kind}</Badge>
          {node.instruction ? (
            <p className="text-muted-foreground">{node.instruction}</p>
          ) : null}
          {node.items?.map((it) => (
            <div key={it.id}>
              <span className="font-medium">{it.label}</span>{" "}
              <span className="text-muted-foreground">
                {" -> "}
                {node.categories?.find((c) => c.id === it.categoryId)?.label ??
                  it.categoryId}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (node.type === "reflection") {
    return (
      <Card
        className={cn("bg-white/86", selected && "ring-2 ring-primary/45")}
        data-node-id={node.id}
        onClick={() => onSelect(node.id)}
        size="sm"
      >
        <CardHeader>
          <CardTitle className="text-base">
            {node.title ?? "Reflection"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{node.prompt}</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
