# Lumen

## Recognition

- **3rd Prize** — {Tech: Europe} Paris AI Hackathon, 5/2026
- **Sponsor Award** — [SLNG](https://slng.ai/)

---

> **Not a wall of text. A canvas you can teach with.**

**Lumen** is a **voice-first AI lesson authoring** web app. A teacher speaks or types a lesson intent, and Lumen turns it into a structured lesson canvas: learning objectives, hook, explanation, worked example, practice activity, quiz, reflection, citations, images, video, audio narration, and a saved HTML lesson that can be reopened later.

The core idea is not simply “ask an LLM for text.” Lumen behaves like an **AI lesson agent**: it captures intent, gathers sources, extracts entities, plans the lesson, storyboards media, generates multimodal assets, streams patches into the UI, and persists the full state in PostgreSQL so teachers can review, edit, and reuse the result. The **SLNG Voice Agent** path also lets the teacher open a live voice session for rehearsal feedback with lesson context.

<p align="center">
  <img src="imgs/dashboard.png" alt="Lumen home and dashboard" width="580"><br>
  <img src="imgs/class.png" alt="Lumen studio and lesson canvas" width="580">
</p>

---

## Sponsor Integrations

Lumen is built as a sponsor-aware AI pipeline. Each sponsor product is visible in the generation timeline, has a specific job in the lesson agent, and degrades gracefully when the key is missing.

| Sponsor                                                          | What we use                                     | How Lumen uses it                                                                                                                                                                                                                                                                                | What is special here                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAI](https://openai.com)                                     | AI SDK provider for OpenAI models               | Generates the structured lesson plan and the saved lesson runtime. The planner returns a Zod-validated object with objectives, vocabulary, explanation, lecture script, activity, quiz, teacher tips, and media plan. The runtime step can generate inline JavaScript for the final HTML lesson. | We do not use OpenAI as a one-shot essay writer. OpenAI acts as the planning and runtime-coding brain inside a larger agent loop, with schema validation, provider status events, and fallback behavior. |
| [Tavily](https://www.tavily.com/)                                | Search API for grounded classroom research      | Runs lesson-specific research queries for explanation material, student misconceptions, examples, and citations. Search excerpts become source cards and can be attached to generated lesson content.                                                                                            | Tavily turns the lesson from generic AI output into a grounded teaching artifact with citations and misconception-aware context.                                                                         |
| [Pioneer](https://pioneer.ai/) by [Fastino](https://fastino.ai/) | Fastino GLiNER2-style entity extraction         | Extracts important concepts, vocabulary, entities, and slots from the teacher transcript plus research context. These extracted terms sharpen the planner prompt and help build a more focused lesson schema.                                                                                    | Pioneer gives the agent a lightweight structure-discovery step before planning, so the lesson is organized around teachable concepts instead of only raw prose.                                          |
| [fal](https://fal.ai/)                                           | Image and video generation                      | Generates storyboarded visual assets for specific instructional moments. Lumen stores prompt, model, provider, status, and provenance for each generated image or video, and lets the teacher retry media blocks.                                                                                | fal is used as a multimodal asset factory attached to schema nodes, not as decoration. Each asset belongs to a lesson block and carries enough provenance to inspect or regenerate it.                   |
| [SLNG](https://slng.ai/)                                         | Speech-to-text, text-to-speech, and Voice Agent | Transcribes teacher voice input, generates narration audio, and creates LiveKit-backed SLNG Voice Agent web sessions through `/api/voice/agent-session`. The agent receives `lesson_title`, `lesson_summary`, transcript, and product context for rehearsal.                                     | SLNG is the human interface layer: voice in for authoring, audio out for narration, and a live rehearsal agent that can ask student-style questions after the lesson exists.                             |

### How the Sponsors Work Together

```text
Teacher voice or typed intent
  ↓
SLNG speech-to-text or typed fallback
  ↓
Tavily research and citations
  ↓
Pioneer / Fastino extraction of entities and concepts
  ↓
OpenAI structured lesson planning
  ↓
fal image and video generation for media blocks
  ↓
SLNG narration audio
  ↓
OpenAI runtime generation for saved HTML
  ↓
SLNG Voice Agent rehearsal on the finished lesson
```

The result is not a single model response. It is an orchestrated lesson-building workflow where every sponsor contributes a distinct capability: **voice**, **research**, **structure**, **planning**, **media**, **runtime**, and **rehearsal**.

### Sponsor API Map

| Capability                   | API / route in Lumen                    | Env / code                                                                                                                                            |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI lesson planner        | `POST /api/generate`, `/api/openai`     | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_CODE_MODEL`; `src/lib/orchestrator/providers/llm.ts`                                                        |
| Tavily grounded search       | `POST /api/generate`                    | `TAVILY_API_KEY`; `src/lib/orchestrator/providers/tavily.ts`                                                                                          |
| Pioneer / Fastino extraction | `POST /api/generate`                    | `PIONEER_API_URL`, `PIONEER_API_KEY`, `PIONEER_MODEL_ID`; `src/lib/orchestrator/providers/pioneer.ts`                                                 |
| fal media generation         | `POST /api/generate`, `POST /api/media` | `FAL_KEY` or `FAL_API_KEY`, `FAL_IMAGE_MODEL`, `FAL_VIDEO_MODEL`; `src/lib/orchestrator/providers/fal.ts`                                             |
| SLNG speech-to-text          | `POST /api/voice/transcribe`            | `SLNG_API_KEY`, `SLNG_API_BASE_URL`, `SLNG_STT_MODEL`; `src/lib/orchestrator/providers/slng.ts`                                                       |
| SLNG text-to-speech          | `GET /api/audio`, `POST /api/audio`     | `SLNG_API_KEY`, `SLNG_API_BASE_URL`, `SLNG_TTS_MODEL`; `src/lib/orchestrator/providers/slng.ts`                                                       |
| SLNG Voice Agent web session | `POST /api/voice/agent-session`         | `SLNG_API_KEY`, `SLNG_AGENT_API_BASE_URL`, `SLNG_AGENT_ID`; `src/app/api/voice/agent-session/route.ts`, `src/components/voice/SlngVoiceAgentRoom.tsx` |

Optional storage: S3-compatible media mirroring through `S3_*` / `AWS_*` variables in `src/lib/env.ts`.

---

## Why Lumen?

Many AI tools produce a long block of text, leaving teachers to manually break it into a lesson flow, activity, quiz, media prompts, and classroom materials. Lumen takes a different approach: a lesson is a **schema-backed document**, built incrementally with patches, provenance for generated assets, and a visible provider timeline.

Lumen is useful for:

- Teachers who want to turn a rough idea into a teachable lesson.
- Edtech teams exploring multimodal lesson-generation pipelines.
- Developers studying AI orchestration with Next.js App Router, NDJSON streaming, provider fallbacks, and persistence.
- Hackathon demos that need to keep working even when some provider keys are missing.

---

## Product Overview

Main user flow:

1. Open **Studio** (`/studio`).
2. Speak or type a lesson intent, for example: `I want to learn about the solar system`.
3. Start generation.
4. The browser receives an NDJSON stream from the server and updates the canvas in real time.
5. The teacher can watch provider progress for OpenAI, Tavily, Pioneer, fal, SLNG, and the orchestrator.
6. The canvas renders lesson blocks: text, sections, objectives, activities, quiz, reflection, and media.
7. The user can retry media, edit supported blocks, save the lesson, and reopen it from `/lessons`.
8. From Studio or the saved lesson page, the teacher can start the **SLNG voice agent** to rehearse the lesson, answer student-style questions, and get concrete improvement suggestions.
9. The final lesson is rendered as sandboxed HTML at `/lesson/[lessonId]`.

---

## Key Features

| Feature                      | Description                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Voice-first authoring**    | Captures lesson intent through `/api/voice/transcribe` with SLNG, with typed input always available.                                                                |
| **SLNG voice agent**         | Creates a LiveKit-backed web session through `/api/voice/agent-session` so teachers can rehearse with an agent that receives lesson title, summary, and transcript. |
| **AI lesson agent**          | The orchestrator coordinates research, extraction, planning, media generation, runtime generation, and persistence.                                                 |
| **Live NDJSON stream**       | `/api/generate` returns one event per line so Studio can update the timeline and canvas as each stage completes.                                                    |
| **Editable lesson canvas**   | Lessons are represented as schema-backed documents and patches (`add_node`, `replace_node`, `set_meta`, `set_citations`) instead of one opaque text blob.           |
| **Grounded content**         | Tavily provides search excerpts and citations that can be attached to lesson content.                                                                               |
| **Entity extraction**        | Pioneer/Fastino GLiNER2, or a heuristic fallback, helps the agent identify important terms, concepts, and slots.                                                    |
| **Structured lesson plan**   | OpenAI through the AI SDK generates a Zod-validated lesson plan: objectives, vocabulary, explanation, lecture script, media plan, activity, quiz, and teacher tips. |
| **Generative media**         | fal creates storyboarded image and video assets with provenance, prompts, model names, and `pending/ready/failed` status.                                           |
| **Narration audio**          | SLNG generates TTS audio for the lesson explanation and can mirror it to S3 when storage is configured.                                                             |
| **Sandboxed runtime**        | Lessons are packaged as standalone HTML; the solar-system demo uses a dedicated runtime, while other topics use generated or fallback JavaScript.                   |
| **Persistence & versioning** | PostgreSQL stores `lessons`, `lesson_versions`, and `generation_runs`; each generation can create a new version.                                                    |
| **Graceful fallbacks**       | Missing provider keys degrade output quality but still keep the UI and demo flow usable.                                                                            |

---

## AI Agent Flow

`src/lib/orchestrator/generate-lesson.ts` is the orchestration core. It is an async generator that emits `StreamEvent` objects so the browser can render progress in real time.

```text
User transcript / voice intent
  ↓
SLNG readiness + transcript intake
  ↓
Tavily research
  - classroom explanation query
  - misconception query
  - citations
  ↓
Pioneer extraction
  - entities / concepts / terms
  - heuristic fallback
  ↓
OpenAI lesson planning
  - Zod-validated structured lesson plan
  - objectives, vocabulary, script, activity, quiz, media plan
  ↓
Patch materialization
  - set_meta
  - add_node
  - set_citations
  - lesson_snapshot after each patch
  ↓
fal media generation
  - image/video storyboard assets in parallel
  - optional S3 mirror
  ↓
SLNG narration
  - text-to-speech audio
  - optional S3 upload
  ↓
OpenAI runtime generation
  - inline lesson JavaScript or fallback runtime
  ↓
Sandboxed HTML artifact
  ↓
PostgreSQL saveLessonVersion
  ↓
Browser redirects to /lesson/[lessonId]
```

### Agent Responsibilities

| Stage                  | Provider / module                                            | What it does                                                                        |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Intent intake**      | `src/app/studio/studio-client.tsx`, `VoiceSessionController` | Collects a typed or spoken transcript and sends it to `/api/generate`.              |
| **Provider readiness** | `src/lib/env.ts`                                             | Checks which providers are configured and marks each one as `live` or `fallback`.   |
| **Research**           | `providers/tavily.ts`                                        | Fetches web excerpts for source grounding and misconception context.                |
| **Extraction**         | `providers/pioneer.ts`                                       | Extracts entities and concepts to sharpen vocabulary and lesson focus.              |
| **Planning**           | `providers/llm.ts`                                           | Uses AI SDK + OpenAI to generate a `LessonPlan` that satisfies a Zod schema.        |
| **Document building**  | `src/lib/lesson/patches.ts`, `schema.ts`                     | Converts the plan into a lesson document through patch operations.                  |
| **Media creation**     | `providers/fal.ts`                                           | Generates images and videos for specific instructional moments.                     |
| **Audio creation**     | `providers/slng.ts`                                          | Generates narration audio from the explanation summary.                             |
| **Voice agent**        | `providers/slng.ts`, `/api/voice/agent-session`              | Creates SLNG Voice Agent web sessions and passes lesson context as agent arguments. |
| **Artifact packaging** | `src/lib/lesson/html-artifact.ts`                            | Produces sandboxed HTML plus a spec that can be reopened later.                     |
| **Persistence**        | `src/lib/lesson/repository.ts`, `src/db/schema.ts`           | Saves the lesson, version, and generation run to PostgreSQL.                        |

### SLNG Voice Agent

Lumen uses SLNG in three separate ways:

| SLNG capability         | Path / module                       | What Lumen does                                                                  |
| ----------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Speech-to-text          | `POST /api/voice/transcribe`        | Accepts recorded browser audio and returns a transcript for lesson generation.   |
| Text-to-speech          | `GET /api/audio`, `POST /api/audio` | Generates narration audio for lesson explanations and optional saved artifacts.  |
| Voice agent web session | `POST /api/voice/agent-session`     | Creates a LiveKit session for a configured SLNG Agent and passes lesson context. |

The voice agent is used as a teaching/rehearsal layer, not as the main lesson generator. The route sends these arguments to SLNG when creating the web session: `demo_mode`, `lesson_id`, `lesson_title`, `lesson_summary`, `teacher_transcript`, and `product_context`. The current product context asks the agent to help the teacher rehearse, ask one useful student-style question at a time, and suggest concrete lesson improvements.

For demos, configure the SLNG agent itself in the SLNG dashboard, then set `SLNG_AGENT_ID` in `.env.local`. The app-side session endpoint for the agent is:

```text
POST /api/voice/agent-session
```

That endpoint is called by the Lumen UI; it creates the SLNG web session through `SLNG_AGENT_API_BASE_URL` and returns `livekitUrl`, `livekitToken`, `roomName`, `callId`, and optional `maxSessionSeconds` to the browser. The browser joins the session with `@livekit/components-react`.

### Stream Events

`POST /api/generate` returns `application/x-ndjson`, one JSON event per line:

| Event                | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `run_started`        | Initializes the run and returns `lessonId` plus provider readiness.    |
| `provider_started`   | Indicates that an agent stage has started.                             |
| `provider_completed` | Indicates that a stage finished, including details and `usedFallback`. |
| `lesson_patch`       | Emits the latest patch for the lesson document.                        |
| `lesson_snapshot`    | Emits the latest document snapshot after a patch is applied.           |
| `run_completed`      | Indicates that the lesson has been saved and can be opened.            |
| `run_failed`         | Streams a recoverable failure message back to the client.              |

The client parses these lines with `parseStreamEventLine` in `src/lib/orchestrator/stream-events.ts`.

---

## Architecture

<p align="center">
  <img src="imgs/architecture.svg" alt="Lumen architecture diagram" width="1100">
</p>

Lumen uses **Next.js 16.2 App Router**. Route Handlers run on the server so provider secrets never reach the browser; the client receives streamed events, renders the canvas, and calls internal APIs.

> **Important for contributors:** This repo uses a **non-standard Next.js line** compared with older framework assumptions. Before changing Next.js code, read `node_modules/next/dist/docs/` and [`AGENTS.md`](./AGENTS.md). This README was written with the App Router docs in `node_modules/next/dist/docs/01-app/index.md` in mind.

### Main Layers

| Layer              | Path                                                                 | Responsibility                                                                                  |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **App shell**      | `src/app/page.tsx`, `src/app/layout.tsx`                             | Home page, global layout, and background styling.                                               |
| **Studio**         | `src/app/studio/`, `src/components/canvas/`, `src/components/voice/` | Workspace for entering intent, watching the timeline, rendering the canvas, and retrying media. |
| **Lesson runtime** | `src/app/lesson/[lessonId]/`, `src/components/lesson-runtime/`       | Opens saved lessons and renders sandboxed HTML/runtime UI.                                      |
| **Lesson list**    | `src/app/lessons/`                                                   | Browses and deletes saved lessons.                                                              |
| **API routes**     | `src/app/api/**/route.ts`                                            | Generation, media, audio, voice transcription, OpenAI utility, and lesson CRUD.                 |
| **Orchestrator**   | `src/lib/orchestrator/`                                              | Agent pipeline, provider adapters, and stream events.                                           |
| **Lesson domain**  | `src/lib/lesson/`                                                    | Schema, patches, storage/repository, studio state, and HTML artifact creation.                  |
| **Data**           | `src/db/`, `drizzle/`                                                | Drizzle schema, migrations, and PostgreSQL tables.                                              |
| **Media storage**  | `src/lib/media/s3-storage.ts`                                        | Optional S3-compatible mirror for generated media and audio.                                    |

### Data Model

Core tables in `src/db/schema.ts`:

| Table             | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `lessons`         | Current lesson metadata, slug, status, render mode, and current version pointer. |
| `lesson_versions` | Versioned HTML artifact plus JSON spec and studio state.                         |
| `generation_runs` | Run status, transcript, error, and timestamps for observability.                 |

Core document schema in `src/lib/lesson/schema.ts`:

| Node type    | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `section`    | Hierarchical grouping for the lesson flow.              |
| `text`       | Markdown/plain content, optionally linked to citations. |
| `objectives` | Learning objectives.                                    |
| `media`      | Image, video, or audio asset with provenance.           |
| `activity`   | Matching, classification, or ordering practice.         |
| `quiz`       | Quiz items with choices, answer, and explanation.       |
| `reflection` | Exit ticket or reflection prompt.                       |

---

## Tech Stack

| Layer            | Technology                                             |
| ---------------- | ------------------------------------------------------ |
| **Framework**    | Next.js `16.2.6` App Router, Turbopack dev server      |
| **UI**           | React `19.2.4`, Tailwind CSS v4, Base UI, lucide-react |
| **Language**     | TypeScript `5.9`                                       |
| **AI SDK**       | `ai`, `@ai-sdk/openai`, `@ai-sdk/react`, `@ai-sdk/fal` |
| **AI providers** | OpenAI, Tavily, Pioneer/Fastino, fal, SLNG             |
| **Database**     | PostgreSQL, Drizzle ORM, `postgres`                    |
| **Validation**   | Zod 4                                                  |
| **Tooling**      | pnpm 11, Vitest, Biome via Ultracite, Lefthook         |

---

## Quick Start

### Requirements

- Node.js 20+
- pnpm 11 via Corepack
- PostgreSQL when using generation and persistence flows

### Install

```bash
git clone https://github.com/tihado/lumen.git
cd lumen
corepack enable
pnpm install
```

### Environment

Create `.env.local` in the project root.

```bash
DATABASE_URL="postgres://user:pass@localhost:5432/lumen"
OPENAI_API_KEY="..."
TAVILY_API_KEY="..."
PIONEER_API_URL="..."
PIONEER_API_KEY="..."
FAL_KEY="..."
SLNG_API_KEY="..."
SLNG_API_BASE_URL="..."
SLNG_AGENT_API_BASE_URL="https://api.agents.slng.ai"
SLNG_AGENT_ID="..."
```

Minimum for full generation persistence:

| Variable                                    | Required?   | Notes                                                                               |
| ------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | Yes         | `/api/generate` returns a streamed failure when the database is not configured.     |
| `OPENAI_API_KEY`                            | Recommended | Without it, lesson planning and runtime generation use deterministic fallbacks.     |
| `TAVILY_API_KEY`                            | Optional    | Without it, source cards use fallback examples.                                     |
| `PIONEER_API_URL` + `PIONEER_API_KEY`       | Optional    | Without it, entity extraction uses a heuristic fallback.                            |
| `FAL_KEY` or `FAL_API_KEY`                  | Optional    | Without it, image/video generation uses fallback assets.                            |
| `SLNG_API_KEY` + `SLNG_API_BASE_URL`        | Optional    | Without it, voice/TTS features fall back or mark audio unavailable.                 |
| `SLNG_AGENT_ID` + `SLNG_AGENT_API_BASE_URL` | Optional    | Enables the SLNG Voice Agent web-session endpoint. `SLNG_API_KEY` is also required. |
| `S3_BUCKET` + `AWS_*` / `S3_*`              | Optional    | Mirrors generated media/audio to stable URLs.                                       |

Full parsing logic lives in [`src/lib/env.ts`](./src/lib/env.ts).

### Database

```bash
pnpm run db:migrate
```

### Develop

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), then go to `/studio`.

### Quality

```bash
pnpm test
pnpm run format
```

---

## HTTP API Reference

| Method & path                             | Body / query                                                                            | Response                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------ |
| `POST /api/generate`                      | `{ transcript, lessonId? }`                                                             | NDJSON stream, `maxDuration = 120`   |
| `POST /api/media`                         | `{ prompt, modality?: "image" \| "video" }`                                             | Generated/fallback media JSON        |
| `GET /api/audio?text=`                    | query `text`                                                                            | SLNG TTS bytes or S3-backed response |
| `POST /api/audio`                         | `{ text }`                                                                              | SLNG TTS bytes                       |
| `POST /api/voice/transcribe`              | `multipart/form-data` with `audio`                                                      | Transcript JSON                      |
| `POST /api/voice/agent-session`           | `{ participantName?, lessonTitle?, lessonSummary?, transcript?, lessonId?, demoMode? }` | SLNG LiveKit web-session JSON        |
| `POST /api/openai`                        | `{ mode: "text" \| "json" \| "code", prompt }`                                          | Utility generation payload           |
| `GET /api/lessons`                        | none                                                                                    | Saved lessons                        |
| `GET /api/lessons/[lessonId]`             | none                                                                                    | Lesson and current version           |
| `POST /api/lessons/[lessonId]/regenerate` | optional `{ prompt }`                                                                   | Refreshed lesson JSON                |

---

## Project Structure

```text
src/
  app/
    api/                      # Route Handlers: generate, media, audio, voice, voice-agent sessions, openai, lessons
    studio/                   # Teacher workspace
    lesson/[lessonId]/        # Saved lesson runtime page
    lessons/                  # Saved lessons list
    page.tsx                  # Home
  components/
    canvas/                   # Lesson canvas rendering and source drawer
    lesson-runtime/           # Sandboxed lesson shell/runtime helpers
    ui/                       # Shared UI primitives
    voice/                    # Voice session controller
  db/                         # Drizzle schema + client
  lib/
    orchestrator/             # AI agent stream + provider adapters
    lesson/                   # Lesson schema, patches, repository, HTML artifact
    media/                    # S3-compatible media storage
drizzle/                      # SQL migrations
docs/                         # Product notes, plan, current progress
imgs/                         # README images and diagrams
scripts/                      # Maintenance scripts
```

Path alias: `@/*` maps to `./src/*`.

---

## Scripts

| Command                        | Description                 |
| ------------------------------ | --------------------------- |
| `pnpm dev`                     | Run Next.js dev server.     |
| `pnpm build`                   | Production build.           |
| `pnpm start`                   | Start production server.    |
| `pnpm test`                    | Run Vitest tests.           |
| `pnpm run format`              | Run Ultracite/Biome fixes.  |
| `pnpm run db:generate`         | Generate Drizzle migration. |
| `pnpm run db:migrate`          | Apply Drizzle migrations.   |
| `pnpm run lesson-runtime:copy` | Copy lesson runtime assets. |

---

## Design Notes

- **Patch-first document model:** the UI does not wait for the whole lesson to finish. It can render snapshots as soon as patches arrive.
- **Provider isolation:** all provider keys stay server-side in route handlers and provider modules.
- **Fallback-first demoability:** missing API keys should degrade quality, not break the interface.
- **Voice agent as rehearsal:** SLNG Agent sessions receive lesson context and help teachers practice delivery after the canvas exists.
- **Provenance-aware media:** generated media stores provider/model/prompt metadata so teachers can inspect and retry assets.
- **Sandboxed lesson delivery:** saved lessons are rendered from stored HTML/spec, reducing coupling between generation-time state and runtime display.
- **Versioned persistence:** saved artifacts are immutable versions; the lesson row points to the current version.

---

## Deployment Notes

- Set the same environment variables on the production host.
- Run Drizzle migrations before enabling generation.
- `POST /api/generate` can take time because it calls multiple providers; keep route duration limits aligned with `maxDuration = 120`.
- Configure S3 CORS if browsers must fetch mirrored media cross-origin.
- For the SLNG voice agent, set `SLNG_AGENT_ID` and keep the deployed `POST /api/voice/agent-session` route reachable over HTTPS. If the SLNG dashboard needs an app URL to launch web sessions, use this route. If it needs event webhooks/callbacks, add a separate adapter route for that callback shape.
- Keep provider fallback behavior in mind: a successful demo does not always mean all live providers are configured.

---

## Documentation

| Document                               | Description                                 |
| -------------------------------------- | ------------------------------------------- |
| [`docs/PROJECT.md`](./docs/PROJECT.md) | Product and technical specification.        |
| [`docs/CURRENT.md`](./docs/CURRENT.md) | Current progress notes.                     |
| [`docs/PLAN.md`](./docs/PLAN.md)       | Delivery / hackathon plan.                  |
| [`AGENTS.md`](./AGENTS.md)             | Next.js caveat for agents and contributors. |

---

## Contributors


| #   | Author (git)  | GitHub                                                 |
| --- | ------------- | ------------------------------------------------------ |
| 1   | **nvti**      | [@nvti](https://github.com/nvti)                       |
| 2   | **NLag**      | [@NLag](https://github.com/NLag)                       |
| 3   | **honghanhh** | [@honghanhh](https://github.com/honghanhh)             |
| 4   | **lanwyb**    | [@lanwyb](https://github.com/lanwyb)                   |
| 5   | **pnhneee**    | [@ctpnheee](https://github.com/ctpnheee)                 |

Upstream repo: [tihado/lumen](https://github.com/tihado/lumen).

---

## License

No `LICENSE` file is present in this repository root yet. Add one for your team’s terms; until then, default repository hosting rules apply on GitHub.
