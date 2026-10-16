# 0006. Optional Wikidata ids, always verified

Date: 2026-10-16

## Status

Accepted

## Context

Subjects are free-text names. Linking them to Wikidata would disambiguate
people and enable richer pages later (images, dates, links). Language models
sometimes produce plausible but wrong QIDs.

## Decision

`subjects[].wikidata` is optional, and the prompt tells agents to include a QID
only when certain. `npm run tags:verify-wikidata` checks every QID's label and
aliases against the subject name and flags mismatches for review.

## Consequences

**Accepted.** QIDs that pass are trustworthy, and their absence costs nothing
now.

**Cost.** Verification needs network access to Wikidata, so it runs on demand,
not in CI.
