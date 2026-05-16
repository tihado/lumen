This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Canvas Teacher AI (Provider Demo MVP)

- **Studio:** [http://localhost:3000/studio](http://localhost:3000/studio) — typed or browser-dictated transcript, NDJSON generation stream, editable canvas, **Publish preview** (saves to `localStorage` and opens `/lesson/[id]`).
- **Sample lesson:** [http://localhost:3000/lesson/demo](http://localhost:3000/lesson/demo) — fixture document without publishing.

### Environment variables (server)

| Variable                             | Enables                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENAI_API_KEY`                     | Live LLM lesson composition through AI SDK's direct OpenAI provider (otherwise deterministic lesson fallback).                                                                  |
| `OPENAI_MODEL`                       | Optional OpenAI model override for lesson composition and `/api/openai` text / JSON / code generation (default `gpt-5`).                                                       |
| `TAVILY_API_KEY`                     | Live Tavily search (otherwise demo fallback excerpts).                                                                                                                         |
| `FAL_KEY`                            | Live fal image and video generation.                                                                                                                                           |
| `FAL_IMAGE_MODEL`                    | Optional fal image model override (default `fal-ai/flux/schnell`).                                                                                                             |
| `FAL_VIDEO_MODEL`                    | Optional fal video model override (default `fal-ai/veo3.1/fast`).                                                                                                              |
| `PIONEER_API_URL`                    | POST `{ text }` → `{ entities: [...] }` at `{base}/extract` (optional `PIONEER_API_KEY` bearer). Without URL, heuristic extraction runs and is labeled **fallback** in the UI. |
| `SLNG_API_KEY` + `SLNG_API_BASE_URL` | Live SLNG audio endpoints for text-to-speech and speech-to-text; studio still keeps typed/browser speech fallback.                                                             |
| `SLNG_TTS_MODEL`                     | Optional SLNG TTS model path (default `slng/deepgram/aura:2`).                                                                                                                 |
| `SLNG_STT_MODEL`                     | Optional SLNG STT model path (default `slng/deepgram/nova:3`).                                                                                                                 |
| `S3_BUCKET` + `AWS_REGION`           | Optional S3 bucket for storing generated fal/SLNG media.                                                                                                                       |
| `AWS_ACCESS_KEY_ID`                  | S3 access key.                                                                                                                                                                |
| `AWS_SECRET_ACCESS_KEY`              | S3 secret key.                                                                                                                                                                |
| `AWS_SESSION_TOKEN`                  | Optional temporary credential token.                                                                                                                                          |
| `S3_ENDPOINT_URL`                    | Optional S3-compatible endpoint for R2, MinIO, etc.                                                                                                                           |
| `S3_PUBLIC_BASE_URL`                 | Optional public CDN/base URL for uploaded media.                                                                                                                              |
| `S3_PREFIX`                          | Optional object key prefix (default `lesson-media`).                                                                                                                          |
| `S3_FORCE_PATH_STYLE`                | Set to `true` for path-style S3-compatible endpoints.                                                                                                                         |

### Provider endpoints

- `POST /api/generate` — orchestrates Tavily search, Pioneer extraction, OpenAI structured lesson JSON, fal image/video media, SLNG narration metadata, then persists the lesson.
- `POST /api/media` — generate `{ modality: "image" | "video", prompt }` through fal, with demo fallback assets.
- `GET|POST /api/audio` — synthesize narration audio through SLNG TTS.
- `POST /api/voice/transcribe` — transcribe uploaded audio through SLNG STT.
- `POST /api/openai` — generate `{ mode: "text" | "json" | "code", prompt }` through OpenAI.

When S3 env vars are configured, generated fal image/video assets and SLNG
narration audio are mirrored to S3. Lesson media URLs point at the S3/CDN URL
instead of provider-hosted temporary URLs.

Run tests: `pnpm test`. Format: `pnpm run format`.

Full product spec: [docs/PROJECT.md](./docs/PROJECT.md).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
