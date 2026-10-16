# Bastardpedia: agent instructions

A static web app for finding _Behind the Bastards_ stories by topic, region and
historical period. Read `docs/ARCHITECTURE.md` first. These rules apply to every
change.

## Rules that are not negotiable

1. **The taxonomy is the source of truth.** Tag ids come only from
   `tagging/taxonomy/*.yaml`. Never invent, rename or pluralise an id in code,
   tags or tests. Changing the taxonomy follows the steps in `docs/TAXONOMY.md`
   (version bump, `npm run tags:schema`, `npm run taxonomy:doc`).
2. **Never commit or ship transcript text.** `data/transcripts/` and
   `data/packets/` stay gitignored. Tag evidence is timestamps plus your own
   notes, never quotations (ADR 0007).
3. **Don't hand-edit agent tag records to fix them.** Corrections go in
   `data/overrides/<story-id>.json`.
4. **Schemas live once, in `shared/schemas/`.** The app and the pipeline import
   them. Don't redeclare their types.
5. **The URL owns filter state.** Don't move filters into Zustand or component
   state.
6. **No inline styles, no hard-coded colours or sizes.** Use tokens
   (`design-tokens.json`). The CSP forbids `unsafe-inline`.
7. **No emoji** in code, UI copy, docs or commits.
8. **Renaming goes through `project.config.json`**, never a find-and-replace of
   the name or host.
9. **Measure, don't claim.** Report test, lint and build results as they
   actually ran.

## Tagging stories

Use the `btb-tagger` subagent (`.claude/agents/btb-tagger.md`), which follows
`tagging/PROMPT.md`. Always finish with `npm run tags:validate`. Workflow and
review: `docs/TAGGING.md`.

## Commands

```sh
npm run dev | build | verify | e2e
npm run pipeline:sync                 # feed -> episodes -> stories -> status
npm run tags:packet -- <story-id>     # input for a tagging agent
npm run tags:validate [-- <id>]
npm run build:catalog                 # public/data/catalog.json
```

## Commits

Conventional Commits with the scopes in `commitlint.config.js` (app, catalog,
story, library, data, ui, tokens, pipeline, tagging, taxonomy, tags, docs, ci,
deploy, deps, repo). Header 72 characters at most. Never push without being
asked.
