# 0001. A static catalog file instead of a database

Date: 2026-10-16

## Status

Accepted

## Context

The catalogue holds about 450 tagged stories and grows by roughly one story a
week. Visitors only read it. Writes happen in one place: the tagging workflow on
a workstation, reviewed by a person, committed to the repository.

The server already serves several static sites through Caddy with no
application processes, and ChronoTeach established that pattern.

## Decision

The pipeline builds one JSON file, `public/data/catalog.json`, validated
against `shared/schemas/catalog.ts`, and ships it with each release. The app
loads it once, caches it through the service worker, and does all filtering and
search in memory.

The app reaches the catalog only through the `CatalogSource` interface, as in
ChronoTeach's repository pattern. A later HTTP adapter (contract in
`docs/API.md`) can replace the static one without touching components.

## Consequences

**Accepted.** No backend, no database, nothing to keep running. Filtering is
instant, and the site works offline after the first visit. The data's history is
the git history.

**Cost.** The whole catalog downloads on the first visit (estimated at
~150 KB gzipped for 450 stories). That stays fine into the low thousands of
stories, well past the show's likely lifetime.

**Cost.** Updating the catalog means cutting a release. That matches the tagging
cadence.
