# CI

GitHub Actions at
[github.com/JsNcAr/bastardpedia](https://github.com/JsNcAr/bastardpedia). The
workflows live in [`.github/workflows/`](../.github/workflows). The project
moved here from a self-hosted GitLab in October 2026, and the jobs are the
same.

## Workflows

| Workflow        | When                                 | What                                                                                                     |
| --------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `ci.yml` checks | every push to a branch, and every PR | tokens, icons, typecheck, lint, format check, unit tests, `tags:validate`, Caddyfile drift check         |
| `ci.yml` build  | after checks                         | `build:catalog`, `build`, e2e with Chromium. The Playwright report is kept for a week                    |
| `release.yml`   | `vX.Y.Z` tags                        | `check-version`, typecheck, lint, tests, `tags:validate`, catalog, build, e2e. Keeps `dist/` for 90 days |
| `release.yml`   | after release, if deploy is enabled  | rsync of the tested `dist/` to the server, then a byte comparison of the live `index.html`               |
| `feed-sync.yml` | Mondays 06:17 UTC, or by hand        | ingest + group. Fails when a story in the feed has no tags                                               |

The jobs run on `ubuntu-latest` with the Node version from `.nvmrc`. Playwright
installs the Chromium that matches `@playwright/test` in `package-lock.json`, so
there's no image tag to keep in step.

## Deploy settings

The deploy job is off until it's configured, so tags only build and test.

1. **Variable:** in Settings > Secrets and variables > Actions > Variables, set
   `DEPLOY_ENABLED` to `true`.
2. **Environment:** in Settings > Environments, create `production`. Restrict
   it to tags matching `v*`, and add a reviewer if you want to approve every
   deploy.
3. **Environment secrets:**

   | Secret            | Purpose                                                                   |
   | ----------------- | ------------------------------------------------------------------------- |
   | `SSH_PRIVATE_KEY` | a deploy key used only by this repository, for `app-runner` (the raw key) |
   | `SERVER_IP`       | server address or name                                                    |
   | `SITE_AUTH`       | `user:password` for the live check while the site is private              |

4. **Tag protection:** in Settings > Rules, add a tag ruleset so only you can
   create `v*` tags.

## Repository settings

- **Secret scanning:** in Settings > Code security, turn on secret scanning
  and push protection. They replace GitLab's secret-detection job.
- **Dependency alerts:** Dependabot alerts are optional.

## Local equivalents

```sh
npm run verify                 # typecheck + lint + unit tests
npm run format:check
npm run tags:validate
node scripts/deploy-config.mjs --check
npm run build:catalog && npm run build && npm run e2e
```
