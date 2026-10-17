# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The taxonomy has its own version (`tagging/taxonomy/VERSION`); its changes are
logged in `docs/TAXONOMY.md` and called out here when they affect the app.

## [Unreleased]

### Added

- Data pipeline: the official RSS feed parsed into episodes and grouped into
  stories (1,192 episodes, 454 tagged-to-be stories), transcript fetching, tagging
  packets, tag validation, Wikidata verification and the catalog build.
- Tag specification 0.2.0: formats, subject kinds, 32 roles, 42 themes,
  polities, eras, content warnings, the model-agnostic agent prompt and the
  Claude Code `btb-tagger` subagent.
- App shell: catalog with faceted filters in the URL, search, story detail,
  personal library, installable PWA.
- Timeline view in the catalogue (`view=timeline`): a density strip that sets
  the year range by dragging, and one bar per story on an axis that fits the
  results, with years covered and main events told apart.
- Marking many stories at once: a one-tap Listened toggle on every row, a
  select mode in the catalogue, and a catch-up page that marks everything
  released in chosen months, all with Undo.
- CI, generated Caddy configuration and the release script.
- `deploy/deploy.sh`: build and publish a commit from a checkout on the
  server, with the deploy user's own Node from `.nvmrc`.

### Changed

- The site launches public: no basic auth and no `noindex`. Making it private
  again is one config switch (docs/DEPLOYMENT.md).
- The generated Caddyfile spells basic auth `basicauth`, so it also loads on
  Caddy 2.6 and 2.7.
