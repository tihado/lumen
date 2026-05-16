import { ArrowRight, Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.55_0.2_264/0.25),transparent)]" />
      <header className="relative z-10 border-border/60 border-b bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <span className="font-semibold text-sm tracking-tight">
            Canvas Teacher AI
          </span>
          <div className="flex items-center gap-2">
            <Link
              className={buttonVariants({ size: "sm", variant: "ghost" })}
              href="/lessons"
            >
              Saved lessons
            </Link>
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href="/studio"
            >
              Open studio
            </Link>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-16">
        <div className="max-w-2xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 font-medium text-muted-foreground text-xs">
            <Sparkles className="size-3.5 text-primary" />
            Provider demo — Tavily, Pioneer, fal, SLNG
          </p>
          <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
            Speak a lesson. Watch the canvas fill with grounded, editable
            blocks.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Structured multimedia lessons with citations, media provenance, and
            a student preview — built for demos and hackathon judging.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex gap-2"
              )}
              href="/studio"
            >
              Start in studio
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              href="/lessons"
            >
              View saved lessons
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <Mic className="size-5 text-primary" />
              <CardTitle className="text-base">Voice-first</CardTitle>
              <CardDescription>
                Push-to-talk SLNG when configured; typed transcript fallback for
                reliable demos.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <Sparkles className="size-5 text-primary" />
              <CardTitle className="text-base">Grounded content</CardTitle>
              <CardDescription>
                Tavily search with visible excerpts and citation cards on the
                canvas.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <ArrowRight className="size-5 text-primary" />
              <CardTitle className="text-base">Saved previews</CardTitle>
              <CardDescription>
                Save to Postgres and open a guided student lesson at{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  /lesson/[id]
                </code>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
