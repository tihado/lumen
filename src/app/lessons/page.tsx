import { BookOpen, Clock, Database, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppEnv, getDatabaseAvailability } from "@/lib/env";
import { listLessons } from "@/lib/lesson/repository";
import { cn } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  let rows: Awaited<ReturnType<typeof listLessons>> = [];
  let error: string | null = null;
  const database = getDatabaseAvailability(getAppEnv());

  if (database.configured) {
    try {
      rows = await listLessons();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(oklch(0.42_0.05_180/0.045)_1px,transparent_1px),linear-gradient(90deg,oklch(0.42_0.05_180/0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/50 px-4 py-4 shadow-sm backdrop-blur-xl">
        <div>
          <p className="font-medium text-primary text-xs uppercase tracking-wide">
            Saved lessons
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">
            Saved lessons
          </h1>
        </div>
        <Link className={buttonVariants({ variant: "outline" })} href="/studio">
          Create lesson
        </Link>
      </div>

      {database.configured ? null : (
        <Card className="bg-white/82">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <Database className="size-7" />
            </div>
            <div>
              <p className="font-medium">Database setup needed</p>
              <p className="mt-1 max-w-xl text-muted-foreground text-sm">
                {database.message}
              </p>
              <p className="mt-2 max-w-xl font-medium text-muted-foreground text-xs">
                {database.action}
              </p>
            </div>
            <Link className={buttonVariants()} href="/studio">
              Back to Studio
            </Link>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="bg-white/82">
          <CardContent className="p-6 text-destructive text-sm">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 && !error && database.configured ? (
        <Card className="bg-white/82">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
              <BookOpen className="size-7" />
            </div>
            <p className="text-muted-foreground text-sm">
              No lessons have been saved in Postgres yet.
            </p>
            <Link className={buttonVariants()} href="/studio">
              Generate first lesson
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {rows.map((lesson) => (
          <Card
            className="bg-white/82 transition-transform hover:-translate-y-0.5"
            key={lesson.id}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="line-clamp-2 text-lg">
                  {lesson.title}
                </CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                  <Badge
                    variant={
                      lesson.status === "ready" ? "secondary" : "outline"
                    }
                  >
                    {lesson.status}
                  </Badge>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {lesson.createdAt.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <Link
                  className={cn(
                    buttonVariants({ size: "sm", variant: "ghost" })
                  )}
                  href={`/studio?lessonId=${encodeURIComponent(lesson.id)}`}
                >
                  Studio
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" })
                  )}
                  href={`/lesson/${lesson.id}`}
                >
                  Open
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  );
}
