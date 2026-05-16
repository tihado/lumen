"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonNode } from "@/lib/lesson/schema";
import { cn } from "@/lib/utils";

type ActivityRuntimeProps = {
  node: Extract<LessonNode, { type: "activity" }>;
};

export function ActivityRuntime({ node }: ActivityRuntimeProps) {
  const [revealed, setRevealed] = useState(false);
  const [classified, setClassified] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  if (node.kind === "ordering" && node.steps?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {node.title ?? "Worked example"}
          </CardTitle>
          {node.instruction ? (
            <p className="text-muted-foreground text-sm">{node.instruction}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {node.steps.map((s, i) => (
            <div key={s.id}>
              <Button
                className="h-auto w-full justify-start py-3 text-left"
                onClick={() => setRevealed(true)}
                type="button"
                variant="outline"
              >
                <Badge className="mr-2" variant="secondary">
                  {i + 1}
                </Badge>
                <span
                  className={cn(!revealed && i > 0 && "select-none blur-sm")}
                >
                  {s.text}
                </span>
              </Button>
            </div>
          ))}
          <p className="text-muted-foreground text-xs">
            Tap step 1, then reveal next steps progressively.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (node.kind === "matching" && node.pairs?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{node.title ?? "Matching"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {node.pairs.map((p) => (
            <div
              className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm"
              key={p.id}
            >
              <p className="font-medium">{p.term}</p>
              <p className="text-muted-foreground">{p.definition}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (node.kind === "classification" && node.items?.length) {
    const categories = node.categories ?? [];
    const answeredCount = node.items.filter((it) => classified[it.id]).length;
    const correctCount = node.items.filter(
      (it) => classified[it.id] === it.categoryId
    ).length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {node.title ?? "Classification"}
          </CardTitle>
          {node.instruction ? (
            <p className="text-muted-foreground text-sm">{node.instruction}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {node.items.map((it) => (
            <div
              className="space-y-3 rounded-lg border border-border/70 px-3 py-3 text-sm"
              key={it.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium">{it.label}</span>
                {checked ? (
                  <Badge
                    variant={
                      classified[it.id] === it.categoryId
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {classified[it.id] === it.categoryId
                      ? "Correct"
                      : `Answer: ${
                          categories.find((c) => c.id === it.categoryId)
                            ?.label ?? it.categoryId
                        }`}
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    onClick={() => {
                      setClassified((prev) => ({
                        ...prev,
                        [it.id]: category.id,
                      }));
                      setChecked(false);
                    }}
                    size="sm"
                    type="button"
                    variant={
                      classified[it.id] === category.id
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              disabled={answeredCount < node.items.length}
              onClick={() => setChecked(true)}
              size="sm"
              type="button"
            >
              Check sorting
            </Button>
            {checked ? (
              <p className="text-muted-foreground text-sm">
                {correctCount}/{node.items.length} sorted correctly. Revise any
                card that did not fit.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Choose a category for every card before checking.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 text-muted-foreground text-sm">
        Activity type not available in this preview.
      </CardContent>
    </Card>
  );
}
