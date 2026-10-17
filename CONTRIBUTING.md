# Contributing

## Before you start

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and
[docs/TAXONOMY.md](docs/TAXONOMY.md) if you're touching tags. Setup and recipes
are in [docs/CONTRIBUTING-DEV.md](docs/CONTRIBUTING-DEV.md).

## The rules that are not negotiable

1. **Closed vocabularies.** Tag ids come only from `tagging/taxonomy/`. Changing
   the taxonomy means a version bump and regenerating the schema and reference.
2. **No transcript text in the repository or the site.** Evidence is timestamps.
   Summaries are original wording.
3. **Human corrections are overrides**, never edits to agent records.
4. **No hard-coded design values and no inline styles.** Tokens only.
5. **Accessibility from the start**: keyboard, visible focus, AA contrast in
   light and dark.
6. **No emoji** anywhere, including commits and docs.
7. **Report what you measured.** Never claim a test, number or result you
   didn't run.

## Workflow

- Branch from `main`, open a pull request, and let CI pass.
- Keep changes focused. Content (tags) and code go in separate commits.
- `npm run verify` before pushing. `npm run e2e` too if the UI changed.

## Commit format

[Conventional Commits](https://www.conventionalcommits.org/), checked by
commitlint. Scopes: app, catalog, story, library, data, ui, tokens, pipeline,
tagging, taxonomy, tags, docs, ci, deploy, deps, repo.

```
feat(catalog): add century facet
feat(tags): tag the Francis Galton series
fix(pipeline): keep retitled part two with its series
docs(taxonomy): clarify sexual-abuse vs child-abuse
```

## Releases

`npm run release -- <patch|minor|major>`. See [docs/RELEASE.md](docs/RELEASE.md).
