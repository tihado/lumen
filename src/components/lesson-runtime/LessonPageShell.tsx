"use client";

import Image from "next/image";
import { ActivityRuntime } from "@/components/lesson-runtime/ActivityRuntime";
import { FloatingLessonVoiceAgent } from "@/components/lesson-runtime/FloatingLessonVoiceAgent";
import { QuizRuntime } from "@/components/lesson-runtime/QuizRuntime";
import { ReflectionPrompt } from "@/components/lesson-runtime/ReflectionPrompt";
import { SourcePopover } from "@/components/lesson-runtime/SourcePopover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LessonDocument } from "@/lib/lesson/schema";
import { contextFromLessonDocument } from "@/lib/lesson/voice-agent-context";

function citationForText(
  doc: LessonDocument,
  citationIds?: string[]
): (typeof doc.citations)[0] | undefined {
  if (!citationIds?.length) {
    return;
  }
  const id = citationIds[0];
  return doc.citations.find((c) => c.id === id);
}

function StudentBlockTree({
  doc,
  nodeId,
  depth,
}: {
  doc: LessonDocument;
  nodeId: string;
  depth: number;
}) {
  const node = doc.nodes[nodeId];
  if (!node) {
    return null;
  }

  if (node.type === "section") {
    return (
      <section className={depth > 0 ? "mt-10 space-y-6" : "space-y-6"}>
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">
            {node.title}
          </h2>
          {node.summary ? (
            <p className="mt-2 text-muted-foreground">{node.summary}</p>
          ) : null}
        </div>
        {node.children.map((childId) => (
          <StudentBlockTree
            depth={depth + 1}
            doc={doc}
            key={childId}
            nodeId={childId}
          />
        ))}
      </section>
    );
  }

  if (node.type === "objectives") {
    return (
      <Card>
        <CardContent className="space-y-2 p-6">
          <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
            {node.title ?? "Objectives"}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
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
    const cite = citationForText(doc, node.citationIds);
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          {node.title ? (
            <h3 className="font-semibold text-lg">{node.title}</h3>
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {node.body}
          </p>
          {cite ? (
            <div className="flex justify-end">
              <SourcePopover citation={cite} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (node.type === "media") {
    return (
      <figure className="overflow-hidden rounded-xl border border-border/80 bg-muted/20">
        {node.asset?.url && node.modality === "image" ? (
          <Image
            alt={node.alt}
            className="max-h-[420px] w-full object-cover"
            height={node.asset.height ?? 600}
            src={node.asset.url}
            unoptimized
            width={node.asset.width ?? 800}
          />
        ) : null}
        {node.asset?.url && node.modality === "video" ? (
          <video
            className="max-h-[460px] w-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
            src={node.asset.url}
          >
            <track kind="captions" />
          </video>
        ) : null}
        {node.asset?.url && node.modality === "audio" ? (
          <div className="bg-background p-4">
            <audio
              className="w-full"
              controls
              preload="none"
              src={node.asset.url}
            >
              <track kind="captions" />
            </audio>
          </div>
        ) : null}
        {node.asset?.url ? null : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Media unavailable
          </div>
        )}
        <figcaption className="border-border/60 border-t px-4 py-2 text-muted-foreground text-xs">
          {node.alt}
          {node.provenance?.provider === "fal" ? (
            <Badge className="ml-2" variant="outline">
              AI-generated
            </Badge>
          ) : null}
        </figcaption>
      </figure>
    );
  }

  if (node.type === "quiz") {
    return <QuizRuntime node={node} />;
  }

  if (node.type === "activity") {
    return <ActivityRuntime node={node} />;
  }

  if (node.type === "reflection") {
    return <ReflectionPrompt node={node} />;
  }

  return null;
}

export function LessonPageShell({ doc }: { doc: LessonDocument }) {
  const root = doc.nodes[doc.root];
  const childIds = root?.type === "section" ? root.children : [];

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-12">
        <header className="space-y-3">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Student lesson
          </p>
          <h1 className="font-semibold text-4xl tracking-tight">{doc.title}</h1>
          <div className="flex flex-wrap gap-2 text-muted-foreground text-sm">
            {doc.gradeBand ? <span>{doc.gradeBand}</span> : null}
            {doc.durationMinutes ? (
              <span>
                {doc.gradeBand ? "·" : null} ~{doc.durationMinutes} min
              </span>
            ) : null}
          </div>
        </header>
        <Separator />
        <div className="space-y-10">
          {childIds.map((id) => (
            <StudentBlockTree depth={0} doc={doc} key={id} nodeId={id} />
          ))}
        </div>
        {doc.citations.length ? (
          <footer className="border-border/70 border-t pt-8">
            <h2 className="font-medium text-sm">Sources</h2>
            <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
              {doc.citations.map((c) => (
                <li key={c.id}>
                  <a
                    className="text-primary underline-offset-2 hover:underline"
                    href={c.url}
                  >
                    {c.title ?? c.url}
                  </a>
                </li>
              ))}
            </ul>
          </footer>
        ) : null}
      </div>
      <FloatingLessonVoiceAgent context={contextFromLessonDocument(doc)} />
    </>
  );
}
