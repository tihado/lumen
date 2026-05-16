"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LessonPageShell } from "@/components/lesson-runtime/LessonPageShell";
import { buttonVariants } from "@/components/ui/button";
import type { LessonDocument } from "@/lib/lesson/schema";
import { loadLessonForPreview } from "@/lib/lesson/storage";
import { cn } from "@/lib/utils";

export function LessonPreviewClient({ lessonId }: { lessonId: string }) {
  const [doc, setDoc] = useState<LessonDocument | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setDoc(loadLessonForPreview(lessonId));
    setChecked(true);
  }, [lessonId]);

  if (!checked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground text-sm">
        Loading lesson…
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-20 text-center">
        <h1 className="font-semibold text-2xl">Lesson not found</h1>
        <p className="text-muted-foreground text-sm">
          Publish from the studio first, or open the built-in{" "}
          <Link className="text-primary underline" href="/lesson/demo">
            demo lesson
          </Link>
          .
        </p>
        <Link
          className={cn(buttonVariants({ variant: "outline" }))}
          href="/studio"
        >
          Back to studio
        </Link>
      </div>
    );
  }

  return <LessonPageShell doc={doc} />;
}
