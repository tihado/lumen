# Product Completion Plan

## Product Goal

Ship **Lumen** as a polished voice-first lesson authoring demo: a teacher gives a lesson intent, the app researches and generates a structured multimedia lesson, the teacher can edit or regenerate individual blocks, and the final lesson can be shared as a student-ready page.

This plan is based on the current repository state on 2026-05-16. The app already has a Next.js App Router structure, a studio surface, NDJSON generation streaming, lesson schema/patching, provider fallbacks, Drizzle persistence, sandboxed HTML lesson artifacts, and student preview routes.

Status marks below were refreshed on 2026-05-16 from `README.md`, `docs/CURRENT.md`, and `docs/PROJECT.md`.

Legend:

- `[x]` Implemented
- `[~]` Partially implemented; more work remains
- `[ ]` Not implemented or not verified

## Completion Criteria

- `[~]` A teacher can complete the happy path from `/studio` to a shareable `/lesson/[lessonId]` page without developer intervention. Current blocker: `DATABASE_URL` is still required.
- `[x]` The demo visibly shows provider boundaries: SLNG or voice fallback, Tavily, Pioneer/GLiNER2, LLM orchestration, and fal media.
- `[~]` Generated lessons are structured, editable, persisted, and render safely in the student runtime. Current blocker: teacher edits are not durable.
- `[~]` Provider failures degrade gracefully with fallback data, retries, and clear UI state. Current blocker: missing database setup still fails too hard.
- `[~]` The product is demo-ready on a fresh checkout with documented environment setup and a rehearsed backup path. Current blocker: full build/manual smoke pass and README demo checklist remain.

## Milestone 1: Stabilize The Core Generation Loop

**Goal:** Make generation reliable before adding polish.

Tasks:

- `[~]` Verify `/api/generate` works with no provider keys and with partial provider configuration. Provider fallbacks exist; no-database fallback does not.
- `[x]` Ensure `generateLessonStream` always emits `run_started`, provider status events, at least one `lesson_snapshot`, and either `run_completed` or `run_failed`.
- `[ ]` Add focused tests around stream event parsing and fallback generation paths.
- `[ ]` Confirm empty, very short, multilingual, and long transcripts produce valid `LessonDocument` output.
- `[x]` Keep the canonical schema in `src/lib/lesson/schema.ts` as the source of truth for all renderers and persistence.

Acceptance:

- `[x]` `pnpm test` passes.
- `[~]` A no-key local run creates a usable fallback lesson. This currently requires a configured Postgres database.
- `[x]` A failed provider does not block unrelated lesson blocks.

## Milestone 2: Finish Persistence And Share Flow

**Goal:** Make generated lessons durable and easy to reopen.

Tasks:

- `[x]` Confirm database setup works from `.env.example` through migrations.
- `[x]` Expand `.env.example` with all server variables used by `src/lib/env.ts`, including `DATABASE_URL`.
- `[~]` Add clear empty/error states for `/lessons` when the database is missing or has no rows. Empty/error states exist; missing DB still needs friendlier handling.
- `[x]` Ensure `/lesson/[lessonId]` consistently loads persisted lessons first, then demo/local preview fallback where intended.
- `[~]` Add a visible "Copy link" or "Open lesson" action after generation completes. Open saved lesson exists; explicit copy-link UX remains.
- `[x]` Preserve generation run status and errors in `generation_runs` for troubleshooting.

Acceptance:

- `[x]` A generated lesson appears in `/lessons`.
- `[x]` Refreshing `/lesson/[lessonId]` still works after generation.
- `[ ]` Missing `DATABASE_URL` shows an actionable message instead of a confusing crash.

## Milestone 3: Complete Canvas Editing

**Goal:** Make the generated output feel like an editable canvas, not a read-only preview.

Tasks:

- `[x]` Audit `CanvasWorkspace` and `BlockRenderer` for all node types: objectives, text, media, quiz, activity, reflection, and section.
- `[~]` Add inline editing for text-like blocks with save/cancel behavior. Text, media alt text, and quiz explanations can be edited; save/cancel remains.
- `[~]` Add block-level actions: duplicate, delete, move up/down, regenerate media, and simplify text. Regenerate media exists; the other actions remain.
- `[~]` Route all edits through `LessonPatchOp` so updates are stable and testable. Patch ops exist; current teacher edits are still local client updates.
- `[ ]` Add optimistic UI with a local rollback path if a server patch fails.
- `[x]` Keep student runtime components separate from teacher editing controls.

Acceptance:

- `[~]` A teacher can meaningfully alter at least text, quiz, activity, and media blocks from the studio. Activity and reflection editing remain mostly read-only.
- `[~]` Edits do not change unrelated node IDs. Patch tests cover immutable behavior, but local edit durability remains unresolved.
- `[~]` Patch tests cover replace, insert, remove, reorder, and metadata updates. Existing patch tests cover core patch behavior; broaden before closing.

## Milestone 4: Voice-First Interaction

**Goal:** Make voice the primary product story while keeping typed input as the reliable fallback.

Tasks:

- `[x]` Keep the current browser SpeechRecognition path as fallback.
- `[ ]` Wire SLNG in `VoiceSessionController` when `SLNG_API_KEY` and `SLNG_API_BASE_URL` are configured.
- `[~]` Show voice states clearly: idle, listening, transcribing, unavailable, and error.
- `[ ]` Add quick-action chips for common commands: add quiz, shorter, add activity, regenerate image.
- `[ ]` Convert quick actions and recognized commands into the same patch/regeneration paths used by manual edits.
- `[~]` Add one optional TTS response for a high-impact demo moment, such as a clarifying question or generation summary. Server TTS exists; demo UX remains.

Acceptance:

- `[x]` Voice unavailable still leaves the full typed generation path usable.
- `[ ]` At least one voice or quick-action edit updates an existing lesson without a full rebuild.
- `[x]` The status timeline makes it obvious when SLNG is live versus fallback.

## Milestone 5: Provider Integration Polish

**Goal:** Make each sponsor/provider contribution visible, useful, and resilient.

Tasks:

- `[~]` Tavily: show source titles, excerpts, links, retrieved time, and block associations in the sources drawer. Citations are inspectable; block associations remain limited.
- `[ ]` Pioneer/GLiNER2: surface extracted terms or entities in a visible lesson block or metadata panel.
- `[x]` fal: improve image prompt construction per block and store prompt/model/job provenance.
- `[x]` fal retry: keep failed media blocks in place and retry only that block.
- `[~]` LLM: validate model output with Zod and repair or fallback deterministically when invalid. Validation/fallback exists; invalid-output repair needs review.
- `[x]` SLNG: document live setup and fallback behavior in README.

Acceptance:

- `[x]` Provider badges accurately show live versus fallback mode.
- `[~]` Source and media provenance are inspectable from the UI. Media/source visibility exists; entity/source associations need polish.
- `[~]` Invalid provider output cannot corrupt persisted lessons. Schema validation helps; repair/fallback review remains.

## Milestone 6: Student Lesson Runtime

**Goal:** Make the shared lesson page feel complete and classroom-safe.

Tasks:

- `[x]` Review `LessonPageShell`, quiz runtime, activity runtime, reflection prompts, and sandboxed frame behavior.
- `[~]` Ensure every generated node type has a polished student-facing renderer. Current schema node types render; generated sandbox and structured fixture paths still need consolidation.
- `[ ]` Add keyboard and basic accessibility coverage for quiz/activity interactions.
- `[~]` Validate sandboxed HTML output in `src/lib/lesson/html-artifact.ts` before saving.
- `[x]` Add graceful handling for missing media assets and unsafe URLs.

Acceptance:

- `[~]` `/lesson/demo` and a freshly generated lesson both render without layout breaks. Both routes exist; full manual verification remains.
- `[x]` Interactive quiz/activity blocks work without teacher-only controls leaking into the page.
- `[~]` Unsafe or malformed media/source URLs are rejected or rendered inert.

## Milestone 7: Export And Demo Closure

**Goal:** Give the demo a satisfying ending.

Tasks:

- `[ ]` Add JSON export as the reliable baseline.
- `[ ]` Add print/PDF export if time allows, using a print-optimized lesson page before adding dependencies.
- `[~]` Add a "Demo mode" seed for the water-cycle or solar-system path with pre-baked fallback assets. Deterministic fallback assets exist; explicit demo mode remains.
- `[~]` Create a 90-second demo script and a backup screen recording. Demo script exists in `docs/PROJECT.md`; backup recording remains.
- `[ ]` Add a README "Demo checklist" covering env keys, migrations, local dev, fallback mode, and expected URLs.

Acceptance:

- `[~]` Demo can close with either a copied share link, JSON export, or PDF export. Share page exists; explicit copy/export remains.
- `[~]` A fully offline/no-key demo path still tells a coherent product story. No provider keys work with fallbacks; Postgres is still required.

## Milestone 8: Quality Gate

**Goal:** Make the product hard to embarrass on stage.

Tasks:

- `[~]` Run `pnpm test`, `pnpm run format`, and `pnpm build`. Tests, typecheck, and Biome passed in the current snapshot; full build remains.
- `[ ]` Test desktop and mobile layouts for `/`, `/studio`, `/lessons`, and `/lesson/demo`.
- `[ ]` Verify first-load, generation, retry, edit, save, refresh, and share flows.
- `[ ]` Add Playwright smoke tests only if the team has time; otherwise maintain a manual smoke checklist.
- `[~]` Review loading, empty, and error states across all pages.

Acceptance:

- `[~]` Build and tests pass. Tests pass; build not verified in the current snapshot.
- `[ ]` Manual smoke test passes in fallback mode.
- `[~]` Known limitations are documented in README rather than discovered live.

## Milestone 9: Student Interaction Tracking

**Goal:** Turn the shared lesson page from a static endpoint into a lightweight classroom runtime that records quiz, activity, reflection, and media events without changing the lesson document itself.

Why this feature belongs next:

- `README.md` already presents `/lesson/[lessonId]` as the student-ready output of generation.
- `docs/PROJECT.md` defines a `StudentInteractionEvent` model and recommends `/api/lessons/[lessonId]/events`.
- `docs/CURRENT.md` notes that student interaction events are not persisted yet.

Tasks:

- `[ ]` Add a Drizzle table for anonymous student interaction events with `lessonId`, `nodeId`, event `type`, JSON payload, and `createdAt`.
- `[ ]` Create `POST /api/lessons/[lessonId]/events` for quiz answers, hint reveals, activity completion, reflection submissions, and media play events.
- `[ ]` Validate event payloads with Zod and reject events for missing lessons, unknown node IDs, unsafe payloads, or unsupported event types.
- `[ ]` Add client-side event submission from `QuizRuntime`, `ActivityRuntime`, `ReflectionPrompt`, and media blocks.
- `[ ]` Keep the runtime resilient: failed event writes should not block student progress.
- `[ ]` Add a minimal teacher-facing summary in Studio or the saved lesson view, such as quiz attempts, reflection count, and last activity timestamp.
- `[ ]` Add unit tests for event validation and route behavior with missing lesson, valid event, and invalid event cases.

Acceptance:

- `[ ]` A student can answer a quiz or submit a reflection on `/lesson/[lessonId]`, refresh the page, and the event remains in Postgres.
- `[ ]` Event recording does not mutate `LessonDocument` or create a new lesson version.
- `[ ]` The teacher can see at least a minimal aggregate signal from recorded student activity.
- `[ ]` If the database or event route fails, the student UI continues to work and shows feedback locally.

## Suggested Implementation Order

1. Persistence and env setup.
2. Generation loop tests and provider failure hardening.
3. Canvas editing through patch operations.
4. Student runtime polish.
5. Student interaction tracking.
6. Voice command and quick-action editing.
7. Export and demo mode.
8. Full QA and documentation.

This order keeps the core product usable at every step. Voice and PDF export are high-impact polish, but persistence, structured editing, and a reliable share page are the backbone.

## Cut Line For A Demo

Must keep:

- `/studio` typed generation.
- Provider status timeline with live/fallback badges.
- Structured canvas output.
- fal image or credible fallback image.
- Tavily sources drawer or fallback source cards.
- Persisted `/lesson/[lessonId]` share page.

Can cut if time is tight:

- PDF export.
- Arbitrary natural-language edit parsing.
- Live SLNG, as long as browser voice or typed fallback is clearly available.
- Video generation.
- Advanced block layout controls.

## Open Decisions

- Should persistence require Postgres for the demo, or should localStorage remain a first-class fallback?
- Should the canonical student output be structured React rendering, sandboxed HTML, or both?
- Which one hero demo topic should have fully rehearsed fallback assets?
- Is auth needed before judging, or are anonymous generated lesson IDs acceptable?
- Should SLNG TTS be used for only one polished moment or throughout the session?
