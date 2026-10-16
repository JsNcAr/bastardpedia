# 0005. Facets that don't overlap, with derived periods and regions

Date: 2026-10-16

## Status

Accepted

## Context

The point of the app is filtering by topic, region and historical period. Tags
written by AI agents drift when the vocabulary is open ("explorer",
"exploration", "adventurer"). A period like "Victorian" means different things
to different people, and hard-coding it as a tag would freeze one meaning.

## Decision

- Closed vocabularies in `tagging/taxonomy/*.yaml`, semver-versioned.
- Separate facets for format, roles (what people were) and themes (what a
  story is about).
- Regions are stored as modern ISO 3166 codes for where subjects came from
  (origin) and where the story happened (setting). Continents and subregions
  are derived from the codes.
- Time is stored as the integer years of the story's main events. Centuries,
  broad periods and named eras are derived by overlap. Period filters are
  orientative: there is no lifetime-based matching.

See `docs/TAXONOMY.md`.

## Consequences

**Accepted.** The agent makes few, well-defined judgements. Everything else is
computed consistently, and new eras can be added without re-tagging.

**Cost.** Edge cases (a subject whose fame comes just after an era ends) fall
outside that era's filter. That is accepted, since the filters only orient.
