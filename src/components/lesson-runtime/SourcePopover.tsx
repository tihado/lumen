"use client";

import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Citation } from "@/lib/lesson/schema";

type SourcePopoverProps = {
  citation: Citation;
};

export function SourcePopover({ citation }: SourcePopoverProps) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <BookMarked className="size-4" />
        Source
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{citation.title ?? "Source"}</DialogTitle>
          <DialogDescription>
            Open the original page for full context (excerpt shown below may be
            shortened).
          </DialogDescription>
        </DialogHeader>
        <a
          className="break-all text-primary text-sm underline-offset-2 hover:underline"
          href={citation.url}
          rel="noreferrer"
          target="_blank"
        >
          {citation.url}
        </a>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {citation.excerpt}
        </p>
      </DialogContent>
    </Dialog>
  );
}
