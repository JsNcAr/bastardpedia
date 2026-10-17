# Bastardpedia

Find _Behind the Bastards_ stories by topic, region and historical period:
Victorian explorers, Cold War spooks, medieval tyrants, Gilded Age grifters.

The podcast has 450+ stories across 1,000+ episodes. Episode titles are jokes,
and descriptions rarely say where or when a story happens. Bastardpedia
classifies every story with a strict taxonomy (themes, roles, regions, years)
tagged by an AI agent from the episode transcripts and reviewed by a person. It
then lets you filter and search them, and links straight to the official
episodes.

> **Status: 0.1.0, pre-release.** Tag specification done (taxonomy 0.2.0),
> scaffold built, no stories tagged yet. Public site at
> `bastardpedia.ramsus.site` once the first release is cut. See
> [docs/ROADMAP.md](docs/ROADMAP.md).

This is a fan project, not affiliated with Cool Zone Media or iHeartMedia. It
publishes metadata, original summaries and links to the official episode pages,
never episode audio or transcripts.

## Quick start

```sh
nvm use                 # Node 24 (.nvmrc)
npm install
npm run build:catalog   # build the catalog from the committed tags
npm run dev
```

## How it works

```
RSS feed ─► episodes ─► stories ─► tagging packets ─► AI tagger ─► tags (+ human overrides) ─► catalog.json ─► app
```

1. **Pipeline** (`pipeline/`): reads the official feed, groups multi-part
   series into stories, and fetches transcripts locally.
2. **Tagging** (`tagging/`): a model-agnostic prompt plus a closed taxonomy. Run
   it as a Claude Code subagent, from any chat assistant, or (later) through an
   API. Every record is validated against a schema.
3. **App** (`src/`): static React app. It loads one JSON catalog, filters in
   memory, stores personal lists in IndexedDB, and works offline as an
   installable PWA.

## Commands

| Command                             | What                                                |
| ----------------------------------- | --------------------------------------------------- |
| `npm run dev` / `build` / `preview` | App                                                 |
| `npm run verify`                    | typecheck + lint + unit tests                       |
| `npm run e2e`                       | Playwright end-to-end tests on the built app        |
| `npm run pipeline:sync`             | Pull the feed, regroup stories, show tagging status |
| `npm run tags:packet -- <id>`       | Build the input for a tagging agent                 |
| `npm run tags:validate`             | Validate all tag records                            |
| `npm run build:catalog`             | Generate `public/data/catalog.json`                 |
| `npm run release -- minor`          | Cut a release (tag, then CI deploys)                |

## Tech stack

TypeScript 6 (strict) on Node 24 · React 19 · Vite 8 · React Router 8 (history
URLs) · TanStack Query · Zustand · Dexie · MiniSearch · Zod · vite-plugin-pwa ·
plain CSS from design tokens · Vitest and Playwright · ESLint, Prettier, husky,
commitlint · Caddy and GitHub Actions. The architecture follows the
author's ChronoTeach project, desktop-first, with the Android build deferred
(ADR 0004).

## Documentation

| Doc                                                                              |                                                                           |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [ARCHITECTURE](docs/ARCHITECTURE.md)                                             | Layers, data flow, state ownership                                        |
| [TAXONOMY](docs/TAXONOMY.md)                                                     | What the tags mean and why ([full reference](docs/taxonomy-reference.md)) |
| [TAGGING](docs/TAGGING.md)                                                       | Running the tagger, review, overrides                                     |
| [DATA_PIPELINE](docs/DATA_PIPELINE.md)                                           | Every pipeline command, adding new episodes                               |
| [DATA_MODEL](docs/DATA_MODEL.md)                                                 | Every record, field by field                                              |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md)                                           | Tokens, layout, components                                                |
| [API](docs/API.md)                                                               | Future REST contract                                                      |
| [DEPLOYMENT](docs/DEPLOYMENT.md) · [CI](docs/CI.md) · [RELEASE](docs/RELEASE.md) | Shipping it                                                               |
| [ROADMAP](docs/ROADMAP.md)                                                       | Phases                                                                    |
| [CONTRIBUTING-DEV](docs/CONTRIBUTING-DEV.md)                                     | Setup, recipes, definition of done                                        |
| [adr/](docs/adr/)                                                                | Decisions and their reasons                                               |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Agents: [CLAUDE.md](CLAUDE.md).

## License

Code is MIT, the brand is all rights reserved, and the tag data is CC BY 4.0.
The episode metadata belongs to the publisher. Details are in
[LICENSING.md](LICENSING.md).

Bastardpedia is an unofficial fan index. It is not affiliated with or endorsed
by _Behind the Bastards_, Cool Zone Media or iHeartMedia.
