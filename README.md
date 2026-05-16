# Lumen

> **Not a wall of text. A canvas you can teach with.**

**Lumen** is a **voice-first lesson authoring** web app. A teacher speaks or types a lesson intent; the **Next.js** server orchestrates **OpenAI**, **Tavily**, **Pioneer**, **fal**, and **SLNG**, streams progress to the browser as **NDJSON**, and fills an **editable canvas** backed by **PostgreSQL** (Drizzle). Missing API keys gracefully fall back to deterministic demo content so you can still explore the UI.

<p align="center">
  <img src="imgs/dashboard.png" alt="Lumen home and dashboard" width="580"><br>
  <img src="imgs/class.png" alt="Lumen studio and lesson canvas" width="580">
</p>


---

## Hackathon sponsors & API credits

These partners power the hackathon stack.

### Sponsors used in this codebase

| Sponsor | Role in Lumen | Code / configuration |
| -------- | ------------- | --------------------- |
| [**OpenAI**](https://openai.com) | Frontier models — structured lesson JSON, utilities via AI SDK (`@ai-sdk/openai`), `/api/openai` | `OPENAI_API_KEY`, optional `OPENAI_MODEL`, `OPENAI_CODE_MODEL` |
| [**Tavily**](https://www.tavily.com/) | Real-time search and excerpts for grounded lesson content | `TAVILY_API_KEY` → `src/lib/orchestrator/providers/tavily.ts` |
| [**Pioneer**](https://pioneer.ai/) by [**Fastino**](https://fastino.ai/) | Entity / schema extraction (`POST …/inference`) | `PIONEER_API_URL`, `PIONEER_API_KEY`, optional `PIONEER_MODEL_ID` → `src/lib/orchestrator/providers/pioneer.ts` |
| [**fal**](https://fal.ai/) | Generative **images** and **videos** for lesson media | `FAL_KEY` or `FAL_API_KEY`, optional `FAL_IMAGE_MODEL`, `FAL_VIDEO_MODEL` → `src/lib/orchestrator/providers/fal.ts` |
| [**SLNG**](https://slng.ai/) | Global voice infrastructure — **STT** + **TTS** on the server | `SLNG_API_KEY` + `SLNG_API_BASE_URL`, optional `SLNG_STT_MODEL`, `SLNG_TTS_MODEL` → `src/lib/orchestrator/providers/slng.ts` |

**Optional (not a “sponsor” API, but used in repo):** **AWS S3**-compatible storage for durable media URLs — `S3_*` / `AWS_*` env vars in [`src/lib/env.ts`](./src/lib/env.ts).

---

## Architecture

<p align="center">
  <img src="imgs/architecture.png" alt="Lumen architecture diagram" width="780">
</p>

### Next.js App Router

| Piece | Responsibility |
| ----- | ---------------- |
| **`src/app/studio/`** | Teacher workspace: transcript, NDJSON consumer, canvas, save/publish flow |
| **`src/app/api/*/route.ts`** | **Route Handlers** — no provider secrets in the browser |
| **`src/lib/orchestrator/generate-lesson.ts`** | Stages: Tavily → Pioneer → OpenAI plan → fal media → SLNG narration metadata; yields `StreamEvent`s |
| **`src/db/`** | **Drizzle** + **postgres** driver — lessons, versions, generation runs |

When **S3** env vars are set, generated **fal** assets and **SLNG** audio can be mirrored for stable `https` URLs (see `src/lib/media/s3-storage.ts`).

### NDJSON generation stream

`POST /api/generate` returns **`application/x-ndjson`**: one JSON object per line. The studio parses each line as a `StreamEvent` (`run_started`, `provider_*`, `lesson_patch`, `lesson_snapshot`, `run_completed`, `run_failed`) — see [`src/lib/orchestrator/stream-events.ts`](./src/lib/orchestrator/stream-events.ts).

---

## Key features

| Feature | Description |
| ------- | ----------- |
| **Voice & transcript** | Browser capture + **`/api/voice/transcribe`** (SLNG); typed fallback always available |
| **Live provider timeline** | See Tavily, Pioneer, OpenAI, fal, SLNG steps complete with **live vs fallback** badges |
| **Editable canvas** | Patch-driven lesson document; regenerate media per block where supported |
| **Persisted lessons** | Save drafts and browse history under **`/lessons`** |
| **Deterministic fallbacks** | Run without external keys for UI demos (quality limited) |
| **Optional S3 mirror** | Longer-lived URLs for images, video, and TTS audio |

---

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| **Framework** | [Next.js](https://nextjs.org/) **16.2** (App Router), **Turbopack** dev |
| **UI** | [React](https://react.dev/) **19.2**, [Tailwind CSS](https://tailwindcss.com/) **v4**, [`@base-ui/react`](https://base-ui.com/react/overview/quick-start) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) **5.9** |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai/docs) — `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/fal` |
| **Data** | [Drizzle ORM](https://orm.drizzle.team/) + [`postgres`](https://github.com/porsager/postgres) |
| **Validation** | [Zod](https://zod.dev/) **4.x** |
| **Tooling** | [pnpm](https://pnpm.io/) **11.x**, [Biome](https://biomejs.dev/) via [Ultracite](https://github.com/haydenbleasel/ultracite), [Vitest](https://vitest.dev/), [Lefthook](https://github.com/evilmartians/lefthook) |

> **Heads-up:** This project uses a **non-standard Next.js** line. Read `node_modules/next/dist/docs/` and [`AGENTS.md`](./AGENTS.md) before relying on framework behavior from memory.

---

## Usage

1. **Install** dependencies and configure **`.env.local`** (see [Environment variables](#environment-variables)).
2. **Migrate** the database if you use persistence (`pnpm run db:migrate`).
3. Run **`pnpm dev`** and open [http://localhost:3000](http://localhost:3000).
4. Go **`/studio`**, enter or dictate a lesson prompt, and **Run generation**.
5. Watch the **NDJSON stream** fill the canvas; edit blocks as needed.
6. **Save** your work and open **`/lessons`** to browse saved lessons.

---

## Quick start

### Requirements

- **Node.js** 20+ (recommended for Next.js 16)
- **pnpm** — enable with `corepack enable` to match the pinned version in `package.json`
- **PostgreSQL** — required when using `DATABASE_URL` and persisted lessons

### Setup

1. **Clone & install**

   ```bash
   git clone https://github.com/tihado/next-learn.git
   cd next-learn
   corepack enable
   pnpm install
   ```

2. **Environment** — create **`.env.local`** in the project root:

   | Variable | When needed |
   | -------- | ----------- |
   | `DATABASE_URL` | **Required** for DB-backed flows (`getDb()` throws if missing) |
   | `OPENAI_API_KEY` | Live structured lesson generation |
   | `TAVILY_API_KEY` | Live web search excerpts |
   | `PIONEER_API_URL` + `PIONEER_API_KEY` | Live entity extraction (`PIONEER_MODEL_ID` optional) |
   | `FAL_KEY` or `FAL_API_KEY` | Live image/video |
   | `SLNG_API_KEY` + `SLNG_API_BASE_URL` | Live STT/TTS |
   | `S3_*`, `AWS_*` | Optional media mirroring |

   Full list and semantics: [`src/lib/env.ts`](./src/lib/env.ts).

3. **Database**

   ```bash
   export DATABASE_URL="postgres://user:pass@localhost:5432/lumen"
   pnpm run db:migrate
   ```

4. **Develop**

   ```bash
   pnpm dev
   ```

5. **Quality**

   ```bash
   pnpm test
   pnpm run format
   ```

---

## HTTP API reference

| Method & path | Body / query | Response |
| ------------- | ------------ | -------- |
| `POST /api/generate` | `{ transcript, lessonId? }` | **NDJSON** stream (`maxDuration` 120s) |
| `POST /api/media` | `{ prompt, modality?: "image"\|"video" }` | JSON `{ asset, usedFallback, … }` |
| `GET /api/audio?text=` | query `text` | SLNG TTS bytes or redirect to S3 |
| `POST /api/audio` | `{ text }` | SLNG TTS bytes |
| `POST /api/voice/transcribe` | `multipart/form-data` field `audio` | JSON transcript |
| `POST /api/openai` | `{ mode: "text"\|"json"\|"code", prompt }` | Generated payload |
| `GET /api/lessons` | — | `{ lessons: [...] }` |
| `GET /api/lessons/[lessonId]` | — | Lesson + current version |
| `POST /api/lessons/[lessonId]/regenerate` | optional `{ prompt }` | Refreshed lesson JSON |

Implementation: `src/app/api/**/route.ts`.

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build & serve |
| `pnpm test` | Vitest (`src/**/*.test.ts`) |
| `pnpm run format` | Ultracite (Biome) |
| `pnpm run db:generate` / `pnpm run db:migrate` | Drizzle migrations |

---

## Documentation

| Document | Description |
| -------- | ----------- |
| [`docs/PROJECT.md`](./docs/PROJECT.md) | Full product & technical specification |
| [`docs/CURRENT.md`](./docs/CURRENT.md) | Current progress notes |
| [`docs/PLAN.md`](./docs/PLAN.md) | Delivery / hackathon plan |
| [`AGENTS.md`](./AGENTS.md) | Next.js version caveat for agents & contributors |

---

## Project structure

```text
src/
  app/
    api/                      # Route Handlers (generate, media, audio, voice, openai, lessons)
    studio/                   # Teacher workspace
    lessons/                  # Saved lessons list
    page.tsx                  # Marketing home
  components/                 # UI + canvas + voice
  db/                         # Drizzle schema + client
  lib/
    orchestrator/             # generate-lesson stream + providers (openai, tavily, pioneer, fal, slng)
    lesson/                   # schema, patches, repository, studio state
    media/                    # S3 helpers
docs/                         # PROJECT, PLAN, CURRENT
imgs/                         # README: PNG screenshots + SVG (logo, architecture)
drizzle/                      # SQL migrations (generated)
scripts/                      # maintenance scripts
```

Path alias: `@/*` → `./src/*` ([`tsconfig.json`](./tsconfig.json)).

---

## Deployment notes

- Set the same **environment variables** on your host (**Vercel**, Docker, etc.).
- Respect **`maxDuration`** on long orchestration routes.
- Configure **S3 CORS** if browsers must fetch uploaded objects cross-origin.

---

## Contributors

Everyone below is from **`git shortlog -sne --all`** (counts include all branches). GitHub links use the **git author name** as `@handle`, except where we can infer from `users.noreply.github.com`—if yours is wrong, send a PR to fix it.

| # | Author (git) | Commits | GitHub |
|---|----------------|--------:|--------|
| 1 | **nvti** | 16 | [@nvti](https://github.com/nvti) |
| 2 | **NLag** | 9 | [@NLag](https://github.com/NLag) |
| 3 | **honghanhh** | 5 | [@honghanhh](https://github.com/honghanhh) |
| 4 | **lanwyb** | 3 | [@lanwyb](https://github.com/lanwyb) |

Refresh locally:

```bash
git shortlog -sne --all
```

Upstream repo: [tihado/next-learn](https://github.com/tihado/next-learn).

---

## License

No `LICENSE` file is present in this repository root yet. Add one for your team’s terms; until then, default repository hosting rules apply on GitHub.
