/**
 * Export tag records for the review page (tagging/review/review.html).
 *
 *   node pipeline/review-export.ts --dir tagging/examples --batch gold --label "Gold set" \
 *     [--flags tagging/review/flags-gold.json] [--compare tagging/examples]
 *
 * Writes data/review/<batch>.json: { vocab, records: [{ id, data }] }, where each
 * record doc carries the title, part links, the tag record, derived periods,
 * reviewer flags and (with --compare) the gold record for side-by-side review.
 * The documents are written to the review page's store by Claude (ArtifactData).
 * No transcript text is included.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { centuriesOf, countryInfo, erasOf } from '../shared/derive.ts';
import type { StoryTags } from '../shared/schemas/story-tags.ts';
import { loadEpisodes, loadStories, readJson } from './lib/io.ts';
import { DATA_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const dirArg = arg('dir');
  const batch = arg('batch');
  if (!dirArg || !batch)
    throw new Error(
      'usage: review-export.ts --dir <dir> --batch <id> [--label <text>] [--flags <file>] [--compare <dir>]',
    );
  const dir = resolve(dirArg);
  const label = arg('label') ?? batch;
  const flagsArg = arg('flags');
  const flags: Record<string, string[]> = flagsArg
    ? (readJson(resolve(flagsArg)) as Record<string, string[]>)
    : {};
  const compareArg = arg('compare');
  const compareDir = compareArg ? resolve(compareArg) : undefined;

  const taxonomy = loadTaxonomy();
  const stories = new Map(loadStories().map((s) => [s.id, s]));
  const episodes = new Map(loadEpisodes().map((e) => [e.guid, e]));

  const labels: Record<string, string> = {};
  for (const t of [
    ...taxonomy.formats,
    ...taxonomy.roles,
    ...taxonomy.themes,
    ...taxonomy.contentWarnings,
    ...taxonomy.polities,
    ...taxonomy.eras,
  ]) {
    labels[t.id] = t.label;
  }
  const countries: Record<string, string> = {};

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const records = files.map((file, order) => {
    const record = readJson(join(dir, file)) as StoryTags;
    const story = stories.get(record.story_id);
    if (!story) throw new Error(`${file}: unknown story ${record.story_id}`);
    for (const code of [...record.regions.origin, ...record.regions.setting]) {
      countries[code] = countryInfo(code)?.name ?? code;
    }
    const span = record.time?.main_span;
    const derived = span
      ? { centuries: centuriesOf(span), eras: erasOf(span, taxonomy.eras) }
      : { centuries: [], eras: [] };
    const compareFile = compareDir ? join(compareDir, file) : undefined;
    const compare =
      compareFile && existsSync(compareFile) ? (readJson(compareFile) as StoryTags) : undefined;
    return {
      id: record.story_id,
      data: {
        batch,
        batch_label: label,
        order,
        title: story.subject_title,
        parts: story.parts.map((p) => ({
          part: p.part,
          title: p.title,
          link: episodes.get(p.guid)?.link ?? null,
        })),
        record: { ...record, _derived: derived },
        ...(compare ? { compare } : {}),
        flags: flags[record.story_id] ?? [],
      },
    };
  });

  const out = join(DATA_DIR, 'review', `${batch}.json`);
  mkdirSync(join(DATA_DIR, 'review'), { recursive: true });
  writeFileSync(out, `${JSON.stringify({ vocab: { labels, countries }, records }, null, 2)}\n`);
  console.log(`review-export: ${records.length} record(s) -> ${out}`);
}

main();
