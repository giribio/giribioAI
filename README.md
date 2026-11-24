# GiriBioAI

An interactive, in-browser lab for learning how AI and large language models work, with a Bio-AI track.
No GPU, no API keys, no sign-up: every simulator runs locally in the browser.

Developed by **Girinath G Pillai** with AI assistance.

## What's inside

| Track | Modules |
|---|---|
| Foundations | 01 Neural Network Basics · 02 Tokens · 03 Vocabulary · 04 Embeddings & Attention |
| Inside the model | 05 Transformer Walkthrough · 06 Pre-training · 07 Sampling & Decoding · 08 Context, KV Cache & MoE · 09 Fine-tuning |
| Building with LLMs | 10 Prompt Builder · 11 Prompt Training · 12 RAG · 13 Orchestration · 14 Agent Loop Tracer · 15 Evals, Safety & Quantization |
| Bio-AI | 16 Bio-AI with LLMs (DNA k-mers and codons, protein masked prediction, SMILES) |
| Hands-on labs | Chat Simulator · Local LLM Setup · Agentic AI, RAG & MCP slides |

Platform features: learning path with progress (stored only in the browser), per-module goals and self-checks,
glossary with Ctrl+K search, light/dark theme (Google palette), shareable lab links, and exact GPT tokenizers
(GPT-4o, GPT-4, GPT-2) that load on demand.

## Run locally

Requires Node.js 20+ (or Bun).

```bash
npm install        # or: bun install
npm run dev        # http://localhost:8080
npm run build      # production build into .output/
npm run preview    # serve the production build
```

## Deploy (Cloudflare Workers, from GitHub)

The build targets Cloudflare Workers (Worker name `giribioai`, set in `vite.config.ts`).

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → pick `giribio/giribioAI`.
2. Project name: `giribioai` (must match the Worker name).
3. Build command: `npm run build` · Deploy command: `npx wrangler deploy` · Root directory: `/`.
4. Deploy. Every push to `main` rebuilds and redeploys automatically.
5. Optional: **Settings → Domains & Routes** to add a custom domain.

Test the exact production Worker locally:

```bash
npm run build
npx wrangler dev      # http://localhost:8787
```

## Project layout

```
src/
  lib/curriculum.ts     single source of truth: tracks, modules, order and numbering
  lib/guide.ts          per-module goals, time estimates and "try this first" hints
  lib/glossary.ts       all key terms, linked to their module
  lib/progress.ts       learning progress (localStorage)
  lib/shareState.ts     lab settings mirrored into the URL for sharing
  lib/realTokenizer.ts  lazy-loaded exact OpenAI tokenizers (gpt-tokenizer)
  lib/hardware.ts       shared GPU table and fit verdicts
  components/           header/nav, theme toggle, command palette, ModulePage building blocks
  routes/               one file per page (TanStack Router file routes)
  styles.css            design tokens: Google palette, light and dark
public/                 static files (slide deck, llms.txt, robots.txt)
```

To add a module: create `src/routes/<name>.tsx` using `ModulePage` with a `moduleId`, add an entry to
`MODULES` in `curriculum.ts` (inside its track's block, which sets its number), add its goals to `guide.ts`
and its terms to `glossary.ts`.

## Tech

React 19, TanStack Start/Router, Vite, Tailwind CSS v4, Radix UI / shadcn components, Recharts, Lucide icons,
gpt-tokenizer.
