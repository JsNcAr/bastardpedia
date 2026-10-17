# Releasing

A release is a version tag. Pushing it runs the `release` workflow
(`.github/workflows/release.yml`): the `release` job, then `deploy` once deploys
are enabled ([CI.md](CI.md)). The flow is ChronoTeach's without the Android half. There's no
`release:publish` until Capacitor exists (ADR 0004).

## Cut a release

```sh
npm run release -- minor       # or patch, major, or an explicit 1.2.0-rc.1
```

`scripts/release.mjs prepare`:

1. Refuses unless you're on a clean, up-to-date `main` and the tag is new.
2. Runs typecheck, lint, unit tests, `tags:validate` and the Caddyfile check.
3. Bumps `package.json`, the lockfile and the README status line.
4. Turns `CHANGELOG.md`'s Unreleased section into the release. If it's empty,
   it writes the section from the Conventional Commits since the last tag.
5. Commits `build(repo): release vX.Y.Z` and creates an annotated tag.
6. Asks before one atomic push of `main` and the tag.

Useful flags: `--dry-run`, `--no-push`, `--skip-checks`, `--yes`.

To undo before pushing: `git tag -d vX.Y.Z && git reset --hard HEAD~1`.

## What to release

- **Content releases:** new or corrected tags. Usually a `patch`, written as
  `feat(tags): …` or `fix(tags): …` commits.
- **App releases:** features or fixes, `minor` or `patch`.
- **Taxonomy major versions** that re-tag the catalogue: `minor` for the app,
  noted in the changelog.

## After the workflow

- Check the site, and that the version in the footer or about page matches.
- A changed `deploy/Caddyfile` needs an admin to copy it to the server and reload
  Caddy ([DEPLOYMENT.md](DEPLOYMENT.md)).
