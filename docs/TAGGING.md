# Tagging

How stories get their tags. What the tags mean is in [TAXONOMY.md](TAXONOMY.md).
The agent's instructions are [`tagging/PROMPT.md`](../tagging/PROMPT.md).

## The contract

- **Input:** a story packet built by `npm run tags:packet -- <story-id>` into
  `data/packets/<id>.md`. It contains the metadata, every part's description,
  transcript excerpts (the first ~15k words of Part 1 and the first ~2k words of
  each later part) and the full taxonomy.
- **Instructions:** `tagging/PROMPT.md`. It names no model or tool and works as
  a system prompt, a chat message or a subagent body.
- **Output:** one JSON object, valid against
  `tagging/schema/story-tags.schema.json` and `npm run tags:validate`, saved as
  `data/tags/<story-id>.json`.

The same three pieces work with any agent. Only the runner changes.

## Runner 1: Claude Code subagent (default)

`.claude/agents/btb-tagger.md` wraps the prompt. In a Claude Code session in this
repository:

> Use the btb-tagger agent to tag `heinrich-schliemann-the-archaeologist-who-destroyed-troy`.

The subagent builds the packet, writes the record, runs validation and fixes
its own errors. For a batch, ask for several story ids. Claude Code runs the
subagents in parallel. Keep batches around 10 so review stays manageable.

## Runner 2: any chat assistant

1. `npm run tags:packet -- <story-id>`
2. Paste `tagging/PROMPT.md` as the first message (or the system prompt), then
   paste the packet.
3. Save the reply as `data/tags/<story-id>.json`.
4. `npm run tags:validate -- <story-id>`. Paste any errors back to the assistant.

## Runner 3: API (later)

A script that sends `PROMPT.md` as the system prompt and the packet as the user
message, with structured output constrained by
`tagging/schema/story-tags.schema.json`, then writes and validates the result.
Planned for CI tagging of new episodes (docs/ROADMAP.md). The JSON Schema can't
express the cross-field rules, so `tags:validate` still runs after it.

## Review

A person reviews the stories they have actually listened to, field by field, on
the review page. Everything else ships **unreviewed**: validated, but checked
only by the agent. The app marks these with an "Unreviewed" badge and a note on
the story page, and readers can switch to "Reviewed by a person only".

Reviewed stories are listed in `data/review-status.json`
(`{"<story-id>": {"status": "reviewed", "date": "YYYY-MM-DD"}}`, schema
`shared/schemas/review-status.ts`). Tag records are never touched to mark a
review (CLAUDE.md rule 3). A story missing from the file is unreviewed.

For unreviewed stories, spot-check in this order:

1. Records with any `low` confidence, or non-empty `notes` (each batch's
   `tagging/batches/batch-NN-report.json` lists them).
2. Records whose `format` isn't `deep-dive`.
3. About one story in ten from each batch, chosen at random.

If a spot check finds a pattern rather than a one-off, fix the definition in the
taxonomy and re-tag the affected stories instead of writing many overrides.

To correct a record, don't edit the agent's file. Write the change as an
override:

```jsonc
// data/overrides/percy-fawcett-real-life-indiana-jones-or-deluded-psychic-racist.json
{
  "themes": {
    "primary": "science-exploration",
    "secondary": ["colonialism-imperialism", "occult-esoteric"],
  },
}
```

Overrides are deep-merged at catalog build (arrays replace), so re-tagging with
a newer taxonomy never loses a human decision.

## Calibration before the full run

1. **Gold set:** six stories tagged by hand and checked against their
   transcripts, saved in `tagging/examples/` with their packets: Schliemann,
   Fawcett, the L. Ron Hubbard series, Nestlé, Cracktoberfest and one
   media-reading episode. They are also validator test fixtures.
2. **Pilot:** about 25 stories spread across eras and formats, tagged by the
   subagent and reviewed. Disagreements go back into the definitions in
   `tagging/taxonomy/` (a patch or minor bump).
3. **Full run:** the remaining stories in batches of 25
   (`tagging/batches/batch-NN.txt`, newest first). A coordinator agent builds
   the packets, runs one `btb-tagger` per story, validates the batch and writes
   `batch-NN-report.json`. The first batch is the confirmation check: watched
   stories in it are reviewed against the 90% bar the pilot used.

## When the taxonomy changes

After editing `tagging/taxonomy/*.yaml`:

1. Bump `tagging/taxonomy/VERSION` (rules in TAXONOMY.md).
2. `npm run tags:schema && npm run taxonomy:doc`
3. `npm run tags:validate`. Records tagged against an older major version fail
   and must be migrated or re-tagged. Older minor versions only warn.
