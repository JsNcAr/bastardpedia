/**
 * Build public/data/catalog.json, the only data file the app loads.
 *
 * Inputs: data/stories.json (BtB stories only), data/episodes.json (durations, links,
 * descriptions), data/tags/<id>.json, and data/overrides/<id>.json deep-merged on top.
 * Only tagged stories are included. Derived fields (centuries, eras, continents) are
 * computed here. No transcript text ever reaches the catalog (docs/adr/0007).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { centuriesOf, countryInfo, erasOf, regionsOf } from '../shared/derive.ts';
import {
  CATALOG_SCHEMA,
  CatalogSchema,
  type Catalog,
  type CatalogStory,
  type Country,
  type Term,
} from '../shared/schemas/catalog.ts';
import type { Episode, Story } from '../shared/schemas/episode.ts';
import type { StoryTags } from '../shared/schemas/story-tags.ts';
import type { TermDef } from '../shared/taxonomy.ts';
import { loadEpisodes, loadStories, readJson } from './lib/io.ts';
import { deepMerge } from './lib/merge.ts';
import { CATALOG_FILE, OVERRIDES_DIR, REVIEW_STATUS_FILE, TAGS_DIR } from './lib/paths.ts';
import { ReviewStatusFileSchema, type ReviewStatusFile } from '../shared/schemas/review-status.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { makeValidator, releaseYearsOf } from './lib/validate.ts';

const GUEST_RE =
  /\b(?:is|are)?\s*joined(?: again| once again)? by ([^.;]+?)(?= to | for | in |\.|,|;|$)/i;

/** Guest names from a description like "Robert is joined by Margaret Killjoy to discuss ...". */
export function guestsFromDescription(description: string): string[] {
  const m = GUEST_RE.exec(description);
  if (!m?.[1]) return [];
  return m[1]
    .split(/\s*(?:,|\band\b|&)\s*/)
    .map((s) => s.replace(/^(?:the )?(?:returning |special )?(?:guest|co-host)s?\s+/i, '').trim())
    .filter((s) => /^[A-Z]/.test(s) && s.split(/\s+/).length <= 5);
}

function term(t: TermDef): Term {
  return t.group
    ? { id: t.id, label: t.label, definition: t.definition, group: t.group }
    : { id: t.id, label: t.label, definition: t.definition };
}

function toCatalogStory(
  story: Story,
  tags: StoryTags,
  episodes: Map<string, Episode>,
  now: number,
  reviewed: ReviewStatusFile[string] | undefined,
): CatalogStory {
  const parts = story.parts.map((p) => {
    const ep = episodes.get(p.guid);
    return {
      title: p.title,
      part: p.part,
      published: p.published,
      duration_s: ep?.duration_s ?? null,
      link: ep?.link ?? null,
    };
  });
  const guests = tags.guests.length
    ? tags.guests
    : [
        ...new Set(
          story.parts.flatMap((p) =>
            guestsFromDescription(episodes.get(p.guid)?.description ?? ''),
          ),
        ),
      ];
  // Period filters use the covered years (docs/TAXONOMY.md); regional eras also need the place.
  const span = tags.time?.covered_span;
  const place = {
    countries: [...tags.regions.origin, ...tags.regions.setting],
    polities: tags.regions.polities,
  };
  const { continents, subregions } = regionsOf([...tags.regions.origin, ...tags.regions.setting]);
  const taxonomy = loadTaxonomy();
  return {
    id: story.id,
    title: story.subject_title,
    format: tags.format,
    first_published: story.first_published,
    parts,
    total_duration_s: parts.reduce((sum, p) => sum + (p.duration_s ?? 0), 0),
    guests,
    summary: tags.summary,
    subjects: tags.subjects,
    roles: tags.roles,
    themes: tags.themes,
    regions: tags.regions,
    time: tags.time,
    content_warnings: tags.content_warnings,
    keywords: tags.keywords,
    review: reviewed
      ? { status: 'reviewed', date: reviewed.date }
      : { status: 'unreviewed', date: null },
    derived: {
      centuries: span ? centuriesOf(span, now) : [],
      eras: span ? erasOf(span, taxonomy.eras, now, place) : [],
      continents,
      subregions,
    },
  };
}

export function buildCatalog(now = new Date()): { catalog: Catalog; failed: string[] } {
  const taxonomy = loadTaxonomy();
  const stories = loadStories().filter((s) => s.kind === 'episode');
  const episodes = new Map(loadEpisodes().map((e) => [e.guid, e]));
  const validate = makeValidator({
    taxonomy,
    episodeStoryIds: new Set(stories.map((s) => s.id)),
    releaseYears: releaseYearsOf(stories),
  });

  const reviews: ReviewStatusFile = existsSync(REVIEW_STATUS_FILE)
    ? ReviewStatusFileSchema.parse(readJson(REVIEW_STATUS_FILE))
    : {};

  const out: CatalogStory[] = [];
  const failed: string[] = [];
  for (const story of stories) {
    const tagFile = join(TAGS_DIR, `${story.id}.json`);
    if (!existsSync(tagFile)) continue;
    const overrideFile = join(OVERRIDES_DIR, `${story.id}.json`);
    const merged = existsSync(overrideFile)
      ? deepMerge(readJson(tagFile), readJson(overrideFile))
      : readJson(tagFile);
    const { record, errors } = validate(merged, story.id);
    if (!record) {
      failed.push(`${story.id}: ${errors.join('; ')}`);
      continue;
    }
    out.push(toCatalogStory(story, record, episodes, now.getFullYear(), reviews[story.id]));
  }

  const used = new Set(out.flatMap((s) => [...s.regions.origin, ...s.regions.setting]));
  const countries: Country[] = [...used]
    .map((code) => countryInfo(code))
    .filter((c): c is Country => c !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  const catalog = CatalogSchema.parse({
    schema: CATALOG_SCHEMA,
    generated_at: now.toISOString(),
    taxonomy_version: taxonomy.version,
    vocab: {
      formats: taxonomy.formats.map(term),
      roles: taxonomy.roles.map(term),
      themes: taxonomy.themes.map(term),
      polities: taxonomy.polities.map((p) => ({
        id: p.id,
        label: p.label,
        definition: `${p.label} (${p.start} to ${p.end})`,
      })),
      content_warnings: taxonomy.contentWarnings.map(term),
      subject_kinds: taxonomy.subjectKinds.map(term),
      org_types: taxonomy.orgTypes.map(term),
    },
    eras: taxonomy.eras,
    countries,
    stories: out,
  });
  return { catalog, failed };
}

function main(): void {
  const { catalog, failed } = buildCatalog();
  if (failed.length) {
    console.error(
      `build:catalog: ${failed.length} tag record(s) are invalid; fix them or run npm run tags:validate:`,
    );
    for (const f of failed) console.error(`  ${f}`);
    process.exit(1);
  }
  mkdirSync(dirname(CATALOG_FILE), { recursive: true });
  writeFileSync(CATALOG_FILE, `${JSON.stringify(catalog)}\n`);
  const total = loadStories().filter((s) => s.kind === 'episode').length;
  console.log(
    `build:catalog: ${catalog.stories.length} of ${total} stories tagged -> ${CATALOG_FILE}`,
  );
}

if (import.meta.main) main();
