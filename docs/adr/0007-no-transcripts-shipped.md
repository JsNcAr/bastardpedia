# 0007. Transcripts are input, never output

Date: 2026-10-16

## Status

Accepted

## Context

The podcast's RSS feed links Omny-generated transcripts. They are what makes
accurate tagging possible, because episode descriptions are too thin. They are
also iHeartMedia's copyrighted content, and the site is meant to go public.

## Decision

Transcripts are downloaded to `data/transcripts/` (gitignored) and used only to
build tagging packets (`data/packets/`, also gitignored). Tag records cite
evidence as timestamps with notes in the agent's own words, never quotations.
Summaries are original wording. The catalog carries metadata, our tags and
links to the official episode pages, never transcript text.

## Consequences

**Accepted.** The public site stays on the right side of the copyright line and
sends listeners to the official source.

**Cost.** A fresh clone has to re-download transcripts before tagging (about
100 MB, a few minutes with the 1 request per second politeness limit).
