"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LessonDocument } from "@/lib/lesson/schema";

type SourcesDrawerProps = {
  doc: LessonDocument;
};

export function SourcesDrawer({ doc }: SourcesDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button className="gap-2" size="sm" type="button" variant="outline" />
        }
      >
        <BookOpen className="size-4" />
        Sources ({doc.citations.length})
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>Citations</SheetTitle>
          <SheetDescription>
            Tavily-backed excerpts attached to this lesson draft.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-4 min-h-0 flex-1 pr-3">
          <div className="space-y-4 pb-6">
            {doc.citations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No citations yet.</p>
            ) : (
              doc.citations.map((c) => (
                <article
                  className="space-y-2 rounded-lg border border-border/80 bg-muted/30 p-3 text-sm"
                  key={c.id}
                >
                  <p className="font-medium text-xs">
                    {c.title ?? "Source"}{" "}
                    <span className="text-muted-foreground">
                      ({c.provider})
                    </span>
                  </p>
                  <a
                    className="break-all text-primary text-xs underline-offset-2 hover:underline"
                    href={c.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {c.url}
                  </a>
                  <p className="text-muted-foreground leading-relaxed">
                    {c.excerpt}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Retrieved {c.retrievedAt}
                  </p>
                </article>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
