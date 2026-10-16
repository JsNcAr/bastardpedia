# Architecture

Bastardpedia is a static, offline-first web app with no server-side code. A data
pipeline turns the podcast's RSS feed into a tagged catalog file. The app loads
that file and filters it in memory.

## The shape of it

```
 RSS feed (Omny)                                     ┌─────────────── app (browser) ───────────────┐
      │                                              │                                              │
 pipeline/ingest.ts ──► data/episodes.json           │  CatalogSource ──► TanStack Query ──► UI     │
      │                                              │   (static.adapter: /data/catalog.json)       │
 pipeline/group.ts  ──► data/stories.json            │                                              │
      │                                              │  URL query string ──► filter model           │
 pipeline/fetch-transcripts.ts ──► data/transcripts/ │   (filterStories, facetCounts, MiniSearch)   │
      │                     (gitignored)             │                                              │
 pipeline/packet.ts ──► data/packets/<id>.md         │  LibraryRepository (Dexie / IndexedDB)       │
      │                     (gitignored)             │   personal lists: want, listened, notes      │
 tagging agent (tagging/PROMPT.md)                   │                                              │
      │                                              │  Zustand: UI-only state (drawer, theme)      │
 data/tags/<id>.json  +  data/overrides/<id>.json    └──────────────────────────────────────────────┘
      │                                                                   ▲
 pipeline/build-catalog.ts ──► public/data/catalog.json ──────────────────┘
                                 (generated at build, no transcript text)
```

## Layers

| Layer        | Where                                           | Responsibility                                                                                               |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Schemas      | `shared/schemas/`                               | Zod definitions of Episode, Story, StoryTags and Catalog, shared by the pipeline and the app (ADR 0003)      |
| Taxonomy     | `tagging/taxonomy/*.yaml`, `shared/taxonomy.ts` | The controlled vocabularies and named eras, and their loader                                                 |
| Derivation   | `shared/derive.ts`                              | Centuries, eras by overlap, country to continent/subregion (UN M49 via `world-countries`)                    |
| Pipeline     | `pipeline/`                                     | Feed, grouping, transcripts, packets, validation, catalog build. Runs in Node                                |
| Tagging      | `tagging/`, `.claude/agents/btb-tagger.md`      | The model-agnostic agent prompt and the Claude Code subagent wrapper                                         |
| Data access  | `src/data/`                                     | `CatalogSource` (static now, HTTP later) and `LibraryRepository` (Dexie). Components never import an adapter |
| Server state | `src/app/queries.ts`                            | TanStack Query hooks over the data layer                                                                     |
| Features     | `src/features/catalog`, `story`, `library`      | The filter model, search, and screens                                                                        |
| UI kit       | `src/ui/`, `src/styles/`                        | Components and CSS built on design tokens                                                                    |

## State ownership

| State                             | Owner                                                   | Why                                                                                                |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Catalog                           | TanStack Query (`staleTime: Infinity`)                  | Loaded once per session, read-only                                                                 |
| Active filters, search text, sort | **URL query string**                                    | Shareable, survives reload, back button works (ADR 0002)                                           |
| Selected story                    | URL path `/stories/:id`                                 | Same                                                                                               |
| Personal library                  | Dexie, through `LibraryRepository`                      | Must persist on the device, and is shaped (`Crud<T>`, tombstones, `changedSince`) for a later sync |
| Drawer open, theme preference     | Zustand (theme mirrored to `localStorage` in try/catch) | UI-only                                                                                            |

## Filtering semantics

- Filters combine with **AND across facets** and **OR within a facet**.
- A theme filter matches a story's primary or secondary themes. A country
  filter matches origin or setting.
- Period filters (eras, centuries) match `derived.eras` and
  `derived.centuries`, which `build-catalog` computed from `time.covered_span` (regional eras also need a matching origin, setting or polity).
  They are orientative (docs/TAXONOMY.md).
- Facet counts show how many results each option would give, with the other
  active filters applied.
- Free-text search is MiniSearch over title, summary, subject names, keywords
  and guests, with prefix and fuzzy matching.

## Routes

| Path           | Screen                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| `/`            | Catalog. Desktop (≥ 1100 px): facet sidebar, results, detail pane      |
| `/stories/:id` | Story detail: the right pane on desktop, a full page on narrow screens |
| `/library`     | Personal lists                                                         |
| `/about`       | What this is, sources, credits                                         |

## Offline and caching

The service worker (vite-plugin-pwa) precaches the shell. The catalog is
fetched network-first, with the cached copy as fallback, so a release reaches
returning visitors on their next online visit. Caddy sends `no-cache` for the
HTML, the service worker and `/data/*`, and caches fingerprinted assets
forever.

## Configuration

`project.config.json` is the single rename point (name, host, deploy path,
GitLab project). Vite reads it for the title and manifest. The release script
reads it for URLs. `scripts/deploy-config.mjs` generates `deploy/Caddyfile` from
it.
