# 0002. History routing instead of hash routing

Date: 2026-10-16

## Status

Accepted

## Context

ChronoTeach uses hash URLs (`/#/today`) so that any static host works without
configuration and Capacitor can load from `file://`. This project is a desktop
website first, meant to go public. Story pages and filtered views should have
URLs people can share and search engines can index, such as
`/stories/percy-fawcett?era=edwardian`.

## Decision

React Router with browser history. Caddy serves `index.html` for any path that
is not a file (`try_files {path} /index.html`, generated into
`deploy/Caddyfile`). Vite builds with an absolute base (`/`). Filter state lives
in the URL query string, so the URL is the shareable source of truth.

## Consequences

**Accepted.** Clean, shareable, indexable URLs, and a browser back button that
behaves.

**Cost.** The server needs the fallback rule. Our own Caddyfile has it. A
different host would need the equivalent.

**Cost.** A future Capacitor build needs its server scheme configured to serve
the SPA fallback, which Capacitor supports.
