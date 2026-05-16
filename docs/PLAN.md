# Product Completion Plan

## Product Goal

Ship **Lumen** as a polished voice-first lesson authoring demo: a teacher gives a lesson intent, the app researches and generates a structured multimedia lesson, the teacher can edit or regenerate individual blocks, and the final lesson can be shared as a student-ready page.

This plan is based on the current repository state on 2026-05-16. The app already has a Next.js App Router structure, a studio surface, NDJSON generation streaming, lesson schema/patching, provider fallbacks, Drizzle persistence, sandboxed HTML lesson artifacts, and student preview routes.

## Completion Criteria

- A teacher can complete the happy path from `/studio` to a shareable `/lesson/[lessonId]` page without developer intervention.
- The demo visibly shows provider boundaries: SLNG or voice fallback, Tavily, Pioneer/GLiNER2, LLM orchestration, and fal media.
- Generated lessons are structured, editable, persisted, and render safely in the student runtime.
- Provider failures degrade gracefully with fallback data, retries, and clear UI state.
- The product is demo-ready on a fresh checkout with documented environment setup and a rehearsed backup path.

## Milestone 1: Stabilize The Core Generation Loop

**Goal:** Make generation reliable before adding polish.

Tasks:

- Verify `/api/generate` works with no provider keys and with partial provider configuration.
- Ensure `generateLessonStream` always emits `run_started`, provider status events, at least one `lesson_snapshot`, and either `run_completed` or `run_failed`.
- Add focused tests around stream event parsing and fallback generation paths.
- Confirm empty, very short, multilingual, and long transcripts produce valid `LessonDocument` output.
- Keep the canonical schema in `src/lib/lesson/schema.ts` as the source of truth for all renderers and persistence.

Acceptance:

- `pnpm test` passes.
- A no-key local run creates a usable fallback lesson.
- A failed provider does not block unrelated lesson blocks.

## Milestone 2: Finish Persistence And Share Flow

**Goal:** Make generated lessons durable and easy to reopen.

Tasks:

- Confirm database setup works from `.env.example` through migrations.
- Expand `.env.example` with all server variables used by `src/lib/env.ts`, including `DATABASE_URL`.
- Add clear empty/error states for `/lessons` when the database is missing or has no rows.
- Ensure `/lesson/[lessonId]` consistently loads persisted lessons first, then demo/local preview fallback where intended.
- Add a visible "Copy link" or "Open lesson" action after generation completes.
- Preserve generation run status and errors in `generation_runs` for troubleshooting.

Acceptance:

- A generated lesson appears in `/lessons`.
- Refreshing `/lesson/[lessonId]` still works after generation.
- Missing `DATABASE_URL` shows an actionable message instead of a confusing crash.

## Milestone 3: Complete Canvas Editing

**Goal:** Make the generated output feel like an editable canvas, not a read-only preview.

Tasks:

- Audit `CanvasWorkspace` and `BlockRenderer` for all node types: objectives, text, media, quiz, activity, reflection, and section.
- Add inline editing for text-like blocks with save/cancel behavior.
- Add block-level actions: duplicate, delete, move up/down, regenerate media, and simplify text.
- Route all edits through `LessonPatchOp` so updates are stable and testable.
- Add optimistic UI with a local rollback path if a server patch fails.
- Keep student runtime components separate from teacher editing controls.

Acceptance:

- A teacher can meaningfully alter at least text, quiz, activity, and media blocks from the studio.
- Edits do not change unrelated node IDs.
- Patch tests cover replace, insert, remove, reorder, and metadata updates.

## Milestone 4: Voice-First Interaction

**Goal:** Make voice the primary product story while keeping typed input as the reliable fallback.

Tasks:

- Keep the current browser SpeechRecognition path as fallback.
- Wire SLNG in `VoiceSessionController` when `SLNG_API_KEY` and `SLNG_API_BASE_URL` are configured.
- Show voice states clearly: idle, listening, transcribing, unavailable, and error.
- Add quick-action chips for common commands: add quiz, shorter, add activity, regenerate image.
- Convert quick actions and recognized commands into the same patch/regeneration paths used by manual edits.
- Add one optional TTS response for a high-impact demo moment, such as a clarifying question or generation summary.

Acceptance:

- Voice unavailable still leaves the full typed generation path usable.
- At least one voice or quick-action edit updates an existing lesson without a full rebuild.
- The status timeline makes it obvious when SLNG is live versus fallback.

## Milestone 5: Provider Integration Polish

**Goal:** Make each sponsor/provider contribution visible, useful, and resilient.

Tasks:

- Tavily: show source titles, excerpts, links, retrieved time, and block associations in the sources drawer.
- Pioneer/GLiNER2: surface extracted terms or entities in a visible lesson block or metadata panel.
- fal: improve image prompt construction per block and store prompt/model/job provenance.
- fal retry: keep failed media blocks in place and retry only that block.
- LLM: validate model output with Zod and repair or fallback deterministically when invalid.
- SLNG: document live setup and fallback behavior in README.

Acceptance:

- Provider badges accurately show live versus fallback mode.
- Source and media provenance are inspectable from the UI.
- Invalid provider output cannot corrupt persisted lessons.

## Milestone 6: Student Lesson Runtime

**Goal:** Make the shared lesson page feel complete and classroom-safe.

Tasks:

- Review `LessonPageShell`, quiz runtime, activity runtime, reflection prompts, and sandboxed frame behavior.
- Ensure every generated node type has a polished student-facing renderer.
- Add keyboard and basic accessibility coverage for quiz/activity interactions.
- Validate sandboxed HTML output in `src/lib/lesson/html-artifact.ts` before saving.
- Add graceful handling for missing media assets and unsafe URLs.

Acceptance:

- `/lesson/demo` and a freshly generated lesson both render without layout breaks.
- Interactive quiz/activity blocks work without teacher-only controls leaking into the page.
- Unsafe or malformed media/source URLs are rejected or rendered inert.

## Milestone 7: Export And Demo Closure

**Goal:** Give the demo a satisfying ending.

Tasks:

- Add JSON export as the reliable baseline.
- Add print/PDF export if time allows, using a print-optimized lesson page before adding dependencies.
- Add a "Demo mode" seed for the water-cycle or solar-system path with pre-baked fallback assets.
- Create a 90-second demo script and a backup screen recording.
- Add a README "Demo checklist" covering env keys, migrations, local dev, fallback mode, and expected URLs.

Acceptance:

- Demo can close with either a copied share link, JSON export, or PDF export.
- A fully offline/no-key demo path still tells a coherent product story.

## Milestone 8: Quality Gate

**Goal:** Make the product hard to embarrass on stage.

Tasks:

- Run `pnpm test`, `pnpm run format`, and `pnpm build`.
- Test desktop and mobile layouts for `/`, `/studio`, `/lessons`, and `/lesson/demo`.
- Verify first-load, generation, retry, edit, save, refresh, and share flows.
- Add Playwright smoke tests only if the team has time; otherwise maintain a manual smoke checklist.
- Review loading, empty, and error states across all pages.

Acceptance:

- Build and tests pass.
- Manual smoke test passes in fallback mode.
- Known limitations are documented in README rather than discovered live.

## Suggested Implementation Order

1. Persistence and env setup.
2. Generation loop tests and provider failure hardening.
3. Canvas editing through patch operations.
4. Student runtime polish.
5. Voice command and quick-action editing.
6. Export and demo mode.
7. Full QA and documentation.

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
