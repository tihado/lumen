"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { LessonNode } from "@/lib/lesson/schema";

type ReflectionPromptProps = {
  node: Extract<LessonNode, { type: "reflection" }>;
};

export function ReflectionPrompt({ node }: ReflectionPromptProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{node.title ?? "Reflection"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">{node.prompt}</p>
        <Textarea
          className="min-h-[100px]"
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a short response…"
          value={value}
        />
        <Button
          disabled={!value.trim() || submitted}
          onClick={() => setSubmitted(true)}
          type="button"
        >
          {submitted ? "Saved locally (demo)" : "Submit reflection"}
        </Button>
      </CardContent>
    </Card>
  );
}
