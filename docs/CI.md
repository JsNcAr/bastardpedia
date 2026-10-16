# CI

Self-hosted GitLab (`gitlab.apollyon.lat`) with the shared Docker runner, the
same setup as ChronoTeach. Configuration: [`.gitlab-ci.yml`](../.gitlab-ci.yml).

## Jobs

| Job                | When                                     | What                                                                                                                           |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `checks`           | every pipeline except tags and schedules | Playwright version pin check, tokens, icons, typecheck, lint, format check, unit tests, `tags:validate`, Caddyfile drift check |
| `build`            | when something that renders changed      | `build:catalog`, `build`, e2e. Keeps `dist/` for a week                                                                        |
| `release`          | version tags                             | `check-version`, typecheck, lint, tests, `tags:validate`, catalog, build, e2e. Keeps `dist/` for 90 days                       |
| `deploy_web`       | `vX.Y.Z` tags, after `release`           | rsync of the tested `dist/` to the server, then a byte comparison of the live `index.html`                                     |
| `feed_sync`        | scheduled                                | ingest + group, fails when untagged stories exist                                                                              |
| `secret_detection` | GitLab template                          |                                                                                                                                |

All Node jobs use `mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble`.
`checks` fails if `PLAYWRIGHT_VERSION` differs from `@playwright/test` in
`package-lock.json`, so bump both together.

## Variables (Settings > CI/CD > Variables)

| Variable          | Flags             | Purpose                                                               |
| ----------------- | ----------------- | --------------------------------------------------------------------- |
| `SSH_PRIVATE_KEY` | masked, protected | base64 of a deploy key used only by this repository, for `app-runner` |
| `SERVER_IP`       | protected         | server address or name                                                |
| `SITE_AUTH`       | masked, protected | `user:password` for the live check while the site is private          |

Protect tags `v*` so tag pipelines receive the protected variables.

## Schedule

Create a weekly schedule (CI/CD > Schedules, e.g. Friday 08:00) on `main` to run
`feed_sync`. Enable it once the back catalogue is fully tagged. Before that it
fails every week by design.

## Local equivalents

```sh
npm run verify                 # typecheck + lint + unit tests
npm run tags:validate
node scripts/deploy-config.mjs --check
npm run build:catalog && npm run build && npm run e2e
```
