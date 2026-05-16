"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonNode } from "@/lib/lesson/schema";
import { cn } from "@/lib/utils";

type QuizRuntimeProps = {
  node: Extract<LessonNode, { type: "quiz" }>;
};

export function QuizRuntime({ node }: QuizRuntimeProps) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const items = useMemo(() => node.items, [node.items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{node.title ?? "Quiz"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((q) => {
          const choice = picked[q.id];
          const show = revealed[q.id];
          const correct = choice === q.answer;
          return (
            <div
              className="space-y-3 border-border/60 border-b pb-6 last:border-0"
              key={q.id}
            >
              <p className="font-medium">{q.stem}</p>
              <div className="flex flex-col gap-2">
                {q.choices?.map((c) => (
                  <Button
                    className="h-auto justify-start whitespace-normal py-2 text-left"
                    key={c}
                    onClick={() =>
                      setPicked((prev) => ({ ...prev, [q.id]: c }))
                    }
                    type="button"
                    variant={choice === c ? "secondary" : "outline"}
                  >
                    {c}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!choice}
                  onClick={() =>
                    setRevealed((prev) => ({ ...prev, [q.id]: true }))
                  }
                  size="sm"
                  type="button"
                  variant="default"
                >
                  Check answer
                </Button>
                {show ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-sm",
                      correct ? "text-emerald-600" : "text-amber-700"
                    )}
                  >
                    {correct ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                    {correct
                      ? "Nice work."
                      : "Not quite — see explanation below."}
                  </span>
                ) : null}
              </div>
              {show && q.explanation ? (
                <p className="rounded-lg bg-muted/60 p-3 text-muted-foreground text-sm leading-relaxed">
                  {q.explanation}
                </p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
