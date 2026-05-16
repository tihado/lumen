# Lumen — current progress

**Snapshot date:** 2026-05-16  
**Source docs reviewed:** `docs/PLAN.md`, `docs/PROJECT.md`  
**Code reviewed:** app routes, lesson schema and patches, orchestrator, provider adapters, persistence, studio UI, canvas UI, and student runtime.

## Current product state

Lumen is now beyond the original scaffold. The repository contains a working Next.js 16 App Router demo path for generating a structured lesson from a typed or browser-dictated prompt, streaming provider progress to the studio, rendering an editable teacher canvas, persisting a sandboxed HTML lesson version to Postgres, and opening a student-facing lesson page.

The current implementation is best described as a **provider-visible persisted demo MVP**. It has credible fallback behavior for most external providers, but the main generation flow still requires `DATABASE_URL` because `/api/generate` writes lessons, versions, and generation runs to Postgres.

As of this snapshot, fal video generation has been moved from a long direct `fal.run` request to the fal queue API. The app now submits video jobs, polls queue status, fetches the completed `video.url`, and only falls back to the demo video when fal is not configured, the queue job fails, or the queue exceeds the local timeout.

## Implemented features

### Studio generation flow

- `/studio` provides the main teacher workspace.
- The input panel supports typed lesson intent and browser `SpeechRecognition` dictation when available.
- `POST /api/generate` streams NDJSON events from `generateLessonStream`.
- The client handles `run_started`, provider lifecycle events, lesson snapshots, completion, and failure.
- Provider readiness badges show live vs fallback mode for:
  - OpenAI LLM
  - Tavily
  - fal
  - Pioneer / GLiNER2
  - SLNG
- A provider timeline displays started and completed orchestration steps.

### Lesson document model

- `src/lib/lesson/schema.ts` defines a Zod-validated canonical `LessonDocument`.
- Supported node types:
  - `section`
  - `objectives`
  - `text`
  - `media` with `image`, `video`, and `audio`
  - `quiz`
  - `activity`
  - `reflection`
- Citations include Tavily provenance and optional block associations.
- Media provenance tracks provider, model, job ID, prompt, and creation time.

### Patch system

- `src/lib/lesson/patches.ts` implements immutable lesson updates.
- Supported operations:
  - `set_meta`
  - `set_citations`
  - `add_node`
  - `replace_node`
  - `delete_node`
  - `move_node`
- Patch application validates the final document with Zod.
- Existing tests cover patch behavior.

### Orchestration and provider fallbacks

- `generateLessonStream` builds the lesson in staged steps:
  1. create persisted lesson and generation run
  2. SLNG setup/readiness step
  3. Tavily search or fallback source cards
  4. Pioneer extraction or heuristic extraction for lesson and sandbox schema data
  5. OpenAI lesson plan or deterministic fallback plan
  6. materialize lesson nodes as patches
  7. fal image generation or fallback image
  8. fal queue-backed video generation or fallback video
  9. SLNG narration audio or failed audio state
  10. generated or fallback sandboxed lesson HTML/JavaScript runtime
  11. persist sandboxed HTML lesson version
- fal image/video retries are available from selected media blocks through `/api/media`.
- fal video generation uses `queue.fal.run` polling with a 175s local deadline and a 180s `/api/media` route duration budget.
- Optional S3 mirroring exists for generated image, video, and audio assets.

### Persistence

- Drizzle/Postgres schema exists for:
  - `lessons`
  - `lesson_versions`
  - `generation_runs`
- `saveLessonVersion` stores rendered HTML plus a persisted studio spec containing:
  - the lesson document
  - timeline
  - run ID
  - transcript
  - artifact spec
  - completion timestamp
- `/lessons` lists persisted lessons and links back to Studio or the student lesson.
- `/api/lessons/[lessonId]` returns the persisted lesson and current version.
- `/lesson/[lessonId]` loads the persisted sandboxed HTML version first.

### Teacher canvas

- `CanvasWorkspace` renders the generated lesson as a block tree.
- `BlockRenderer` supports all current node types.
- Text blocks can be edited inline when selected.
- Media blocks allow alt text editing when selected.
- Quiz explanations can be edited when selected.
- Media blocks show status, fal badges, image/video/audio previews, and retry controls.
- Sources are inspectable through `SourcesDrawer`.

### Student runtime

- `/lesson/demo` renders a structured fixture with React runtime components.
- Persisted generated lessons render through `SandboxedLessonFrame`.
- `LessonPageShell` supports structured React rendering for the fixture/fallback route.
- Student runtime components exist for:
  - quiz interaction
  - activity interaction
  - reflection prompt
  - source popovers
- The persisted generated lesson route includes a `Back to Studio` link.

### Environment and setup

- `env.example` includes the server variables used by `src/lib/env.ts`, including `DATABASE_URL`.
- README documents the provider variables and core API endpoints.
- Package scripts are present for dev, build, tests, formatting, and Drizzle migration.

## Partial or incomplete features

### Voice-first experience

- Browser speech dictation exists as a fallback.
- SLNG server endpoints and TTS/STT provider adapters exist.
- The studio does not yet wire SLNG realtime voice into `VoiceSessionController`.
- There are no quick-action voice chips for edits like "add quiz", "shorter", or "regenerate image".
- Voice commands do not yet apply patches to an existing lesson.

### Canvas editing

- Inline editing exists for text body, media alt text, and quiz explanations.
- There is no save/cancel editing mode.
- Edits are local client updates only; they are not persisted back to Postgres.
- Missing block-level teacher actions:
  - duplicate
  - delete
  - move up/down
  - simplify text
  - regenerate non-media content
- Activity and reflection editing are mostly read-only in the teacher canvas.

### Persistence and share flow

- Persistence works when Postgres is configured.
- The happy path does not work without `DATABASE_URL`; generation fails before fallback lessons can be saved.
- `/lessons` has empty and error states, but missing database setup still appears as a raw error message.
- There is an `Open saved lesson` button, but no explicit copy-link action after generation.
- Generation run persistence currently stores high-level run status, transcript, error, and timestamps; detailed provider step logs are stored in the lesson version studio spec rather than normalized in `generation_runs`.

### Provider integration polish

- Provider boundaries are visible in readiness badges and timeline rows.
- Tavily citations are stored and displayed, but block-level source associations are limited.
- Pioneer/GLiNER2 output influences fallback/LLM planning and is now available to generated sandbox runtimes as schema data, but extracted entities are not shown as a first-class visible metadata panel.
- fal image generation uses direct fal model calls; fal video generation now uses queue submit/status/result polling. Provenance is stored, but retry provenance is simplified client-side.
- LLM lesson planning validates through provider code and schema boundaries, but invalid-output repair behavior should be reviewed before demo.

### Student lesson runtime

- The structured React runtime handles current schema node types and renders media nodes as image, video, or audio based on modality.
- Generated persisted lessons use sandboxed HTML. Non-solar lessons expose a `lesson-data` JSON payload and LLM-authored safe JavaScript can enhance the validated static shell with topic-specific HTML, CSS, canvas/SVG, and schema-driven interactions.
- Student interaction events are not persisted.
- Quiz/activity accessibility and keyboard coverage have not been verified.
- Missing media gracefully shows fallback text in the structured runtime.

### Export and demo closure

- Share-by-link exists through `/lesson/[lessonId]` when Postgres persistence is configured.
- JSON export is not implemented.
- PDF/print export is not implemented.
- A rehearsed demo script exists in `docs/PROJECT.md`, but README still needs a concise demo checklist.

## Current milestone assessment

| Milestone | Status | Notes |
| --- | --- | --- |
| 1. Stabilize core generation loop | Partial | Streaming and provider fallbacks exist, but no-key mode still fails without database configuration. |
| 2. Persistence and share flow | Partial | Postgres persistence and lesson listing exist; missing DB handling and copy-link UX remain. |
| 3. Canvas editing | Partial | Basic inline edits exist; persistence, save/cancel, reorder/delete/duplicate, and richer block edits remain. |
| 4. Voice-first interaction | Early | Browser STT fallback exists; SLNG realtime and voice-driven edits remain. |
| 5. Provider polish | Partial | Provider visibility exists and fal video is queue-backed; source/entity/media provenance still needs stronger UI. |
| 6. Student runtime | Partial | Demo fixture and sandboxed generated lessons work; runtime consolidation and accessibility verification remain. |
| 7. Export and demo closure | Early | Share link path exists; JSON/PDF export and demo checklist remain. |
| 8. Quality gate | Partial | `pnpm test` and `pnpm exec tsc --noEmit` pass; Biome check passes for the touched fal/media files. Full build and manual smoke testing have not been run for this snapshot. |

## Known risks

- **Database is mandatory for generation.** The plan's "no-key local run creates a usable fallback lesson" is only true if Postgres is configured.
- **Teacher edits are not durable.** Local canvas edits can be lost when opening the persisted lesson.
- **Two student rendering paths exist.** Demo fixture uses structured React rendering; generated lessons use sandboxed HTML. This is workable for a demo but should be documented as an intentional architecture choice or consolidated.
- **Generated sandbox quality is prompt-dependent.** The orchestrator now asks for solar-demo-level sandbox HTML/JavaScript enhancements, but visual verification still needs a manual or browser smoke pass.
- **Voice story is still mostly fallback.** Browser dictation helps, but SLNG is not yet the primary client voice session.
- **fal video can still fall back under real provider failure.** The queue path fixes direct-request timeout behavior, but content policy failures, exhausted credentials, provider outage, or jobs exceeding the local timeout still return the demo video.
- **README is stale in one place.** It mentions a localStorage publish preview, but current code persists generated lessons through Postgres.

## Recommended next steps

1. Make missing `DATABASE_URL` an explicit, friendly state in `/api/generate`, `/studio`, and `/lessons`.
2. Decide whether localStorage/no-DB fallback should remain a first-class demo path or whether Postgres is required.
3. Persist teacher canvas edits through a lesson patch API.
4. Add the visible post-generation share affordance: copy link and open lesson.
5. Add quick-action edit chips that call the same patch/regeneration paths as manual edits.
6. Surface Pioneer extracted entities and richer Tavily source associations in the UI.
7. Implement JSON export as the reliable demo ending.
8. Update README with the current Postgres-backed flow and a short demo checklist.
