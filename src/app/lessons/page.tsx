import { BookOpen, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listLessons } from "@/lib/lesson/repository";
import { cn } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  let rows: Awaited<ReturnType<typeof listLessons>> = [];
  let error: string | null = null;
  try {
    rows = await listLessons();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
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

      {error ? (
        <Card>
          <CardContent className="p-6 text-destructive text-sm">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
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
          <Card key={lesson.id}>
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
              <Link
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "shrink-0"
                )}
                href={`/lesson/${lesson.id}`}
              >
                Open
                <ExternalLink className="size-3.5" />
              </Link>
            </CardHeader>
          </Card>
        ))}
      </div>
    </main>
  );
}
