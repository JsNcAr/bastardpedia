# Roadmap

| Phase            | Goal                                                                                                                | Status            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 0. Data check    | Confirm the feed has every episode and its transcript                                                               | Done (2026-10-16) |
| 1. Tag spec      | Taxonomy 0.2.0, agent prompt, schema                                                                                | Done (2026-10-16) |
| 2. Scaffold      | Docs, repo structure, app shell, TS pipeline, CI and deploy                                                         | In progress       |
| 3. Calibration   | 6 hand-checked gold records, then a ~25-story pilot. Tighten definitions                                            | Next              |
| 4. Full tagging  | All ~454 stories tagged and reviewed                                                                                |                   |
| 5. App MVP       | Filters, search, story pages and personal library on real data; first private deploy                                |                   |
| 6. Public launch | Drop basic auth, add an about page with sources and credits, SEO basics (per-story titles and meta, sitemap)        |                   |
| 7. Automation    | API runner for tagging new episodes from CI, opening a merge request for review                                     |                   |
| Later            | Capacitor app (ADR 0004), library sync backend (docs/API.md), Wikidata enrichment (ADR 0006), community corrections |                   |

## Adding Capacitor later

Follow ChronoTeach: `@capacitor/core`, `@capacitor/android` and `@capacitor/cli`
at 8.x, a committed `android/` project, `release:publish` restored from
ChronoTeach's `scripts/release.mjs` (signed APK/AAB, uploads, GitLab Release),
and the server scheme set so history routing falls back to `index.html`.
