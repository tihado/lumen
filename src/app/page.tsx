import {
  ArrowRight,
  BookOpenCheck,
  FlaskConical,
  LibraryBig,
  Mic,
  Palette,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";
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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_12%_14%,oklch(0.92_0.12_55/0.78),transparent_30%),radial-gradient(circle_at_84%_10%,oklch(0.86_0.11_190/0.7),transparent_28%),radial-gradient(circle_at_70%_88%,oklch(0.91_0.11_332/0.55),transparent_34%),linear-gradient(135deg,oklch(0.99_0.025_105),oklch(0.975_0.04_171)_48%,oklch(0.985_0.038_215))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(oklch(0.35_0.07_185/0.055)_1px,transparent_1px),linear-gradient(90deg,oklch(0.35_0.07_185/0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <div className="pointer-events-none absolute top-24 -left-8 size-24 rounded-full border-[18px] border-[oklch(0.82_0.14_76/0.28)]" />
      <div className="pointer-events-none absolute top-8 -right-10 size-36 rounded-full border-[22px] border-[oklch(0.82_0.12_201/0.24)]" />

      <header className="relative z-10 px-3 pt-4 sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-white/75 bg-white/62 px-4 py-3 shadow-[0_24px_80px_oklch(0.42_0.08_180/0.16)] ring-1 ring-foreground/5 backdrop-blur-2xl">
          <Link className="flex items-center gap-3" href="/">
            <span className="studio-bob flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,oklch(0.74_0.15_172),oklch(0.83_0.14_88))] text-white shadow-[0_14px_30px_oklch(0.55_0.12_170/0.22)]">
              <FlaskConical className="size-5" />
            </span>
            <span>
              <span className="block font-medium text-[0.64rem] text-primary uppercase tracking-[0.18em]">
                Lesson maker
              </span>
              <span className="block font-semibold text-lg tracking-tight">
                Lumen Studio
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "ghost" }),
                "gap-2"
              )}
              href="/lessons"
            >
              <LibraryBig className="size-3.5" />
              Saved
            </Link>
            <Link
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "gap-2 border-white/80 bg-white/70"
              )}
              href="/studio"
            >
              <WandSparkles className="size-3.5" />
              Open
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:py-14">
        <section className="grid min-h-[calc(100vh-9rem)] items-center gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
          <div className="max-w-2xl space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-1 font-medium text-muted-foreground text-xs shadow-sm backdrop-blur-xl">
              <Sparkles className="size-3.5 text-primary" />
              Provider demo with Tavily, Pioneer, fal, and SLNG
            </p>
            <div className="space-y-3">
              <h1 className="text-balance font-semibold text-5xl tracking-tight sm:text-6xl">
                Lumen Studio
              </h1>
              <p className="max-w-xl text-balance font-medium text-2xl tracking-tight sm:text-3xl">
                A cute, voice-first workshop for lessons that glow up fast.
              </p>
            </div>
            <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
              Speak a rough idea, watch the canvas fill with grounded blocks,
              then polish the lesson into a student-ready preview.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-10 gap-2 rounded-2xl bg-[linear-gradient(135deg,oklch(0.68_0.14_174),oklch(0.78_0.16_83))] px-4 shadow-[0_16px_34px_oklch(0.58_0.13_150/0.24)] hover:brightness-105"
                )}
                href="/studio"
              >
                Start making
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-10 gap-2 rounded-2xl border-white/80 bg-white/70"
                )}
                href="/lessons"
              >
                <LibraryBig className="size-4" />
                Saved lessons
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-5 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,oklch(0.91_0.12_74/0.5),transparent_34%),radial-gradient(circle_at_80%_80%,oklch(0.83_0.12_190/0.42),transparent_35%)] blur-xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/68 p-4 shadow-[0_24px_80px_oklch(0.42_0.08_180/0.16)] ring-1 ring-foreground/5 backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,oklch(0.78_0.17_48),oklch(0.76_0.15_170),oklch(0.78_0.15_330))]" />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-white/80 text-primary shadow-sm">
                    <BookOpenCheck className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-[0.68rem] text-primary uppercase tracking-[0.16em]">
                      Live canvas
                    </p>
                    <p className="font-semibold tracking-tight">
                      Solar system adventure
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground text-xs">
                  <span className="studio-pulse size-2 rounded-full bg-primary" />
                  ready
                </span>
              </div>

              <div className="space-y-3 rounded-[1.5rem] bg-[radial-gradient(circle_at_20%_18%,oklch(0.9_0.1_73/0.26),transparent_22%),radial-gradient(circle_at_82%_35%,oklch(0.88_0.1_190/0.2),transparent_24%),linear-gradient(oklch(0.42_0.05_180/0.04)_1px,transparent_1px),linear-gradient(90deg,oklch(0.42_0.05_180/0.035)_1px,transparent_1px)] bg-[size:auto,auto,32px_32px,32px_32px] p-3">
                <div className="rounded-2xl border border-white/80 bg-white/86 p-3 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mic className="size-4" />
                    </span>
                    <p className="font-medium text-sm">Lesson intent</p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    “20 minutes, grade 5, planets, include a tiny quiz.”
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/80 bg-white/86 p-3 shadow-sm">
                    <Palette className="mb-3 size-5 text-primary" />
                    <p className="font-medium text-sm">Media plan</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Cozy classroom-safe visuals with provenance.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/86 p-3 shadow-sm">
                    <Play className="mb-3 size-5 text-primary" />
                    <p className="font-medium text-sm">Build trail</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Each provider step appears as it completes.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/25 border-dashed bg-[linear-gradient(135deg,oklch(0.97_0.04_95/0.82),oklch(0.96_0.035_185/0.7))] p-3">
                  <p className="font-medium text-sm">Student preview</p>
                  <div className="mt-2 h-2 rounded-full bg-white/80">
                    <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,oklch(0.68_0.14_174),oklch(0.78_0.16_83))]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-white/80 bg-white/80" size="sm">
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                <Mic className="size-5" />
              </div>
              <CardTitle className="text-base">Voice-first</CardTitle>
              <CardDescription>
                Push-to-talk SLNG when configured; typed transcript fallback for
                reliable demos.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/80 bg-white/80" size="sm">
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="text-base">Grounded content</CardTitle>
              <CardDescription>
                Tavily search with visible excerpts and citation cards on the
                canvas.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-white/80 bg-white/80" size="sm">
            <CardHeader>
              <div className="flex size-9 items-center justify-center rounded-xl bg-[oklch(0.93_0.06_205)] text-primary">
                <ArrowRight className="size-5" />
              </div>
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
