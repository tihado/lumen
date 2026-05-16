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
| `OPENAI_MODEL`                       | Optional OpenAI model override for lesson composition (default `gpt-5`).                                                                                                       |
| `TAVILY_API_KEY`                     | Live Tavily search (otherwise demo fallback excerpts).                                                                                                                         |
| `FAL_KEY`                            | Live fal image for cover art (`FAL_IMAGE_MODEL` optional, default `fal-ai/flux/schnell`).                                                                                      |
| `PIONEER_API_URL`                    | POST `{ text }` → `{ entities: [...] }` at `{base}/extract` (optional `PIONEER_API_KEY` bearer). Without URL, heuristic extraction runs and is labeled **fallback** in the UI. |
| `SLNG_API_KEY` + `SLNG_API_BASE_URL` | Documented for future client voice wiring; studio still uses typed transcript + optional Web Speech API.                                                                       |

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
