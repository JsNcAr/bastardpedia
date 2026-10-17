# Data pipeline

Everything between the podcast's RSS feed and `public/data/catalog.json`. All
commands are TypeScript run directly by Node (ADR 0003). Field definitions are
in [DATA_MODEL.md](DATA_MODEL.md).

## Source

The official feed, hosted by Omny for iHeartPodcasts (Apple Podcasts id
`1373812661`). One request returns the whole back catalogue: 1,192 items from
2018-04-18 on, as of 2026-10-16. 1,186 of them link a transcript. The URL is in
`pipeline/ingest.ts`.

## Commands

| Command                                                      | Reads                                        | Writes                                       | Notes                                                  |
| ------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `npm run pipeline:ingest [-- <file>]`                        | feed URL, or a local file                    | `data/raw/podcast.rss`, `data/episodes.json` |                                                        |
| `npm run pipeline:group`                                     | `data/episodes.json`                         | `data/stories.json`                          | Groups parts into stories and classifies kinds         |
| `npm run pipeline:status [-- --fail-on-untagged]`            | stories, tags                                | stdout                                       | Counts by kind, tagged and untagged                    |
| `npm run pipeline:sync`                                      | feed                                         | all of the above                             | ingest + group + status                                |
| `npm run pipeline:transcripts [-- --story <id>] [--limit N]` | episodes, stories                            | `data/transcripts/<guid>.txt`                | 1 request/second, skips existing files                 |
| `npm run tags:packet -- <story-id>`                          | stories, episodes, transcripts, taxonomy     | `data/packets/<id>.md`                       | Fetches missing transcripts for that story             |
| `npm run tags:validate [-- <id>...]`                         | `data/tags/*.json`                           | stdout, exit 1 on error                      | See [TAGGING.md](TAGGING.md)                           |
| `npm run tags:verify-wikidata`                               | tags                                         | stdout                                       | Network. Checks QIDs against labels, overrides applied |
| `npm run tags:schema`                                        | schemas, taxonomy                            | `tagging/schema/story-tags.schema.json`      | Rerun after any taxonomy change                        |
| `npm run taxonomy:doc`                                       | taxonomy                                     | `docs/taxonomy-reference.md`                 | Rerun after any taxonomy change                        |
| `npm run build:catalog`                                      | stories, episodes, tags, overrides, taxonomy | `public/data/catalog.json`                   | Run by CI before `npm run build`                       |

## What is committed

| Path                                      | Committed | Why                                                            |
| ----------------------------------------- | --------- | -------------------------------------------------------------- |
| `data/episodes.json`, `data/stories.json` | yes       | Reproducible inputs, reviewable diffs when new episodes arrive |
| `data/tags/`, `data/overrides/`           | yes       | The catalogue's real content                                   |
| `data/raw/`                               | no        | 8.8 MB feed snapshot, re-downloadable                          |
| `data/transcripts/`, `data/packets/`      | no        | Copyrighted and about 100 MB (ADR 0007)                        |
| `public/data/catalog.json`                | no        | Generated at build                                             |

## Story kinds

`pipeline/group.ts` sorts every item into one kind. Only `episode` is tagged.

| Kind          | Rule                                         | Count (2026-10-16) |
| ------------- | -------------------------------------------- | ------------------ |
| `episode`     | everything else                              | 454                |
| `ichh_weekly` | "It Could Happen Here Weekly N"              | 251                |
| `other_show`  | "Episode N: Uprising: A Guide From Portland" | 10                 |
| `fiction`     | "After the Revolution: Chapters…"            | 8                  |
| `rerun`       | "CZM Rewind:" with no matching original      | 8                  |
| `trailer`     | contains "Trailer"                           | 3                  |

Reruns that do match an original are attached to it as `reruns[]`, not counted
separately.

## Adding new episodes

New episodes appear in the feed on Tuesdays and Thursdays.

1. `npm run pipeline:sync`. The status line lists new untagged stories.
2. Check the grouping. A new Part Two should join its Part One. If a retitled
   part went astray, the 45-day rule in `group.ts` is the place to look.
3. Tag each new story ([TAGGING.md](TAGGING.md)), then run `npm run tags:validate`.
4. Commit `data/` with `feat(tags): tag <story>`. The next release ships it.

The scheduled `feed_sync` CI job runs steps 1–2 weekly and fails when untagged
stories exist, as a reminder (docs/CI.md). Turn its schedule on once the
back catalogue is fully tagged. Until then it would fail every week.

## Known grouping edge cases

- Stories whose parts aired more than 45 days apart with different titles split
  in two. Fix them by hand-merging in an override list if one ever appears.
- A handful of reruns ("Kissinger Parts 1-3") don't match their original's title
  and stay as `rerun` stories. They are never tagged.
