# Developer guide

## Setup

```sh
nvm install 24 && nvm use      # .nvmrc pins Node 24 LTS
npm install                    # also installs the git hooks (husky)
npm run pipeline:sync          # optional: refresh episodes/stories from the feed
npm run build:catalog          # public/data/catalog.json from the committed tags
npm run dev
```

Node 22.18 or newer can run the pipeline (native TypeScript), but `engines`
asks for 24 and CI uses the Playwright image's Node.

## Where things live

| Path                     | What                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `src/app/`               | routes, providers, layout shell, query hooks                                                                       |
| `src/features/catalog/`  | filter model (URL ⇄ filters), `filterStories`, `facetCounts`, search index, results                                |
| `src/features/story/`    | story detail                                                                                                       |
| `src/features/library/`  | personal lists                                                                                                     |
| `src/data/`              | `CatalogSource` + adapters, `LibraryRepository` (Dexie). The only place adapters are chosen is `src/data/index.ts` |
| `src/ui/`, `src/styles/` | components and CSS. One CSS file per component                                                                     |
| `shared/`                | Zod schemas, taxonomy loader, derivation helpers. Used by the app and the pipeline                                 |
| `pipeline/`              | Node scripts (see docs/DATA_PIPELINE.md)                                                                           |
| `tagging/`               | prompt, taxonomy, generated JSON Schema, gold examples                                                             |
| `scripts/`               | build helpers (tokens, icons, deploy config) and the release script                                                |
| `e2e/`                   | Playwright specs, run against the production build                                                                 |

## Tests

- `npm test`: Vitest. Unit tests sit next to the code (`*.test.ts`). The
  catalog fixture is `src/test/fixtures/catalog.sample.json`, sample data marked
  by `sample-` ids.
- `npm run e2e`: Playwright against `vite preview`, on desktop and mobile
  viewports. The specs serve the sample catalog by intercepting
  `/data/catalog.json`, so they don't depend on tagging progress.

## Recipes

### Add a tag to the taxonomy

1. Add the entry to `tagging/taxonomy/<facet>.yaml` with `id`, `label`,
   `definition`, `examples`, and `include_when`/`exclude_when` if it borders
   another tag.
2. Bump `tagging/taxonomy/VERSION` (minor).
3. `npm run tags:schema && npm run taxonomy:doc`
4. Note it in the decisions log in `docs/TAXONOMY.md`.
5. Commit as `feat(taxonomy): add <id>`.

No app code changes: the catalog carries every vocabulary.

### Add a filter facet to the UI

Extend the filter model in `src/features/catalog/` (parse, serialize, match,
count), add unit tests, then render it in the sidebar.

### Add an icon

Add the lucide name to `ICONS` in `scripts/build_icons.mjs`, then run `npm run icons`.

### Change a colour or size

Edit `design-tokens.json` and run `npm run tokens`. Never hard-code values in CSS
(docs/DESIGN_SYSTEM.md).

## Definition of done

- `npm run verify` passes, and `npm run e2e` passes when the UI changed.
- New logic has unit tests.
- Keyboard works and focus is visible. Light and dark themes both checked.
- Docs updated when behaviour, commands or data shapes changed.
