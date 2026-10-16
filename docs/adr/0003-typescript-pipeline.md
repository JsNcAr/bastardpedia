# 0003. A TypeScript data pipeline

Date: 2026-10-16

## Status

Accepted

## Context

The first feed parser and grouper were Python scripts written to prove the data
was there. ChronoTeach mixed Node `.mjs` scripts and Python. The pipeline writes
the exact records the app reads, and tag records must match a schema that both
sides check.

## Decision

The pipeline is TypeScript in `pipeline/`, run directly by Node's native type
stripping (`node pipeline/ingest.ts`, no build step). Zod schemas in `shared/`
are the single definition of Episode, Story, StoryTags and Catalog, imported by
the pipeline and the app alike. The JSON Schema for agents is generated from
them. The Python scripts were deleted once the TypeScript port reproduced their
output exactly.

## Consequences

**Accepted.** One language, one set of types, one lint and test setup. A schema
change breaks compilation everywhere it matters.

**Cost.** Pipeline files must stick to erasable TypeScript (no enums, namespaces
or parameter properties) and explicit `.ts` import extensions.
`erasableSyntaxOnly` enforces this.
