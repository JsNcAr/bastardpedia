# Data model

Every record is defined once as a Zod schema in `shared/schemas/`. This page
explains the fields. The schemas are authoritative if the two ever disagree.

## Episode (`data/episodes.json`)

One per RSS item, sorted oldest first. Schema: `shared/schemas/episode.ts`.

| Field                | Type           | Notes                                          |
| -------------------- | -------------- | ---------------------------------------------- |
| `guid`               | string         | Stable feed id, the episode's key              |
| `title`              | string         | As published                                   |
| `published`          | ISO datetime   |                                                |
| `duration_s`         | int \| null    |                                                |
| `description`        | string         | HTML stripped, iHeart/Omny boilerplate removed |
| `link`               | string \| null | Official episode page                          |
| `audio_url`          | string \| null |                                                |
| `transcript_url`     | string \| null | Omny plain text with timestamps                |
| `transcript_srt_url` | string \| null |                                                |

## Story (`data/stories.json`)

Parts of one series grouped together. Schema: `shared/schemas/episode.ts`.

| Field             | Type                                                                            | Notes                                                          |
| ----------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `id`              | string                                                                          | Slug of the first part's subject title. Also the tag file name |
| `kind`            | `episode` \| `rerun` \| `ichh_weekly` \| `trailer` \| `fiction` \| `other_show` | Only `episode` stories are tagged and shipped                  |
| `subject_title`   | string                                                                          | The title with "Part N:" removed                               |
| `first_published` | ISO datetime                                                                    |                                                                |
| `parts[]`         | `{guid, title, part, published}`                                                | Sorted by part number                                          |
| `reruns[]`        | same                                                                            | "CZM Rewind" airings matched to this story                     |

Grouping rules (`pipeline/group.ts`):

1. A part joins the story with the same normalised subject title.
2. Otherwise, a "Part N" joins the newest open series whose last part is N−1,
   published within 45 days. This handles early series that retitle every part.

## StoryTags (`data/tags/<story-id>.json`)

Written by the tagging agent and validated by `npm run tags:validate`. Schema:
`shared/schemas/story-tags.ts`, with vocabularies from `tagging/taxonomy/`.
JSON Schema for agents: `tagging/schema/story-tags.schema.json`.

| Field                    | Type                                                            | Rules                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `story_id`               | string                                                          | Must equal the file name and an `episode` story                                                                                                              |
| `taxonomy_version`       | semver                                                          | The `tagging/taxonomy/VERSION` it was tagged against                                                                                                         |
| `tagged_by`              | `{agent, model?, date}`                                         | Provenance                                                                                                                                                   |
| `format`                 | id from `formats.yaml`                                          | Exactly one                                                                                                                                                  |
| `subjects[]`             | 1–5 entries                                                     | `name`, `kind`, `org_type` (organizations only), `role` primary/secondary, optional `lifespan` (persons only), optional `wikidata` QID. At least one primary |
| `roles[]`                | 0–3 ids from `roles.yaml`                                       | Required when a primary subject is a person or group                                                                                                         |
| `themes`                 | `{primary, secondary[0–4]}` from `themes.yaml`                  | No duplicates                                                                                                                                                |
| `regions.origin[]`       | 0–4 ISO 3166-1 alpha-2                                          | Where primary subjects come from, modern borders                                                                                                             |
| `regions.setting[]`      | 0–6 ISO 3166-1 alpha-2                                          | Where events happen. Required unless scope is `online`                                                                                                       |
| `regions.subdivisions[]` | 0–6 ISO 3166-2                                                  | Only when one state or province is central                                                                                                                   |
| `regions.polities[]`     | 0–3 ids from `polities.yaml`                                    | Historical states that matter to the story                                                                                                                   |
| `regions.scope`          | local · national · international · global · online              |                                                                                                                                                              |
| `time`                   | `{main_span {start,end}, reaches_present, approximate}` \| null | Years of the main events, negative = BCE, `end: null` = ongoing. Null only for crossover/meta                                                                |
| `summary`                | 40–300 chars                                                    | Original wording, publishable                                                                                                                                |
| `content_warnings[]`     | 0–6 ids from `content-warnings.yaml`                            | Only for detailed descriptions                                                                                                                               |
| `keywords[]`             | 0–10 strings                                                    | Search aids that are not ids                                                                                                                                 |
| `guests[]`               | strings                                                         | Guests and co-hosts other than Robert Evans                                                                                                                  |
| `confidence`             | high/medium/low per facet                                       | Low-confidence records are reviewed first                                                                                                                    |
| `evidence[]`             | 0–12 `{facet, part, at: "HH:MM:SS", note}`                      | Timestamps, never quotations (ADR 0007)                                                                                                                      |
| `notes`                  | ≤ 500 chars, optional                                           | For the reviewer                                                                                                                                             |

## Overrides (`data/overrides/<story-id>.json`)

A partial StoryTags object, deep-merged over the agent's record at catalog build.
Arrays replace, they don't concatenate. Re-tagging never touches overrides.

## Catalog (`public/data/catalog.json`)

The only file the app loads. Schema: `shared/schemas/catalog.ts` (`catalog/1`).

| Field                                        | Notes                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`, `generated_at`, `taxonomy_version` |                                                                                                                                                          |
| `vocab`                                      | Every vocabulary as `{id, label, definition, group?}`, so the app needs no YAML                                                                          |
| `eras[]`                                     | From `eras.yaml`                                                                                                                                         |
| `countries[]`                                | Only countries used by some story: `{code, name, continent, subregion}`                                                                                  |
| `stories[]`                                  | Story metadata (title, parts with durations and official links, guests) + tags (overrides applied) + `derived {centuries, eras, continents, subregions}` |

Only stories that have a tag record are included.

## Library (IndexedDB, `src/data/library.ts`)

Per-device personal data, one record per story:
`{id: storyId, status: 'want' | 'listened' | null, favourite, note, createdAt, updatedAt, deletedAt}`.
It uses ChronoTeach's `Crud<T>` interface (soft deletes, `changedSince`) so a
future sync can use it as is.
